import SwiftUI
import WatchKit

@main
struct SagaTrailWatchApp: App {
  @StateObject private var hike = WatchHikeModel()

  var body: some Scene {
    WindowGroup {
      WatchHikeView()
        .environmentObject(hike)
        .task {
          // WKExtension is safe to access once the SwiftUI scene is active.
          WKExtension.shared().isFrontmostTimeoutExtended = true
          hike.activate()
        }
    }
  }
}