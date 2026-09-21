internal import Expo
import React
import ReactAppDependencyProvider
import ARKit
import ObjectiveC

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

@UIApplicationMain
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    SagaTrailARVideoFormatGuard.install()
    // Activate the phone half at process launch so queued Watch safety/SOS
    // commands can be received before the React Native hike screen mounts.
    SagaTrailPhoneWatchConnection.shared.activate()

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    let garminHandled = SagaTrailGarminConnection.shared.handle(url)
    return garminHandled || super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
