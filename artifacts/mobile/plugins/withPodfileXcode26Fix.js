const { withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── Podfile prelude (inserted at the very top of the Podfile) ───────────────
// ROOT CAUSE of the Xcode 26 "The project 'Pods' is damaged" failure:
//
// React Native's SPMManager (scripts/cocoapods/spm.rb, pulled in by Clerk's
// spm_dependency) creates XCRemoteSwiftPackageReference /
// XCSwiftPackageProductDependency objects during post_install via
// \`project.new(klass)\`. The UUID allocator can hand out a UUID that is
// ALREADY TAKEN — in the worst case the PBXProject root object's UUID.
// The new SPM object then replaces PBXProject in objects_by_uuid, and the
// saved Pods.xcodeproj is structurally corrupted. Xcode 26 fails to load it:
//   -[XCRemoteSwiftPackageReference _setSavedArchiveVersion:]
//     unrecognized selector … "The project 'Pods' is damaged"
// → no pod target ever builds → "module map not found" / "no such module".
//
// The bug is probabilistic on pod count (one added/removed pod flips it),
// which is why builds "suddenly" broke without any app change.
// Fix verified in maplibre/maplibre-react-native#1499: never hand out a UUID
// that already exists in objects_by_uuid.
const PODFILE_PRELUDE = `# === SagaTrail Xcode 26 fix: UUID collision guard (see plugins/withPodfileXcode26Fix.js) ===
require 'xcodeproj'
require 'securerandom'
$sagatrail_make_uuid_guard = lambda do
  Module.new do
    def generate_uuid
      uuid = super
      tries = 0
      while objects_by_uuid.key?(uuid) && tries < 100000
        uuid = SecureRandom.hex(12).upcase
        tries += 1
      end
      uuid
    end
  end
end
Xcodeproj::Project.prepend($sagatrail_make_uuid_guard.call)
Pod::Project.prepend($sagatrail_make_uuid_guard.call) if defined?(Pod::Project)
# === End SagaTrail UUID collision guard ===

`;

// Re-applied right before react_native_post_install: by then Pod::Project is
// guaranteed to be defined (it may not be while the Podfile itself loads),
// and a subclass override of generate_uuid would otherwise bypass the guard.
const GUARD_BEFORE_RN_POST_INSTALL = `# SagaTrail: ensure UUID guard also covers Pod::Project's own allocator
    Pod::Project.prepend($sagatrail_make_uuid_guard.call) if defined?(Pod::Project)
    `;

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
  end

  # Fix 3: Integrity check — fail pod install EARLY (with a clear message)
  # if the PBXProject root object was overwritten by a UUID collision.
  # Without this, the corruption only surfaces minutes later as a cryptic
  # "module map file not found" / "no such module 'Expo'" archive failure.
  _root = installer.pods_project.root_object
  _reg = installer.pods_project.objects_by_uuid[_root.uuid]
  if _reg.equal?(_root)
    Pod::UI.puts "[SagaTrail] OK: PBXProject root object intact (#{_root.uuid})"
  else
    raise "[SagaTrail] FATAL: Pods.xcodeproj root object #{_root.uuid} was overwritten by #{_reg ? _reg.isa : 'nil'} (UUID collision). Aborting before a doomed xcodebuild run."
  end
  installer.pods_project.save`;

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

      // 1) UUID collision guard at the very top of the Podfile
      if (!content.includes("sagatrail_make_uuid_guard")) {
        content = PODFILE_PRELUDE + content;
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

      content =
        content.slice(0, markerIdx) +
        GUARD_BEFORE_RN_POST_INSTALL +
        content.slice(markerIdx, closeIdx + 1) +
        "\n" +
        PODFILE_FIX +
        content.slice(closeIdx + 1);
      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
}

// ─── Compose and export ───────────────────────────────────────────────────────
module.exports = function withPodfileXcode26Fix(config) {
  return withPodfilePatched(config);
};
