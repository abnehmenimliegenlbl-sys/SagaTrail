import SwiftUI
import MapKit

struct WatchHikeView: View {
  @EnvironmentObject private var hike: WatchHikeModel
  private var copy: WatchCopy { WatchCopy(language: hike.state?.language ?? "de") }

  var body: some View {
    ScrollView {
      VStack(spacing: 9) {
        connectionBanner
        if let state = hike.state {
          if let map = state.map {
            WatchRouteMap(
              map: map,
              offline: !hike.isReachable || hike.isStale,
              language: state.language
            )
          }
          if let offRoute = state.offRoute {
            offRouteCard(offRoute)
          }
          if let weather = state.weather {
            weatherCard(weather, daylight: state.daylight)
          }
          if state.sessionStatus == "finished" {
            hikeSummary(state)
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
              Text(copy.t("next")).font(.caption2).foregroundStyle(.secondary)
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
                Label(terrain.direction == "up" ? copy.t("ascent") : copy.t("descent"),
                      systemImage: terrain.direction == "up" ? "arrow.up.right" : "arrow.down.right")
                Spacer()
                Text("\(Int(terrain.gradePercent)) %").monospacedDigit()
              }
              Text(
                terrain.startsInMeters > 0
                   ? "\(copy.t("startsIn")) \(Int(terrain.startsInMeters)) m · \(Int(terrain.remainingMeters)) m"
                   : "\(copy.t("still")) \(Int(terrain.remainingMeters)) m"
              )
              .foregroundStyle(.secondary)
            }
            .font(.caption2)
          }
          safetyCheckin(state)
          Divider()
           metric(copy.t("time"), duration(state.elapsedSeconds))
           metric(copy.t("distance"), String(format: "%.2f km", state.distanceMeters / 1000))
           if let remaining = state.remainingDistanceMeters {
             metric(copy.t("remaining"), String(format: "%.1f km", remaining / 1000))
           }
           if let remainingSeconds = state.remainingSeconds {
             metric(copy.t("arrival"), eta(remainingSeconds, arrivalAt: state.arrivalAtEpochMs))
           }
           if let plannedAscent = state.plannedAscentMeters {
             metric(copy.t("elevation"), String(format: "%.0f m", plannedAscent))
           }
           if let remainingAscent = state.remainingAscentMeters {
             metric(copy.t("remainingAscent"), String(format: "%.0f m", remainingAscent))
           }
           metric(copy.t("steps"), "\(state.steps)")
          heartRate(state)
           if state.sessionStatus != "finished" {
             Button {
                hike.sendHikeCommand(state.isHiking ? "pause" : (state.sessionStatus == "preparing" ? "start" : "resume"))
              } label: {
                Label(state.isHiking ? copy.t("pause") : (state.sessionStatus == "preparing" ? copy.t("start") : copy.t("resume")),
                      systemImage: state.isHiking ? "pause.fill" : "play.fill")
              }.buttonStyle(.bordered)
             Button(role: .destructive, action: hike.requestSOSConfirmation) {
                Label(copy.t("sos"), systemImage: "exclamationmark.triangle.fill")
             }.buttonStyle(.borderedProminent)
           }
        } else {
          Image(systemName: "iphone.slash").font(.largeTitle)
           Text(copy.t("waiting")).multilineTextAlignment(.center)
        }
      }.padding(.horizontal, 4)
    }
     .alert(copy.t("sosTitle"), isPresented: $hike.showSOSConfirmation) {
       Button(copy.t("cancel"), role: .cancel) {}
       Button(copy.t("confirmSOS"), role: .destructive, action: hike.confirmSOS)
    } message: {
       Text(copy.t("sosMessage"))
    }
     .confirmationDialog(copy.t("safetyTitle"), isPresented: $hike.showSafetyCheckinOptions) {
      Button("30 Minuten") { hike.sendSafetyCheckin(durationMinutes: 30) }
      Button("60 Minuten") { hike.sendSafetyCheckin(durationMinutes: 60) }
      Button("120 Minuten") { hike.sendSafetyCheckin(durationMinutes: 120) }
       Button(copy.t("cancel"), role: .cancel) {}
    } message: {
       Text(copy.t("safetyMessage"))
    }
    .alert(item: $hike.activeAlert) { alert in
      Alert(title: Text(alert.title), message: Text(alert.body), dismissButton: .default(Text("OK")))
    }
  }

  private var connectionBanner: some View {
    HStack(spacing: 5) {
      Text(!hike.isReachable ? copy.t("unreachable") : hike.isStale ? copy.t("stale") : copy.t("live"))
      Spacer()
      if let receivedAt = hike.receivedAt {
        let age = max(0, Int(Date().timeIntervalSince(receivedAt)))
        Text(age < 5 ? copy.t("now") : "\(copy.t("ago")) \(age)s").monospacedDigit()
      }
      if let battery = hike.batteryLevel {
        Image(systemName: batteryIcon(for: battery, charging: hike.isCharging))
        Text("\(Int((battery * 100).rounded())) %").monospacedDigit()
      }
    }
    .font(.caption2)
    .foregroundStyle((!hike.isReachable || hike.isStale) ? .orange : .green)
  }
  private func offRouteCard(_ offRoute: SagaTrailWatchProtocol.OffRoute) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Label(copy.t("offRoute"), systemImage: "location.slash.fill")
        .foregroundStyle(.orange)
      Text("\(copy.t("atLeast")) \(Int(offRoute.distanceMeters)) m \(copy.t("fromRoute"))")
        .foregroundStyle(.secondary)
      if let bearing = offRoute.bearingToRouteDegrees {
        Label("\(copy.t("returnDirection")) \(compassPoint(bearing))", systemImage: "location.north.fill")
          .foregroundStyle(.orange)
      }
      Text(copy.t("returnToRoute"))
        .foregroundStyle(.secondary)
    }
    .font(.caption2)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(7)
    .background(.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 9))
  }
  private func weatherCard(
    _ weather: SagaTrailWatchProtocol.Weather,
    daylight: SagaTrailWatchProtocol.Daylight?,
  ) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      HStack {
        Label(weatherLabel(weather.weatherCode), systemImage: weatherIcon(weather.weatherCode))
        Spacer()
        Text("\(Int(weather.temperatureCelsius.rounded())) °C").monospacedDigit()
      }
      if let daylight {
        Text("\(copy.t("sunset")) \(daylight.sunsetAt.formatted(date: .omitted, time: .shortened))")
          .foregroundStyle(daylight.arrivalAfterSunset ? .orange : .secondary)
        if daylight.arrivalAfterSunset {
          Text(copy.t("afterSunset"))
            .foregroundStyle(.orange)
        }
      }
      HStack(spacing: 8) {
        Label("\(Int(weather.windKmh.rounded())) km/h", systemImage: "wind")
        if weather.precipitationMm > 0 {
          Label("\(weather.precipitationMm, specifier: "%.1f") mm", systemImage: "drop.fill")
        }
      }
      if weather.windGustsKmh >= 35 {
        Text("\(copy.t("gusts")) \(Int(weather.windGustsKmh.rounded())) km/h")
          .foregroundStyle(.orange)
      }
      if weather.isThunderstorm {
        Label(copy.t("thunderstorm"), systemImage: "cloud.bolt.rain.fill")
          .foregroundStyle(.red)
      }
    }
    .font(.caption2)
  }
  private func hikeSummary(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Label(copy.t("completed"), systemImage: "checkmark.circle.fill")
        .foregroundStyle(.green)
      metric(copy.t("totalTime"), duration(state.elapsedSeconds))
      metric(copy.t("totalDistance"), String(format: "%.2f km", state.distanceMeters / 1000))
      if let bpm = hike.currentHeartRate ?? state.heartRateBpm {
        metric(copy.t("lastHeartRate"), "\(Int(bpm.rounded())) bpm")
      }
      if let average = hike.workoutAverageHeartRate {
        metric(copy.t("averageHeartRate"), "\(Int(average.rounded())) bpm")
      }
      if let maximum = hike.workoutMaxHeartRate {
        metric(copy.t("maxHeartRate"), "\(Int(maximum.rounded())) bpm")
      }
      if let energy = hike.activeEnergyKcal {
        metric(copy.t("activeEnergy"), "\(Int(energy.rounded())) kcal")
      }
      Text(hike.healthStatus)
        .foregroundStyle(.secondary)
    }
    .font(.caption2)
    .frame(maxWidth: .infinity, alignment: .leading)
  }
  private func weatherIcon(_ code: Int) -> String {
    switch code {
    case 0: return "sun.max.fill"
    case 1...3: return "cloud.sun.fill"
    case 45...48: return "cloud.fog.fill"
    case 51...67, 80...82: return "cloud.rain.fill"
    case 71...77, 85...86: return "snowflake"
    case 95...99: return "cloud.bolt.rain.fill"
    default: return "cloud.fill"
    }
  }
  private func weatherLabel(_ code: Int) -> String {
    switch code {
    case 0: return "Klar"
    case 1...3: return "Bewölkt"
    case 45...48: return "Nebel"
    case 51...67, 80...82: return "Regen"
    case 71...77, 85...86: return "Schnee"
    case 95...99: return "Gewitter"
    default: return "Wetter"
    }
  }
  private func compassPoint(_ degrees: Double) -> String {
    let points = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
    let normalized = (degrees.truncatingRemainder(dividingBy: 360) + 360)
      .truncatingRemainder(dividingBy: 360)
    let index = Int((normalized / 45.0).rounded()) % points.count
    return points[index]
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
           overdue ? copy.t("overdue") : (active ? copy.t("safetyActive") : copy.t("safetyTitle")),
          systemImage: overdue ? "exclamationmark.triangle.fill" : "checkmark.shield"
        )
        Spacer()
        if let checkin, active || overdue {
          Text(formatCheckinTime(checkin.remainingSeconds)).monospacedDigit()
        }
      }
      if let checkin, active || overdue {
         Text(checkin.liveLinkActive ? copy.t("liveLink") : copy.t("localTimer"))
          .foregroundStyle(overdue ? .orange : .secondary)
      }
       Button(active || overdue ? copy.t("stopTimer") : copy.t("startCheckin")) {
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
  let offline: Bool
  let language: String
  @State private var position: MapCameraPosition = .automatic
  @State private var zoom: Double = 1
  @State private var routeUp = false
  private var copy: WatchCopy { WatchCopy(language: language) }

  private var coordinates: [CLLocationCoordinate2D] {
    map.route.map {
      CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
    }
  }

  private var center: CLLocationCoordinate2D {
    if let current = map.current {
      return CLLocationCoordinate2D(latitude: current.latitude, longitude: current.longitude)
    }
    let lat = map.route.map(\.latitude).reduce(0, +) / Double(map.route.count)
    let lng = map.route.map(\.longitude).reduce(0, +) / Double(map.route.count)
    return CLLocationCoordinate2D(latitude: lat, longitude: lng)
  }

  private var baseDistance: CLLocationDistance {
    let latitudes = map.route.map(\.latitude)
    let longitudes = map.route.map(\.longitude)
    let span = max(
      (latitudes.max() ?? 0) - (latitudes.min() ?? 0),
      (longitudes.max() ?? 0) - (longitudes.min() ?? 0),
    )
    return max(400, span * 111_000 * 1.6)
  }

  private var routeHeading: CLLocationDirection {
    guard let first = coordinates.first, let second = coordinates.dropFirst().first else { return 0 }
    let lat1 = first.latitude * .pi / 180
    let lat2 = second.latitude * .pi / 180
    let deltaLng = (second.longitude - first.longitude) * .pi / 180
    let y = sin(deltaLng) * cos(lat2)
    let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLng)
    return (atan2(y, x) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)
  }

  private func recenter() {
    position = .camera(MapCamera(
      centerCoordinate: center,
      distance: baseDistance / zoom,
      heading: routeUp ? routeHeading : 0,
      pitch: 0
    ))
  }

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      ZStack {
        if offline {
          OfflineRouteSketch(map: map, language: language)
            .frame(height: 145)
        } else {
          Map(position: $position) {
            MapPolyline(coordinates: coordinates)
              .stroke(.blue, lineWidth: 4)
            if let start = coordinates.first {
              Marker(copy.t("startMarker"), systemImage: "flag.fill", coordinate: start)
                .tint(.green)
            }
            if let finish = coordinates.last {
              Marker(copy.t("finishMarker"), systemImage: "flag.checkered", coordinate: finish)
                .tint(.red)
            }
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
        }
      }
      .clipShape(RoundedRectangle(cornerRadius: 12))
      VStack(alignment: .leading, spacing: 3) {
        if !map.gpsFresh {
          Label(copy.t("gpsPaused"), systemImage: "location.slash")
        } else if offline {
          Label(copy.t("lastRoute"), systemImage: "wifi.slash")
        }
        HStack(spacing: 8) {
          Button {
            routeUp.toggle()
            recenter()
          } label: {
            Image(systemName: routeUp ? "location.north.line.fill" : "location.north")
          }
          Text(routeUp ? copy.t("route") : copy.t("north"))
            .font(.caption2)
        }
      }
      .foregroundStyle(.white)
      .font(.caption2)
      .padding(.horizontal, 6)
      .padding(.vertical, 4)
      .background(.black.opacity(0.7), in: Capsule())
      .padding(6)
    }
    .digitalCrownRotation($zoom, from: 0.5, through: 2.0, by: 0.1, sensitivity: .medium, isContinuous: false)
    .onAppear { recenter() }
    .onChange(of: zoom) { _, _ in recenter() }
    .onChange(of: map.current?.latitude) { _, _ in
      if map.current != nil { recenter() }
    }
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(.white.opacity(0.2), lineWidth: 1)
    )
  }
}

private struct WatchCopy {
  private let language: String

  init(language: String) {
    let normalized = language.lowercased().split(separator: "-").first.map(String.init) ?? "de"
    self.language = normalized == "gsw" ? "de" : normalized
  }

  func t(_ key: String) -> String {
    Self.words[language]?[key] ?? Self.words["de"]?[key] ?? key
  }

  private static let words: [String: [String: String]] = [
    "de": [
      "live": "Live vom iPhone", "unreachable": "iPhone nicht erreichbar", "stale": "Daten veraltet",
      "now": "jetzt", "ago": "vor", "waiting": "Warte auf dein iPhone", "next": "Danach",
      "ascent": "Anstieg", "descent": "Gefälle", "startsIn": "Beginnt in", "still": "Noch",
      "time": "Zeit", "distance": "Distanz", "remaining": "Rest", "arrival": "Ankunft",
      "elevation": "Höhenmeter", "remainingAscent": "Restanstieg", "steps": "Schritte",
      "start": "Start", "pause": "Pause", "resume": "Fortsetzen", "sos": "SOS",
      "offRoute": "Route verlassen", "atLeast": "Mindestens", "fromRoute": "vom geplanten Weg entfernt",
      "returnDirection": "Zurück Richtung", "returnToRoute": "Zurück zur markierten Route gehen.",
      "sunset": "Sonnenuntergang", "afterSunset": "Voraussichtliche Ankunft nach Sonnenuntergang",
      "gusts": "Starke Böen bis", "thunderstorm": "Gewittergefahr", "completed": "Wanderung abgeschlossen",
      "totalTime": "Gesamtzeit", "totalDistance": "Gesamtdistanz", "lastHeartRate": "Letzter Puls",
      "averageHeartRate": "Ø Puls", "maxHeartRate": "Max. Puls", "activeEnergy": "Aktive Energie"
      , "sosTitle": "SOS an iPhone senden?", "confirmSOS": "SOS bestätigen", "cancel": "Abbrechen",
      "sosMessage": "Dein iPhone startet den Notfallablauf. Keine Position wird auf der Watch angezeigt.",
      "safetyTitle": "Sicherheits-Check-in", "safetyMessage": "Das iPhone startet den bestehenden Sicherheitslink. Die Watch überträgt keine Position.",
      "overdue": "Check-in überfällig", "safetyActive": "Check-in aktiv", "liveLink": "Live-Link aktiv",
      "localTimer": "Nur lokaler Timer", "stopTimer": "Sicher — Timer stoppen", "startCheckin": "Check-in starten",
      "startMarker": "Start", "finishMarker": "Ziel", "offlineRoute": "Offline-Route",
      "gpsPaused": "GPS pausiert", "lastRoute": "Letzte Route", "north": "Nord", "route": "Route"
    ],
    "en": [
      "live": "Live from iPhone", "unreachable": "iPhone unreachable", "stale": "Data is stale",
      "now": "now", "ago": "ago", "waiting": "Waiting for iPhone", "next": "Then",
      "ascent": "Uphill", "descent": "Downhill", "startsIn": "Starts in", "still": "Remaining",
      "time": "Time", "distance": "Distance", "remaining": "Remaining", "arrival": "Arrival",
      "elevation": "Elevation", "remainingAscent": "Climb left", "steps": "Steps",
      "start": "Start", "pause": "Pause", "resume": "Resume", "sos": "SOS",
      "offRoute": "Off route", "atLeast": "At least", "fromRoute": "from the planned route",
      "returnDirection": "Return toward", "returnToRoute": "Walk back to the marked route.",
      "sunset": "Sunset", "afterSunset": "Estimated arrival after sunset",
      "gusts": "Strong gusts up to", "thunderstorm": "Thunderstorm risk", "completed": "Hike completed",
      "totalTime": "Total time", "totalDistance": "Total distance", "lastHeartRate": "Last heart rate",
      "averageHeartRate": "Avg. heart rate", "maxHeartRate": "Max. heart rate", "activeEnergy": "Active energy"
      , "sosTitle": "Send SOS to iPhone?", "confirmSOS": "Confirm SOS", "cancel": "Cancel",
      "sosMessage": "Your iPhone starts the emergency flow. No location is shown on the Watch.",
      "safetyTitle": "Safety check-in", "safetyMessage": "The iPhone starts the existing safety link. The Watch does not transmit location.",
      "overdue": "Check-in overdue", "safetyActive": "Check-in active", "liveLink": "Live link active",
      "localTimer": "Local timer only", "stopTimer": "Safe — stop timer", "startCheckin": "Start check-in",
      "startMarker": "Start", "finishMarker": "Finish", "offlineRoute": "Offline route",
      "gpsPaused": "GPS paused", "lastRoute": "Last route", "north": "North", "route": "Route"
    ],
    "fr": [
      "live": "En direct depuis l’iPhone", "unreachable": "iPhone inaccessible", "stale": "Données anciennes",
      "now": "maintenant", "ago": "il y a", "waiting": "En attente de l’iPhone", "next": "Ensuite",
      "ascent": "Montée", "descent": "Descente", "startsIn": "Commence dans", "still": "Encore",
      "time": "Temps", "distance": "Distance", "remaining": "Restant", "arrival": "Arrivée",
      "elevation": "Dénivelé", "remainingAscent": "Montée restante", "steps": "Pas",
      "start": "Démarrer", "pause": "Pause", "resume": "Reprendre", "sos": "SOS",
      "offRoute": "Hors itinéraire", "atLeast": "Au moins", "fromRoute": "de l’itinéraire",
      "returnDirection": "Retour vers", "returnToRoute": "Revenez vers l’itinéraire marqué.",
      "sunset": "Coucher du soleil", "afterSunset": "Arrivée prévue après le coucher du soleil",
      "gusts": "Rafales fortes jusqu’à", "thunderstorm": "Risque d’orage", "completed": "Randonnée terminée",
      "totalTime": "Durée totale", "totalDistance": "Distance totale", "lastHeartRate": "Dernier pouls",
      "averageHeartRate": "Pouls moyen", "maxHeartRate": "Pouls max.", "activeEnergy": "Énergie active"
    ],
    "it": [
      "live": "Live dall’iPhone", "unreachable": "iPhone non raggiungibile", "stale": "Dati obsoleti",
      "now": "ora", "ago": "fa", "waiting": "In attesa dell’iPhone", "next": "Poi",
      "ascent": "Salita", "descent": "Discesa", "startsIn": "Inizia tra", "still": "Ancora",
      "time": "Tempo", "distance": "Distanza", "remaining": "Restante", "arrival": "Arrivo",
      "elevation": "Dislivello", "remainingAscent": "Salita restante", "steps": "Passi",
      "start": "Avvia", "pause": "Pausa", "resume": "Riprendi", "sos": "SOS",
      "offRoute": "Fuori percorso", "atLeast": "Almeno", "fromRoute": "dal percorso previsto",
      "returnDirection": "Torna verso", "returnToRoute": "Torna al percorso indicato.",
      "sunset": "Tramonto", "afterSunset": "Arrivo previsto dopo il tramonto",
      "gusts": "Raffiche forti fino a", "thunderstorm": "Rischio temporale", "completed": "Escursione completata",
      "totalTime": "Tempo totale", "totalDistance": "Distanza totale", "lastHeartRate": "Ultimo battito",
      "averageHeartRate": "Battito medio", "maxHeartRate": "Battito max.", "activeEnergy": "Energia attiva"
    ],
    "es": [
      "live": "En directo desde iPhone", "unreachable": "iPhone no disponible", "stale": "Datos antiguos",
      "now": "ahora", "ago": "hace", "waiting": "Esperando al iPhone", "next": "Después",
      "ascent": "Subida", "descent": "Bajada", "startsIn": "Empieza en", "still": "Quedan",
      "time": "Tiempo", "distance": "Distancia", "remaining": "Restante", "arrival": "Llegada",
      "elevation": "Desnivel", "remainingAscent": "Subida restante", "steps": "Pasos",
      "start": "Iniciar", "pause": "Pausa", "resume": "Continuar", "sos": "SOS",
      "offRoute": "Fuera de ruta", "atLeast": "Al menos", "fromRoute": "de la ruta prevista",
      "returnDirection": "Volver hacia", "returnToRoute": "Vuelve a la ruta marcada.",
      "sunset": "Puesta de sol", "afterSunset": "Llegada prevista después de la puesta de sol",
      "gusts": "Ráfagas fuertes de hasta", "thunderstorm": "Riesgo de tormenta", "completed": "Ruta completada",
      "totalTime": "Tiempo total", "totalDistance": "Distancia total", "lastHeartRate": "Último pulso",
      "averageHeartRate": "Pulso medio", "maxHeartRate": "Pulso máx.", "activeEnergy": "Energía activa"
    ],
    "nl": [
      "live": "Live vanaf iPhone", "unreachable": "iPhone niet bereikbaar", "stale": "Gegevens verouderd",
      "now": "nu", "ago": "geleden", "waiting": "Wachten op iPhone", "next": "Daarna",
      "ascent": "Stijging", "descent": "Daling", "startsIn": "Begint over", "still": "Nog",
      "time": "Tijd", "distance": "Afstand", "remaining": "Resterend", "arrival": "Aankomst",
      "elevation": "Hoogtemeters", "remainingAscent": "Resterende stijging", "steps": "Stappen",
      "start": "Start", "pause": "Pauze", "resume": "Hervatten", "sos": "SOS",
      "offRoute": "Van route", "atLeast": "Minstens", "fromRoute": "van de geplande route",
      "returnDirection": "Terug richting", "returnToRoute": "Ga terug naar de gemarkeerde route.",
      "sunset": "Zonsondergang", "afterSunset": "Verwachte aankomst na zonsondergang",
      "gusts": "Sterke windstoten tot", "thunderstorm": "Onweerrisico", "completed": "Wandeling voltooid",
      "totalTime": "Totale tijd", "totalDistance": "Totale afstand", "lastHeartRate": "Laatste hartslag",
      "averageHeartRate": "Gem. hartslag", "maxHeartRate": "Max. hartslag", "activeEnergy": "Actieve energie"
    ],
    "pt": [
      "live": "Ao vivo do iPhone", "unreachable": "iPhone indisponível", "stale": "Dados antigos",
      "now": "agora", "ago": "há", "waiting": "A aguardar o iPhone", "next": "Depois",
      "ascent": "Subida", "descent": "Descida", "startsIn": "Começa em", "still": "Restam",
      "time": "Tempo", "distance": "Distância", "remaining": "Restante", "arrival": "Chegada",
      "elevation": "Desnível", "remainingAscent": "Subida restante", "steps": "Passos",
      "start": "Iniciar", "pause": "Pausa", "resume": "Retomar", "sos": "SOS",
      "offRoute": "Fora do percurso", "atLeast": "Pelo menos", "fromRoute": "do percurso previsto",
      "returnDirection": "Voltar para", "returnToRoute": "Volte ao percurso marcado.",
      "sunset": "Pôr do sol", "afterSunset": "Chegada prevista após o pôr do sol",
      "gusts": "Rajadas fortes até", "thunderstorm": "Risco de trovoada", "completed": "Caminhada concluída",
      "totalTime": "Tempo total", "totalDistance": "Distância total", "lastHeartRate": "Último pulso",
      "averageHeartRate": "Pulso médio", "maxHeartRate": "Pulso máx.", "activeEnergy": "Energia ativa"
    ]
  ]
}

private struct OfflineRouteSketch: View {
  let map: SagaTrailWatchProtocol.RouteMap
  let language: String
  private var copy: WatchCopy { WatchCopy(language: language) }

  var body: some View {
    Canvas { context, size in
      let route = map.route
      guard route.count >= 2 else { return }
      let minLat = route.map(\.latitude).min() ?? 0
      let maxLat = route.map(\.latitude).max() ?? 1
      let minLng = route.map(\.longitude).min() ?? 0
      let maxLng = route.map(\.longitude).max() ?? 1
      let latSpan = max(0.000001, maxLat - minLat)
      let lngSpan = max(0.000001, maxLng - minLng)
      let inset: CGFloat = 18
      func point(_ value: SagaTrailWatchProtocol.MapPoint) -> CGPoint {
        CGPoint(
          x: inset + CGFloat((value.longitude - minLng) / lngSpan) * (size.width - inset * 2),
          y: size.height - inset - CGFloat((value.latitude - minLat) / latSpan) * (size.height - inset * 2)
        )
      }
      func dot(at center: CGPoint, radius: CGFloat) -> CGRect {
        CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
      }
      var path = Path()
      path.move(to: point(route[0]))
      for item in route.dropFirst() {
        path.addLine(to: point(item))
      }
      context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.black.opacity(0.82)))
      context.stroke(path, with: .color(.cyan), style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
      context.fill(Path(ellipseIn: dot(at: point(route[0]), radius: 7)), with: .color(.green))
      context.fill(Path(ellipseIn: dot(at: point(route[route.count - 1]), radius: 7)), with: .color(.red))
      if let current = map.current {
        context.fill(Path(ellipseIn: dot(at: point(current), radius: 6)), with: .color(.white))
        context.fill(Path(ellipseIn: dot(at: point(current), radius: 4)), with: .color(.blue))
      }
    }
    .background(.black)
    .overlay(alignment: .topLeading) {
      Label(copy.t("offlineRoute"), systemImage: "wifi.slash")
        .font(.caption2)
        .foregroundStyle(.white)
        .padding(6)
    }
  }
}