import SwiftUI

@main
struct SagaTrailWatchApp: App {
  @StateObject private var hike = WatchHikeModel()

  var body: some Scene {
    WindowGroup {
      WatchHikeView()
        .environmentObject(hike)
        .task { hike.activate() }
    }
  }
}