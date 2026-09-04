const { withAppDelegate } = require("expo/config-plugins");

const IMPORTS = `import ReactAppDependencyProvider
import ARKit
import ObjectiveC`;

const GUARD = `
// iOS 26.6 can abort inside ARImageSensor while configuring its private
// AVCapturePhotoOutput if ARKit starts with ViroKit's preferred video format.
// The exception is raised below JavaScript and cannot be caught by React Native.
//
// Intercept ARSession immediately before it starts and select a format that
// ARKit itself reports as supported. This keeps Viro enabled while avoiding
// guessed AVCapture dimensions and a second, unrelated camera session.
private enum SagaTrailARVideoFormatGuard {
  static func install() {
    guard ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26 else {
      return
    }
    _ = installOnce
  }

  private static let installOnce: Void = {
    let originalSelector = #selector(ARSession.run(_:options:))
    let guardedSelector = #selector(ARSession.sagatrailRun(_:options:))

    guard
      let originalMethod = class_getInstanceMethod(ARSession.self, originalSelector),
      let guardedMethod = class_getInstanceMethod(ARSession.self, guardedSelector)
    else {
      NSLog("[SagaTrail AR] Could not install the iOS 26 video-format guard")
      return
    }

    method_exchangeImplementations(originalMethod, guardedMethod)
    NSLog("[SagaTrail AR] Installed the iOS 26 video-format guard")
  }()

  static func apply(to configuration: ARConfiguration) {
    guard let worldConfiguration = configuration as? ARWorldTrackingConfiguration else {
      return
    }

    let supportedFormats = ARWorldTrackingConfiguration.supportedVideoFormats
    guard !supportedFormats.isEmpty else {
      NSLog("[SagaTrail AR] ARKit reported no supported video formats")
      return
    }

    let formatsAtThirtyFpsOrLess = supportedFormats.filter {
      $0.framesPerSecond <= 30
    }
    let candidates = formatsAtThirtyFpsOrLess.isEmpty
      ? supportedFormats
      : formatsAtThirtyFpsOrLess

    guard let safeFormat = candidates.min(by: { lhs, rhs in
      let lhsPixels = lhs.imageResolution.width * lhs.imageResolution.height
      let rhsPixels = rhs.imageResolution.width * rhs.imageResolution.height
      if lhsPixels == rhsPixels {
        return lhs.framesPerSecond < rhs.framesPerSecond
      }
      return lhsPixels < rhsPixels
    }) else {
      return
    }

    worldConfiguration.videoFormat = safeFormat
    NSLog(
      "[SagaTrail AR] Selected supported format %.0fx%.0f @ %ld FPS",
      safeFormat.imageResolution.width,
      safeFormat.imageResolution.height,
      safeFormat.framesPerSecond
    )
  }
}

private extension ARSession {
  @objc dynamic func sagatrailRun(
    _ configuration: ARConfiguration,
    options: ARSession.RunOptions
  ) {
    SagaTrailARVideoFormatGuard.apply(to: configuration)

    // Implementations are exchanged at launch. This calls ARSession's original
    // run(_:options:) implementation rather than recursing.
    sagatrailRun(configuration, options: options)
  }
}
`;

module.exports = function withViroIOS26VideoFormatFix(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error(
        "withViroIOS26VideoFormatFix requires a Swift AppDelegate"
      );
    }

    let contents = config.modResults.contents;
    if (contents.includes("private enum SagaTrailARVideoFormatGuard")) {
      return config;
    }

    if (!contents.includes("import ReactAppDependencyProvider")) {
      throw new Error(
        "withViroIOS26VideoFormatFix could not find the AppDelegate import marker"
      );
    }
    contents = contents.replace("import ReactAppDependencyProvider", IMPORTS);

    if (!contents.includes("@UIApplicationMain")) {
      throw new Error(
        "withViroIOS26VideoFormatFix could not find @UIApplicationMain"
      );
    }
    contents = contents.replace("@UIApplicationMain", `${GUARD}\n@UIApplicationMain`);

    const launchMarker = `  ) -> Bool {
    let delegate = ReactNativeDelegate()`;
    if (!contents.includes(launchMarker)) {
      throw new Error(
        "withViroIOS26VideoFormatFix could not find didFinishLaunchingWithOptions"
      );
    }
    contents = contents.replace(
      launchMarker,
      `  ) -> Bool {
    SagaTrailARVideoFormatGuard.install()

    let delegate = ReactNativeDelegate()`
    );

    config.modResults.contents = contents;
    return config;
  });
};