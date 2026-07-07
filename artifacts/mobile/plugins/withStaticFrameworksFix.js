// Expo Config Plugin: withStaticFrameworksFix
//
// Expo 54 + Clerk iOS SDK conflict:
// - Clerk requires `use_frameworks! :linkage => :dynamic` (via expo-build-properties)
// - With prebuilt RN Core (RCT_USE_PREBUILT_RNCORE=1, the EAS default for Expo 54),
//   expo-modules-autolinking's installer.rb overrides
//   `Pod::Installer#run_podfile_pre_install_hooks` to downgrade ExpoModulesCore,
//   Expo, ReactAppDependencyProvider and expo-dev-menu from static_framework to
//   static_library AFTER all Podfile pre_install blocks have run.
//   A static_library inside a use_frameworks! :linkage => :dynamic project is
//   what CocoaPods rejects with:
//     "The 'Pods-SagaTrail' target has transitive dependencies that include
//      statically linked binaries: (ExpoModulesCore)"
//
// Root cause (from installer.rb line 111-131):
//   define_method(:run_podfile_pre_install_hooks) do
//     _original_run_podfile_pre_install_hooks.bind(self).()  # runs ALL pre_install blocks
//     ...
//     # THEN downgrades to static_library — after every pre_install hook
//     def t.build_type; Pod::BuildType.static_library; end
//   end
//
// Fix: Override run_podfile_pre_install_hooks AGAIN (our injection runs after
// installer.rb is required, so we capture Expo's version as our "original") and
// add a final step that upgrades the affected pods from static_library to
// static_framework. A static_framework is statically linked but framework-shaped,
// which CocoaPods allows alongside use_frameworks! :linkage => :dynamic.
//
// This injection must be evaluated AFTER use_expo_modules! (which triggers the
// require of installer.rb) and AFTER any pre_install blocks — i.e. at the end
// of the generated Podfile. The withDangerousMod callback runs after the
// Podfile is written by Expo's own prebuild, so we append to the end.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER_BEGIN = "# @generated begin static-frameworks-fix";
const MARKER_END = "# @generated end static-frameworks-fix";

const STATIC_PODS = [
  "ExpoModulesCore",
  "Expo",
  "ReactAppDependencyProvider",
  "expo-dev-menu",
];

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

      // Ruby injection: override Pod::Installer#run_podfile_pre_install_hooks
      // to add a post-Expo step that upgrades the affected pods from
      // static_library back to static_framework.
      //
      // By the time this Podfile code is evaluated, installer.rb has already
      // been required (by use_expo_modules! inside the target block). So
      // instance_method(:run_podfile_pre_install_hooks) captures Expo's
      // override, and our define_method replaces it — then our version calls
      // Expo's version first (which itself calls CocoaPods' original + applies
      // the static_library downgrade), and afterwards overrides back to
      // static_framework.
      const podNames = JSON.stringify(STATIC_PODS);
      const snippet = `${MARKER_BEGIN}
module Pod
  class Installer
    _expo_run_pre_install = instance_method(:run_podfile_pre_install_hooks)
    define_method(:run_podfile_pre_install_hooks) do
      _expo_run_pre_install.bind(self).call
      # Re-apply static_framework after Expo downgrades to static_library.
      # static_framework is compatible with use_frameworks! :linkage => :dynamic;
      # static_library is not.
      pod_names = ${podNames}
      self.pod_targets.each do |t|
        next unless pod_names.include?(t.name)
        def t.build_type
          Pod::BuildType.static_framework
        end
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
