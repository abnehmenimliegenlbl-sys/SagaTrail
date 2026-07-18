const { withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const HOOK = `
# Fix XCRemoteSwiftPackageReference compatibility with Xcode 26
# Xcode 26 removed _setSavedArchiveVersion; CocoaPods still writes it.
# This post_install hook strips the key so Xcode 26 can open Pods.xcodeproj.
post_install do |installer|
  pbxproj = installer.pods_project.path.to_s + "/project.pbxproj"
  if File.exist?(pbxproj)
    src = File.read(pbxproj)
    patched = src.gsub(/[ \\t]*savedArchiveVersion = \\d+;\\n/, "")
    File.write(pbxproj, patched) if patched != src
  end
end
`;

module.exports = function withPodfileXcode26Fix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      const content = fs.readFileSync(podfilePath, "utf8");
      if (!content.includes("savedArchiveVersion = ")) {
        fs.writeFileSync(podfilePath, content + HOOK);
      }
      return config;
    },
  ]);
};
