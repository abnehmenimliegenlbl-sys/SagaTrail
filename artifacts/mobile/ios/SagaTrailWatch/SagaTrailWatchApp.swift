import SwiftUI

@main
struct SagaTrailWatchApp: App {
  @StateObject private var hike = WatchHikeModel()
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      WatchHikeView()
        .environmentObject(hike)
        .task {
          hike.setSceneActive(scenePhase == .active)
          hike.activate()
        }
        .onChange(of: scenePhase) { _, newPhase in
          hike.setSceneActive(newPhase == .active)
        }
    }
  }
}