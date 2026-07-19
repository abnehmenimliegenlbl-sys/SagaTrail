const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── Podfile fix (injected inside existing post_install) ─────────────────────
// CocoaPods does NOT support multiple post_install blocks.
const PODFILE_FIX = `
  # === Xcode 16/26 Post-install Fixes ===

  # Fix 1: Remove savedArchiveVersion from Pods.xcodeproj
  #
  # The selector _setSavedArchiveVersion: does not exist in Xcode 16/26 runtime.
  # When Xcode tries to deserialize XCRemoteSwiftPackageReference objects that have
  # this attribute, it throws an unrecognized-selector exception → Pods.xcodeproj
  # fails to load → pod targets never compile → module maps never exist → build fails.
  #
  # WHY file-write alone fails: react_native_post_install() calls
  # installer.pods_project.save() internally, which overwrites any direct file patch
  # with the in-memory state (which still contains savedArchiveVersion).
  #
  # FIX: first clear the attribute on the in-memory objects (so all future save()
  # calls write clean data), then save explicitly, then belt-and-suspenders file patch.
  begin
    installer.pods_project.objects.each do |obj|
      next unless obj.class.to_s.include?('RemoteSwiftPackageReference')
      obj.saved_archive_version = nil if obj.respond_to?(:saved_archive_version=)
    end
    Pod::UI.puts "[Fix1] Cleared savedArchiveVersion from in-memory package references"
  rescue => e
    Pod::UI.warn "[Fix1] In-memory removal error (continuing): #{e.message}"
  end

  # Save in-memory → disk (clean state, no savedArchiveVersion)
  installer.pods_project.save

  # Belt-and-suspenders: regex patch over the saved file
  _pbxproj = installer.pods_project.path.to_s + "/project.pbxproj"
  if File.exist?(_pbxproj)
    _content = File.read(_pbxproj)
    _patched = _content.gsub(/[^\\S\\r\\n]*savedArchiveVersion[^\\S\\r\\n]*=[^\\S\\r\\n]*\\d+[^\\S\\r\\n]*;[^\\r\\n]*\\r?\\n/, "")
    if _patched != _content
      File.write(_pbxproj, _patched)
      Pod::UI.puts "[Fix1] File-patched savedArchiveVersion out of Pods.xcodeproj"
    end
  end

  # Fix 2: BUILD_LIBRARY_FOR_DISTRIBUTION = NO for pod targets.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
    end
  end`;

// ─── Run Script body ─────────────────────────────────────────────────────────
// This script runs BEFORE "Compile Sources" in the SagaTrail (main) target.
//
// Root cause of the archive build error:
//   Xcode 16+ uses per-target archive intermediates:
//     ArchiveIntermediates/Expo/BuildProductsPath/Release-iphoneos/Expo/Expo.modulemap
//   But PODS_CONFIGURATION_BUILD_DIR (= main-target BUILD_DIR + /Release-iphoneos)
//   resolves to:
//     ArchiveIntermediates/SagaTrail/BuildProductsPath/Release-iphoneos/Expo/Expo.modulemap
//   which does NOT exist → "module map file not found".
//
// Fix: copy every *.modulemap from every pod's ArchiveIntermediates directory
// into the main target's BUILT_PRODUCTS_DIR so the compiler finds them.
const COPY_MODULE_MAPS_SCRIPT = [
  "# Fix for Xcode 16/26 archive-build module map path issue.",
  "# See withPodfileXcode26Fix.js for the explanation.",
  "set +e",
  'PODS_ARCHIVES="${OBJROOT}/ArchiveIntermediates"',
  'DEST="${BUILT_PRODUCTS_DIR}"',
  'if [ -d "${PODS_ARCHIVES}" ]; then',
  '  find "${PODS_ARCHIVES}" -maxdepth 5 -name "*.modulemap" | while IFS= read -r f; do',
  '    DIR=$(dirname "$f")',
  '    NAME=$(basename "$DIR")',
  '    DESTDIR="${DEST}/${NAME}"',
  '    mkdir -p "${DESTDIR}"',
  '    cp -f "$f" "${DESTDIR}/" 2>/dev/null || true',
  "  done",
  "fi",
  "set -e",
].join("\n");

// ─── Podfile plugin ───────────────────────────────────────────────────────────
function withPodfilePatched(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let content = fs.readFileSync(podfilePath, "utf8");

      // Idempotent guard
      if (content.includes("pbxproj = installer.pods_project.path")) {
        return config;
      }

      const marker = "react_native_post_install(";
      const markerIdx = content.indexOf(marker);
      if (markerIdx === -1) {
        console.warn("[withPodfileXcode26Fix] react_native_post_install not found — skipping");
        return config;
      }

      // Find the closing `)` of react_native_post_install(...)
      let depth = 0;
      let closeIdx = -1;
      for (let i = markerIdx + marker.length - 1; i < content.length; i++) {
        if (content[i] === "(") depth++;
        else if (content[i] === ")") {
          depth--;
          if (depth === 0) { closeIdx = i; break; }
        }
      }

      if (closeIdx === -1) {
        console.warn("[withPodfileXcode26Fix] Could not find closing ) — skipping");
        return config;
      }

      content = content.slice(0, closeIdx + 1) + "\n" + PODFILE_FIX + content.slice(closeIdx + 1);
      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
}

// ─── Xcode project plugin ─────────────────────────────────────────────────────
function withCopyModuleMapsScript(config) {
  return withXcodeProject(config, (config) => {
    const xcodeproj = config.modResults;

    // Idempotent check: look for our script in PBXShellScriptBuildPhase objects
    const objects = xcodeproj.hash.project.objects;
    const shellScripts = objects["PBXShellScriptBuildPhase"] || {};
    const alreadyAdded = Object.values(shellScripts).some(
      (p) => p && typeof p === "object" && (p.name || "").includes("CopyPodModuleMaps")
    );
    if (alreadyAdded) {
      return config;
    }

    // Find the SagaTrail native target UUID
    const nativeTargets = xcodeproj.pbxNativeTargetSection();
    let targetUuid = null;
    for (const key of Object.keys(nativeTargets)) {
      const t = nativeTargets[key];
      if (t && t.name && t.name.replace(/"/g, "") === "SagaTrail") {
        targetUuid = key;
        break;
      }
    }
    if (!targetUuid) {
      console.warn("[withPodfileXcode26Fix] SagaTrail native target not found — skipping run script");
      return config;
    }

    // Add the shell script build phase via the correct API
    const phaseName = "CopyPodModuleMaps";
    xcodeproj.addBuildPhase(
      [],
      "PBXShellScriptBuildPhase",
      phaseName,
      targetUuid,
      { shellScript: COPY_MODULE_MAPS_SCRIPT, shellPath: "/bin/sh" }
    );

    // Move the newly-added phase BEFORE "Compile Sources"
    const pbxTarget = objects["PBXNativeTarget"][targetUuid];
    const buildPhases = pbxTarget.buildPhases;

    // Find the phase we just added (last one with our name comment)
    const newPhaseIdx = buildPhases.map((p) => p.comment || "").lastIndexOf(phaseName);
    if (newPhaseIdx <= 0) return config; // already at top or not found

    // Find "Compile Sources" phase index
    const sourcesIdx = buildPhases.findIndex(
      (p) => (p.comment || "").includes("Sources")
    );
    if (sourcesIdx === -1 || newPhaseIdx <= sourcesIdx) return config;

    // Move: remove from current position and insert before Sources
    const [phaseRef] = buildPhases.splice(newPhaseIdx, 1);
    const insertAt = buildPhases.findIndex((p) => (p.comment || "").includes("Sources"));
    buildPhases.splice(insertAt, 0, phaseRef);

    return config;
  });
}

// ─── Compose and export ───────────────────────────────────────────────────────
module.exports = function withPodfileXcode26Fix(config) {
  config = withPodfilePatched(config);
  config = withCopyModuleMapsScript(config);
  return config;
};
