// Expo Config Plugin: withStaticFrameworksFix
//
// Expo hardcodes a handful of "core" modules to always build as static
// libraries (never as dynamic frameworks), even when the project as a whole
// uses `use_frameworks! :linkage => :dynamic` (required for Clerk's iOS SPM
// dependency, see expo-build-properties config in app.json). This mismatch
// makes CocoaPods refuse to install with:
//   "The 'Pods-<Target>' target has transitive dependencies that include
//    statically linked binaries: (ExpoModulesCore)"
//
// Expo's own disabling only downgrades them to a plain STATIC LIBRARY
// (".a"), which is exactly what CocoaPods' validation rejects when mixed
// into a dynamic-framework-linked aggregate target — a plain static
// library cannot be folded into a `use_frameworks! :linkage => :dynamic`
// dependency graph. A STATIC FRAMEWORK (".framework" bundle, still
// statically linked, but framework-shaped) CAN be folded in safely. The
// documented CocoaPods/React Native workaround is therefore to force those
// pods' `build_type` to `:static_framework` (not `:static_library`) via a
// `pre_install` hook. CocoaPods runs multiple `pre_install` blocks in Podfile
// registration order, and Expo's own disabling hook is registered by
// `use_expo_modules!` inside the `target` block — so our hook MUST be
// appended after the entire `target` block (end of file), not before it,
// or Expo's hook (registered later) runs after ours and silently reverts
// our override back to a plain static library.
//
// Since this project uses Expo's managed workflow (no committed `ios/`
// folder — the Podfile is regenerated on every prebuild/native build), this
// must be injected via a config plugin rather than hand-edited.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const STATIC_PODS = [
  "ExpoModulesCore",
  "Expo",
  "ReactAppDependencyProvider",
  "expo-dev-menu",
];

const MARKER_BEGIN = "# @generated begin static-frameworks-fix";
const MARKER_END = "# @generated end static-frameworks-fix";

function withStaticFrameworksFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (contents.includes(MARKER_BEGIN)) {
        return config;
      }

      const snippet = `${MARKER_BEGIN}
pre_install do |installer|
  static_pods = ${JSON.stringify(STATIC_PODS)}
  installer.pod_targets.each do |pod|
    if static_pods.include?(pod.name)
      def pod.build_type
        Pod::BuildType.static_framework
      end
    end
  end
end
${MARKER_END}

`;

      contents = `${contents.trimEnd()}\n\n${snippet}`;

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withStaticFrameworksFix;
