import SwiftUI
import WatchKit

@main
struct SagaTrailWatchApp: App {
  @StateObject private var hike = WatchHikeModel()

  init() {
    // Keep SagaTrail frontmost while the hike state and workout session start.
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