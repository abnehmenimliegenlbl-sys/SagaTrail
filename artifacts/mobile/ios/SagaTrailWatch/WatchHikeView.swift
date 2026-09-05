import SwiftUI

struct WatchHikeView: View {
  @EnvironmentObject private var hike: WatchHikeModel

  var body: some View {
    ScrollView {
      VStack(spacing: 9) {
        connectionBanner
        if let state = hike.state {
          Image(systemName: arrow(for: state.navigationDirection))
            .font(.system(size: 44, weight: .bold))
            .rotationEffect(.degrees(state.bearingDegrees ?? 0))
            .foregroundStyle(.tint)
          Text(state.distanceToTurnMeters.map { "\($0, specifier: "%.0f") m" } ?? "—")
            .font(.title2.monospacedDigit()).bold()
          Text(state.nextInstruction).font(.footnote).multilineTextAlignment(.center)
          Divider()
          metric("Zeit", duration(state.elapsedSeconds))
          metric("Distanz", String(format: "%.2f km", state.distanceMeters / 1000))
          metric("Aufstieg", String(format: "%.0f m", state.ascentMeters))
          metric("Schritte", "\(state.steps)")
          heartRate(state)
          Button(role: .destructive, action: hike.requestSOSConfirmation) {
            Label("SOS", systemImage: "exclamationmark.triangle.fill")
          }.buttonStyle(.borderedProminent)
        } else {
          Image(systemName: "iphone.slash").font(.largeTitle)
          Text("Warte auf dein iPhone").multilineTextAlignment(.center)
        }
      }.padding(.horizontal, 4)
    }
    .alert("SOS an iPhone senden?", isPresented: $hike.showSOSConfirmation) {
      Button("Abbrechen", role: .cancel) {}
      Button("SOS bestätigen", role: .destructive, action: hike.confirmSOS)
    } message: {
      Text("Dein iPhone startet den Notfallablauf. Keine Position wird auf der Watch angezeigt.")
    }
    .alert(item: $hike.activeAlert) { alert in
      Alert(title: Text(alert.title), message: Text(alert.body), dismissButton: .default(Text("OK")))
    }
  }

  private var connectionBanner: some View {
    Text(!hike.isReachable ? "iPhone nicht erreichbar" : hike.isStale ? "Daten veraltet" : "Live vom iPhone")
      .font(.caption2).foregroundStyle((!hike.isReachable || hike.isStale) ? .orange : .green)
  }
  private func metric(_ label: String, _ value: String) -> some View {
    HStack { Text(label); Spacer(); Text(value).monospacedDigit() }.font(.footnote)
  }
  private func heartRate(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let bpm = hike.currentHeartRate ?? state.heartRateBpm
    return Button { hike.startHeartRate() } label: {
      HStack { Label("Puls", systemImage: "heart.fill"); Spacer(); Text(bpm.map { "\($0, specifier: "%.0f")" } ?? "Start") }
    }.font(.footnote).tint(.red)
  }
  private func duration(_ seconds: Double) -> String {
    String(format: "%02d:%02d:%02d", Int(seconds) / 3600, (Int(seconds) / 60) % 60, Int(seconds) % 60)
  }
  private func arrow(for direction: String) -> String {
    ["left": "arrow.turn.up.left", "right": "arrow.turn.up.right", "uturn": "arrow.uturn.up"].contains(where: { direction.lowercased().contains($0.replacingOccurrences(of: "arrow.", with: "").replacingOccurrences(of: ".", with: "")) }) ? "arrow.up" :
      (direction.lowercased().contains("left") ? "arrow.turn.up.left" : direction.lowercased().contains("right") ? "arrow.turn.up.right" : "arrow.up")
  }
}