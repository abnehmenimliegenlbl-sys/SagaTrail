import SwiftUI
import WatchKit

@main
struct SagaTrailWatchApp: App {
  @StateObject private var hike = WatchHikeModel()

  init() {
    // Keep the hike screen in the foreground for the extended watchOS timeout.
    // watchOS still controls the display and may dim it, but it will not
    // immediately return to the watch face after the user lowers their wrist.
    WKExtension.shared().isFrontmostTimeoutExtended = true
  }

  var body: some Scene {
    WindowGroup {
      WatchHikeView()
        .environmentObject(hike)
        .task { hike.activate() }
    }
  }
}