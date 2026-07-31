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

const { withAppBuildGradle } = require("expo/config-plugins");

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
  return withAppBuildGradle(config, (config) => {
    // Idempotent guard: skip if already applied
    if (config.modResults.contents.includes("SagaTrail: duplicate META-INF packaging fix")) {
      return config;
    }
    config.modResults.contents += PACKAGING_BLOCK;
    return config;
  });
};
