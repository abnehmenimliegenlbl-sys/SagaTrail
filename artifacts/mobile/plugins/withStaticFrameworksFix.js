// Expo Config Plugin: withStaticFrameworksFix
//
// Expo 54 + Clerk iOS SDK Konflikt:
// - Clerk erfordert `use_frameworks! :linkage => :dynamic` (via expo-build-properties)
// - Mit prebuilt RN Core (RCT_USE_PREBUILT_RNCORE=1, EAS-Default fuer Expo 54)
//   stuft expo-modules-autolinking (installer.rb) ExpoModulesCore, Expo,
//   ReactAppDependencyProvider und expo-dev-menu zwingend auf static_library
//   herab (run_podfile_pre_install_hooks-Monkey-Patch, laeuft NACH allen
//   Podfile-Hooks — nicht ueberschreibbar per pre_install).
// - CocoaPods' TargetValidator (verify_no_static_framework_transitive_dependencies)
//   lehnt JEDES statische Target ab, von dem ein dynamisches Pod abhaengt:
//     static_deps = dynamic_pod_targets.flat_map(&:recursive_dependent_targets)
//                     .uniq.select(&:build_as_static?)
//   => auch static_framework schlaegt fehl. Ein nachtraegliches "Upgrade" der
//   herabgestuften Pods kann diese Validierung prinzipiell nie bestehen.
//
// Einzige saubere Loesung: Expos Downgrade gar nicht ausloesen.
// installer.rb prueft: should_disable_use_frameworks_for_core_expo_pods?
//   return false if ENV['RCT_USE_PREBUILT_RNCORE'] != '1'
// => RCT_USE_PREBUILT_RNCORE=0 setzen (React Native aus dem Quellcode bauen,
//    wie vor Expo 54 Standard). Dann bleibt alles dynamisch verlinkt, die
//    CocoaPods-Validierung besteht, und Clerks SPM-Abhaengigkeit funktioniert.
//    Kosten: laengere native Buildzeit (RN wird kompiliert statt als Tarball
//    geladen) — aber ein funktionierender Build.
//
// Die ENV-Zuweisung muss VOR use_react_native!/use_expo_modules! ausgewertet
// werden, deshalb wird sie an den ANFANG der generierten Podfile gestellt.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

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
# React Native aus dem Quellcode bauen statt prebuilt Core zu verwenden.
# Verhindert, dass expo-modules-autolinking ExpoModulesCore & Co. auf
# static_library herabstuft — was mit use_frameworks! :linkage => :dynamic
# (Clerk-Anforderung) von CocoaPods' TargetValidator abgelehnt wuerde.
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
${MARKER_END}
`;

      contents = `${snippet}\n${contents}`;
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withStaticFrameworksFix;
