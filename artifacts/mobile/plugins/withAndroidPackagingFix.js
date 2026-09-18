/**
 * withAndroidPackagingFix.js
 *
 * PROBLEM:
 *   Gradle mergeReleaseJavaResource fails because two JARs ship the same path:
 *     META-INF/versions/9/OSGI-INF/MANIFEST.MF
 *       - org.jspecify:jspecify:1.0.0
 *       - com.squareup.okhttp3:logging-interceptor:5.4.0
 *
 * FIX:
 *   Append a second `android { packaging { ... } }` block at the end of
 *   android/app/build.gradle. Gradle merges multiple android {} blocks, so
 *   appending is safe and idempotent-guardable without fragile regex surgery.
 */

const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGING_BLOCK = `
// ── SagaTrail: duplicate META-INF packaging fix ──────────────────────────────
// Two transitive dependencies (jspecify + okhttp3-logging-interceptor) both
// ship META-INF/versions/9/OSGI-INF/MANIFEST.MF. Without this exclusion,
// :app:mergeReleaseJavaResource fails with "2 files found with path …".
android {
    packaging {
        resources {
            excludes += [
                "META-INF/versions/9/OSGI-INF/MANIFEST.MF",
                "META-INF/DEPENDENCIES",
            ]
        }
    }
}
// ── End SagaTrail packaging fix ───────────────────────────────────────────────
`;

module.exports = function withAndroidPackagingFix(config) {
  config = withAppBuildGradle(config, (config) => {
    // Idempotent guard: skip if already applied
    if (config.modResults.contents.includes("SagaTrail: duplicate META-INF packaging fix")) {
      return config;
    }
    config.modResults.contents += PACKAGING_BLOCK;
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const permissions = config.modResults.manifest["uses-permission"] ?? [];
    const storagePermission = permissions.find(
      (permission) =>
        permission.$?.["android:name"] ===
        "android.permission.WRITE_EXTERNAL_STORAGE",
    );

    if (storagePermission) {
      storagePermission.$["android:maxSdkVersion"] = "32";
      storagePermission.$["tools:replace"] = "android:maxSdkVersion";
    }

    return config;
  });

  return withDangerousMod(config, [
    "android",
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const mainManifestPath = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "AndroidManifest.xml",
      );
      const debugManifestPath = path.join(
        androidRoot,
        "app",
        "src",
        "debug",
        "AndroidManifest.xml",
      );

      const storagePermission =
        '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"/>';

      const patchManifest = (manifestPath, addIfMissing) => {
        if (!fs.existsSync(manifestPath)) {
          return;
        }

        let contents = fs.readFileSync(manifestPath, "utf8");
        const permissionPattern =
          /<uses-permission\s+android:name="android\.permission\.WRITE_EXTERNAL_STORAGE"[^>]*\/>/;

        if (permissionPattern.test(contents)) {
          contents = contents.replace(permissionPattern, storagePermission);
        } else if (addIfMissing) {
          contents = contents.replace(
            /(\s*<application\b)/,
            `\n    ${storagePermission}$1`,
          );
        }

        if (!contents.includes('xmlns:tools="http://schemas.android.com/tools"')) {
          contents = contents.replace(
            /<manifest\b/,
            '<manifest xmlns:tools="http://schemas.android.com/tools"',
          );
        }

        fs.writeFileSync(manifestPath, contents);
      };

      patchManifest(mainManifestPath, false);
      patchManifest(debugManifestPath, true);

      const mainApplicationPath = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "sagatrail2",
        "app",
        "MainApplication.kt",
      );

      if (fs.existsSync(mainApplicationPath)) {
        let contents = fs.readFileSync(mainApplicationPath, "utf8");
        if (contents.includes("import expo.modules.ReactNativeHostWrapper")) {
          contents = contents
            .replace(
              "import com.facebook.react.ReactNativeHost\n",
              "",
            )
            .replace(
              "import com.facebook.react.ReactPackage\n",
              "",
            )
            .replace(
              "import com.facebook.react.defaults.DefaultReactNativeHost\n",
              "",
            )
            .replace(
              "import expo.modules.ReactNativeHostWrapper",
              "import expo.modules.ExpoReactHostFactory",
            );

          const hostStart = contents.indexOf("  override val reactNativeHost");
          const onCreateStart = contents.indexOf(
            "  override fun onCreate",
            hostStart,
          );
          if (hostStart !== -1 && onCreateStart !== -1) {
            const hostBlock = `  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
        add(ReactViroPackage(ReactViroPackage.ViroPlatform.AR))
      },
    )
  }

`;
            contents =
              contents.slice(0, hostStart) +
              hostBlock +
              contents.slice(onCreateStart);
          }

          fs.writeFileSync(mainApplicationPath, contents);
        }
      }

      return config;
    },
  ]);
};
