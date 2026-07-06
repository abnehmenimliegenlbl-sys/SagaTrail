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
// The documented CocoaPods/React Native workaround is to force those pods'
// `build_type` to `:static_library` (a plain static library, not a
// "static framework") via a `pre_install` hook in the Podfile, so CocoaPods
// treats them consistently instead of trying to fold them into the dynamic
// framework graph.
//
// Since this project uses Expo's managed workflow (no committed `ios/`
// folder — the Podfile is regenerated on every prebuild/native build), this
// must be injected via a config plugin rather than hand-edited.
const { withDangerousMod } = require("@expo/config-plugins");
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
        Pod::BuildType.static_library
      end
    end
  end
end
${MARKER_END}

`;

      const targetMatch = contents.match(/^target\s+['"][^'"]+['"]\s+do/m);
      if (targetMatch) {
        const idx = contents.indexOf(targetMatch[0]);
        contents = contents.slice(0, idx) + snippet + contents.slice(idx);
      } else {
        contents += `\n${snippet}`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withStaticFrameworksFix;
