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
          if state.upcomingNavigations.count > 1 {
            VStack(alignment: .leading, spacing: 4) {
              Text("Danach").font(.caption2).foregroundStyle(.secondary)
              ForEach(Array(state.upcomingNavigations.dropFirst().enumerated()), id: \.offset) { _, hint in
                HStack(spacing: 6) {
                  Image(systemName: arrow(for: hint.direction))
                    .frame(width: 18)
                  Text(hint.distanceMeters.map { "\(Int($0)) m" } ?? "—")
                    .monospacedDigit()
                  Spacer()
                  Text(directionLabel(hint.direction))
                    .foregroundStyle(.secondary)
                }
                .font(.caption2)
              }
            }
            .padding(.top, 2)
          }
          Divider()
          metric("Zeit", duration(state.elapsedSeconds))
          metric("Distanz", String(format: "%.2f km", state.distanceMeters / 1000))
           if let remaining = state.remainingDistanceMeters {
             metric("Rest", String(format: "%.1f km", remaining / 1000))
           }
           if let remainingSeconds = state.remainingSeconds {
             metric("Ankunft", eta(remainingSeconds, arrivalAt: state.arrivalAtEpochMs))
           }
          metric("Aufstieg", String(format: "%.0f m", state.ascentMeters))
          metric("Schritte", "\(state.steps)")
          heartRate(state)
           Button {
             hike.sendHikeCommand(state.isHiking ? "pause" : (state.sessionStatus == "preparing" ? "start" : "resume"))
           } label: {
             Label(state.isHiking ? "Pause" : (state.sessionStatus == "preparing" ? "Start" : "Fortsetzen"),
                   systemImage: state.isHiking ? "pause.fill" : "play.fill")
           }.buttonStyle(.bordered)
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
  private func eta(_ seconds: Double, arrivalAt: Double?) -> String {
    if let arrivalAt {
      let date = Date(timeIntervalSince1970: arrivalAt / 1000)
      return date.formatted(date: .omitted, time: .shortened)
    }
    return duration(seconds)
  }
  private func arrow(for direction: String) -> String {
    let normalized = direction.lowercased()
    if normalized.contains("uturn") || normalized.contains("u-turn") {
      return "arrow.uturn.up"
    }
    if normalized.contains("left") {
      return "arrow.turn.up.left"
    }
    if normalized.contains("right") {
      return "arrow.turn.up.right"
    }
    return "arrow.up"
  }
  private func directionLabel(_ direction: String) -> String {
    direction.lowercased().contains("left") ? "Links" : "Rechts"
  }
}