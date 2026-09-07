import SwiftUI
import MapKit

struct WatchHikeView: View {
  @EnvironmentObject private var hike: WatchHikeModel

  var body: some View {
    ScrollView {
      VStack(spacing: 9) {
        connectionBanner
        if let state = hike.state {
          if let map = state.map {
            WatchRouteMap(map: map)
          }
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
          if let terrain = state.terrainSection {
            VStack(alignment: .leading, spacing: 3) {
              HStack {
                Label(terrain.direction == "up" ? "Anstieg" : "Gefälle",
                      systemImage: terrain.direction == "up" ? "arrow.up.right" : "arrow.down.right")
                Spacer()
                Text("\(Int(terrain.gradePercent)) %").monospacedDigit()
              }
              Text(
                terrain.startsInMeters > 0
                  ? "Beginnt in \(Int(terrain.startsInMeters)) m · \(Int(terrain.remainingMeters)) m"
                  : "Noch \(Int(terrain.remainingMeters)) m"
              )
              .foregroundStyle(.secondary)
            }
            .font(.caption2)
          }
          safetyCheckin(state)
          Divider()
          metric("Zeit", duration(state.elapsedSeconds))
          metric("Distanz", String(format: "%.2f km", state.distanceMeters / 1000))
           if let remaining = state.remainingDistanceMeters {
             metric("Rest", String(format: "%.1f km", remaining / 1000))
           }
           if let remainingSeconds = state.remainingSeconds {
             metric("Ankunft", eta(remainingSeconds, arrivalAt: state.arrivalAtEpochMs))
           }
           if let plannedAscent = state.plannedAscentMeters {
             metric("Höhenmeter", String(format: "%.0f m", plannedAscent))
           }
           if let remainingAscent = state.remainingAscentMeters {
             metric("Restanstieg", String(format: "%.0f m", remainingAscent))
           }
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
    .confirmationDialog("Sicherheits-Check-in", isPresented: $hike.showSafetyCheckinOptions) {
      Button("30 Minuten") { hike.sendSafetyCheckin(durationMinutes: 30) }
      Button("60 Minuten") { hike.sendSafetyCheckin(durationMinutes: 60) }
      Button("120 Minuten") { hike.sendSafetyCheckin(durationMinutes: 120) }
      Button("Abbrechen", role: .cancel) {}
    } message: {
      Text("Das iPhone startet den bestehenden Sicherheitslink. Die Watch überträgt keine Position.")
    }
    .alert(item: $hike.activeAlert) { alert in
      Alert(title: Text(alert.title), message: Text(alert.body), dismissButton: .default(Text("OK")))
    }
  }

  private var connectionBanner: some View {
    HStack(spacing: 5) {
      Text(!hike.isReachable ? "iPhone nicht erreichbar" : hike.isStale ? "Daten veraltet" : "Live vom iPhone")
      Spacer()
      if let battery = hike.batteryLevel {
        Image(systemName: batteryIcon(for: battery, charging: hike.isCharging))
        Text("\(Int((battery * 100).rounded())) %").monospacedDigit()
      }
    }
    .font(.caption2)
    .foregroundStyle((!hike.isReachable || hike.isStale) ? .orange : .green)
  }
  private func metric(_ label: String, _ value: String) -> some View {
    HStack { Text(label); Spacer(); Text(value).monospacedDigit() }.font(.footnote)
  }
  private func heartRate(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let bpm = hike.currentHeartRate ?? state.heartRateBpm
    return Button { hike.startHeartRate() } label: {
      HStack {
        Label("Apple Workout", systemImage: "figure.hiking")
        Spacer()
        Text(bpm.map { "\($0, specifier: "%.0f")" } ?? "Start")
      }
    }.font(.footnote).tint(.red)
  }
  private func safetyCheckin(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let checkin = state.safetyCheckin
    let active = checkin?.status == "active"
    let overdue = checkin?.status == "overdue"
    return VStack(alignment: .leading, spacing: 4) {
      HStack {
        Label(
          overdue ? "Check-in überfällig" : (active ? "Check-in aktiv" : "Sicherheits-Check-in"),
          systemImage: overdue ? "exclamationmark.triangle.fill" : "checkmark.shield"
        )
        Spacer()
        if let checkin, active || overdue {
          Text(formatCheckinTime(checkin.remainingSeconds)).monospacedDigit()
        }
      }
      if let checkin, active || overdue {
        Text(checkin.liveLinkActive ? "Live-Link aktiv" : "Nur lokaler Timer")
          .foregroundStyle(overdue ? .orange : .secondary)
      }
      Button(active || overdue ? "Sicher — Timer stoppen" : "Check-in starten") {
        if active || overdue {
          hike.confirmSafetyCheckin()
        } else {
          hike.requestSafetyCheckin()
        }
      }
      .buttonStyle(.bordered)
    }
    .font(.caption)
  }
  private func formatCheckinTime(_ seconds: Double) -> String {
    let total = max(0, Int(seconds))
    return String(format: "%02d:%02d", total / 60, total % 60)
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
  private func batteryIcon(for level: Float, charging: Bool) -> String {
    if charging { return "battery.100.bolt" }
    if level >= 0.75 { return "battery.100" }
    if level >= 0.5 { return "battery.75" }
    if level >= 0.25 { return "battery.50" }
    if level > 0.1 { return "battery.25" }
    return "battery.0"
  }
}

private struct WatchRouteMap: View {
  let map: SagaTrailWatchProtocol.RouteMap

  private var coordinates: [CLLocationCoordinate2D] {
    map.route.map {
      CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
    }
  }

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      Map(initialPosition: .automatic) {
        MapPolyline(coordinates: coordinates)
          .stroke(.blue, lineWidth: 4)
        if let current = map.current {
          Annotation("Du", coordinate: CLLocationCoordinate2D(
            latitude: current.latitude,
            longitude: current.longitude
          )) {
            ZStack {
              Circle().fill(.white).frame(width: 15, height: 15)
              Circle().fill(.blue).frame(width: 10, height: 10)
            }
          }
        }
      }
      .mapStyle(.standard)
      .frame(height: 145)
      .clipShape(RoundedRectangle(cornerRadius: 12))
      if !map.gpsFresh {
        Label("GPS pausiert", systemImage: "location.slash")
          .font(.caption2)
          .padding(.horizontal, 6)
          .padding(.vertical, 3)
          .background(.black.opacity(0.7), in: Capsule())
          .padding(6)
      }
    }
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(.white.opacity(0.2), lineWidth: 1)
    )
  }
}