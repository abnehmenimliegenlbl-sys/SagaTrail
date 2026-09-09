import SwiftUI
import MapKit

private enum WatchPalette {
  // Shared SagaTrail light-theme tokens, adapted for watchOS contrast.
  static let red = Color(red: 218 / 255, green: 41 / 255, blue: 28 / 255)
  static let gpsGreen = Color(red: 28 / 255, green: 155 / 255, blue: 87 / 255)
  static let gold = Color(red: 184 / 255, green: 147 / 255, blue: 90 / 255)
  static let black = Color(red: 16 / 255, green: 18 / 255, blue: 22 / 255)
  static let white = Color.white
  static let mutedWhite = Color(red: 107 / 255, green: 114 / 255, blue: 128 / 255)
  static let surface = Color(red: 244 / 255, green: 245 / 255, blue: 247 / 255)
  static let surfaceAlt = Color.white
  static let ink = Color(red: 24 / 255, green: 26 / 255, blue: 30 / 255)
  static let border = Color(red: 218 / 255, green: 41 / 255, blue: 28 / 255).opacity(0.28)
}

private enum WatchType {
  // These roles mirror Albert Sans / Karla / JetBrains Mono without bundling
  // another font into the Watch target, keeping small text crisp on-device.
  static let label = Font.system(size: 9, weight: .bold, design: .monospaced)
  static let body = Font.system(size: 11, weight: .medium, design: .rounded)
  static let title = Font.system(size: 14, weight: .bold, design: .rounded)
  static let display = Font.system(size: 21, weight: .heavy, design: .rounded)
  static let metric = Font.system(size: 11, weight: .semibold, design: .monospaced)
}

struct WatchHikeView: View {
  @EnvironmentObject private var hike: WatchHikeModel
  @State private var selectedPage = 0
  @State private var pageCrownPosition = 0.0
  @State private var poiTextPage = 0.0
  @State private var isMapPresented = false
  private var copy: WatchCopy { WatchCopy(language: hike.state?.language ?? "de") }
  private var pageCount: Int { hike.state?.poiStory == nil ? 4 : 5 }
  private var lastPage: Double { Double(max(0, pageCount - 1)) }

  private enum TurnDirection {
    case left
    case right
    case uTurn
    case straight

    var icon: String {
      switch self {
      case .left: return "arrow.turn.up.left"
      case .right: return "arrow.turn.up.right"
      case .uTurn: return "arrow.uturn.up"
      case .straight: return "arrow.up"
      }
    }

    var copyKey: String {
      switch self {
      case .left: return "turnLeft"
      case .right: return "turnRight"
      case .uTurn: return "turnAround"
      case .straight: return "goStraight"
      }
    }
  }

  var body: some View {
    VStack(spacing: 5) {
      gpsIndicator
      if let state = hike.state {
        TabView(selection: $selectedPage) {
          navigationPage(state).tag(0)
          statusPage(state).tag(1)
          safetyPage(state).tag(2)
          storyPage(state).tag(3)
          if let poiStory = state.poiStory {
            poiStoryPage(poiStory).tag(4)
          }
        }
        .tabViewStyle(.verticalPage)
        .frame(maxHeight: .infinity)
        .onChange(of: state.poiStory?.id) { _, id in
          if id != nil {
            selectedPage = 4
            poiTextPage = 0
          } else if selectedPage == 4 {
            selectedPage = 0
          }
        }
      } else {
        waitingPage
      }
    }
    .padding(.horizontal, 4)
    .scrollContentBackground(.hidden)
    .background(WatchPalette.surface.ignoresSafeArea())
    .tint(WatchPalette.red)
    .preferredColorScheme(.light)
    .focusable(true)
    .digitalCrownRotation(
      $pageCrownPosition,
      from: 0,
      through: lastPage,
      by: 1,
      sensitivity: .medium,
      isContinuous: false,
      isHapticFeedbackEnabled: true
    )
    .onChange(of: selectedPage) { _, page in
      pageCrownPosition = Double(min(max(page, 0), pageCount - 1))
    }
    .onChange(of: pageCrownPosition) { _, position in
      let page = min(max(Int(position.rounded()), 0), pageCount - 1)
      if selectedPage != page {
        selectedPage = page
      }
    }
    .sheet(isPresented: $isMapPresented) {
      if let state = hike.state, let map = state.map {
        WatchRouteMap(
          map: map,
          offline: !hike.isReachable || hike.isStale,
          language: state.language,
          height: 190,
          showControls: true
        )
        .padding(6)
        .background(WatchPalette.surface.ignoresSafeArea())
      }
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

  private var gpsIndicator: some View {
    let hasGPS = hike.state.map { hasFreshGPS($0) } ?? false
    return HStack(spacing: 4) {
      Image(systemName: "figure.walk")
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(hasGPS ? WatchPalette.gpsGreen : WatchPalette.red)
      Circle()
        .fill(hasGPS ? WatchPalette.gpsGreen : WatchPalette.red)
        .frame(width: 4, height: 4)
      Text(copy.t(hasGPS ? "gpsAvailable" : "noGps"))
        .font(WatchType.label)
        .tracking(0.6)
        .foregroundStyle(hasGPS ? WatchPalette.gpsGreen : WatchPalette.red)
      Spacer()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityLabel(Text(hasGPS ? copy.t("gpsAvailable") : copy.t("noGps")))
  }

  private func pageHeader(_ title: String, systemImage: String) -> some View {
    HStack(spacing: 5) {
      Image(systemName: systemImage)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(WatchPalette.red)
      Text(title.uppercased())
        .font(WatchType.label)
        .tracking(0.9)
        .foregroundStyle(WatchPalette.mutedWhite)
      Spacer(minLength: 0)
      Rectangle()
        .fill(WatchPalette.red.opacity(0.35))
        .frame(width: 24, height: 1)
    }
  }

  private func card<Content: View>(
    @ViewBuilder content: () -> Content
  ) -> some View {
    content()
      .padding(8)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(WatchPalette.surfaceAlt, in: RoundedRectangle(cornerRadius: 12))
      .overlay(
        RoundedRectangle(cornerRadius: 12)
          .stroke(WatchPalette.border, lineWidth: 1)
      )
  }

  private func hasFreshGPS(_ state: SagaTrailWatchProtocol.LiveState) -> Bool {
    !hike.isStale && state.map?.gpsFresh == true
  }

  private func offRouteCard(_ offRoute: SagaTrailWatchProtocol.OffRoute) -> some View {
    return HStack(spacing: 4) {
      Image(systemName: "location.slash.fill")
        .foregroundStyle(WatchPalette.red)
      Text(copy.t("offRoute"))
        .foregroundStyle(WatchPalette.red)
      Spacer(minLength: 2)
      Text("\(Int(offRoute.distanceMeters)) m")
        .foregroundStyle(WatchPalette.mutedWhite)
      if let bearing = offRoute.bearingToRouteDegrees {
        Text("· \(compassPoint(bearing))")
          .foregroundStyle(WatchPalette.red)
      }
    }
    .font(WatchType.body)
    .lineLimit(1)
    .padding(.horizontal, 6)
    .padding(.vertical, 4)
    .background(WatchPalette.red.opacity(0.14), in: RoundedRectangle(cornerRadius: 9))
  }
  private func weatherCard(
    _ weather: SagaTrailWatchProtocol.Weather,
    daylight: SagaTrailWatchProtocol.Daylight?,
  ) -> some View {
    return HStack(spacing: 5) {
      Label(weatherLabel(weather.weatherCode), systemImage: weatherIcon(weather.weatherCode))
      Spacer(minLength: 2)
      Text("\(Int(weather.temperatureCelsius.rounded()))°")
        .monospacedDigit()
      Text("\(Int(weather.windKmh.rounded()))")
        .monospacedDigit()
      Image(systemName: "wind")
      if weather.precipitationMm > 0 {
        Text("\(weather.precipitationMm, specifier: "%.1f")")
          .monospacedDigit()
        Image(systemName: "drop.fill")
      }
      if weather.windGustsKmh >= 35 || weather.isThunderstorm || daylight?.arrivalAfterSunset == true {
        Image(systemName: weather.isThunderstorm ? "cloud.bolt.rain.fill" : "exclamationmark.triangle.fill")
          .foregroundStyle(WatchPalette.red)
      }
    }
    .font(WatchType.body)
    .lineLimit(1)
    .minimumScaleFactor(0.72)
  }
  private func hikeSummary(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    return VStack(alignment: .leading, spacing: 6) {
      pageHeader(copy.t("completed"), systemImage: "checkmark.circle.fill")
      card {
        VStack(alignment: .leading, spacing: 4) {
          metric(copy.t("totalTime"), duration(state.elapsedSeconds))
          metric(copy.t("totalDistance"), String(format: "%.2f km", state.distanceMeters / 1000))
          metric(copy.t("steps"), "\(state.steps)")
          if state.ascentMeters > 0 {
            metric(copy.t("elevation"), "\(Int(state.ascentMeters.rounded())) m")
          }
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
            .font(WatchType.body)
            .foregroundStyle(WatchPalette.mutedWhite)
          Text(copy.t("summaryPhone"))
            .font(WatchType.body.bold())
            .foregroundStyle(WatchPalette.red)
        }
      }
    }
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
    return HStack(spacing: 3) {
      Text(label)
      Spacer(minLength: 2)
      Text(value)
        .font(WatchType.metric)
    }
    .font(WatchType.body)
    .foregroundStyle(WatchPalette.ink)
    .lineLimit(1)
    .minimumScaleFactor(0.72)
  }
  private func heartRate(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let bpm = hike.currentHeartRate ?? state.heartRateBpm
    return Button { hike.startHeartRate() } label: {
      HStack {
        Label("Apple Workout", systemImage: "figure.hiking")
        Spacer()
        Text(bpm.map { "\($0, specifier: "%.0f")" } ?? "Start")
      }
    }
    .font(WatchType.body)
    .lineLimit(1)
    .minimumScaleFactor(0.72)
    .tint(WatchPalette.red)
  }
  private func safetyCheckin(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let checkin = state.safetyCheckin
    let active = checkin?.status == "active"
    let overdue = checkin?.status == "overdue"
    return VStack(alignment: .leading, spacing: 3) {
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
      HStack(spacing: 5) {
        if let checkin, active || overdue {
          Text(checkin.liveLinkActive ? copy.t("liveLink") : copy.t("localTimer"))
            .foregroundStyle(overdue ? WatchPalette.red : WatchPalette.mutedWhite)
            .lineLimit(1)
        }
        Spacer(minLength: 2)
        Button {
          if active || overdue {
            hike.confirmSafetyCheckin()
          } else {
            hike.requestSafetyCheckin()
          }
        } label: {
          Label(
            active || overdue ? copy.t("safeNow") : copy.t("startCheckin"),
            systemImage: active || overdue ? "checkmark" : "timer"
          )
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.mini)
        Button(role: .destructive, action: hike.requestSOSConfirmation) {
          Image(systemName: "exclamationmark.triangle.fill")
        }
        .buttonStyle(.bordered)
        .controlSize(.mini)
        .accessibilityLabel(copy.t("sos"))
      }
    }
    .font(WatchType.body)
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
  private func turnDirection(for direction: String) -> TurnDirection {
    let normalized = direction.lowercased()
    if normalized.contains("uturn") || normalized.contains("u-turn") {
      return .uTurn
    }
    if normalized.contains("left") || normalized.contains("links") {
      return .left
    }
    if normalized.contains("right") || normalized.contains("rechts") {
      return .right
    }
    return .straight
  }

  @ViewBuilder
  private func navigationPage(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    if state.sessionStatus == "finished" {
      hikeSummary(state)
    } else {
      VStack(spacing: 6) {
        pageHeader(copy.t("current"), systemImage: "location.north.line.fill")
        if hasFreshGPS(state) {
          card {
            VStack(spacing: 6) {
              if let offRoute = state.offRoute {
                offRouteCard(offRoute)
              }
              let turn = turnDirection(for: state.navigationDirection)
              HStack(spacing: 8) {
                Image(systemName: turn.icon)
                  .font(.system(size: 32, weight: .bold))
                Text(copy.t(turn.copyKey))
                  .font(WatchType.display)
                  .tracking(0.5)
              }
              .foregroundStyle(WatchPalette.red)
              Text(state.distanceToTurnMeters.map { "\($0, specifier: "%.0f") m" } ?? "—")
                .font(WatchType.display.monospacedDigit())
                .foregroundStyle(WatchPalette.ink)
              Text(state.nextInstruction)
                .font(WatchType.body)
                .foregroundStyle(WatchPalette.mutedWhite)
                .multilineTextAlignment(.center)
                .lineLimit(1)
              HStack(spacing: 12) {
                metric(copy.t("remaining"), state.remainingDistanceMeters.map { String(format: "%.1f km", $0 / 1000) } ?? "—")
                metric(copy.t("arrival"), state.remainingSeconds.map { eta($0, arrivalAt: state.arrivalAtEpochMs) } ?? "—")
              }
            }
          }
        } else {
          card {
            HStack(spacing: 6) {
              Image(systemName: "location.slash.fill")
                .foregroundStyle(WatchPalette.red)
              Text(copy.t("noGpsDetail"))
                .font(WatchType.body)
                .foregroundStyle(WatchPalette.mutedWhite)
                .lineLimit(2)
            }
          }
        }
        hikeControl(state)
      }
    }
  }

  private func statusPage(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    let elevationValue: String = {
      guard let planned = state.plannedAscentMeters else { return "—" }
      if let remaining = state.remainingAscentMeters {
        return "\(Int(planned.rounded())) / \(Int(remaining.rounded())) m"
      }
      return "\(Int(planned.rounded())) m"
    }()

    return VStack(spacing: 6) {
      pageHeader(copy.t("status"), systemImage: "chart.bar.fill")
      card {
        VStack(spacing: 6) {
          if let map = state.map {
            Button {
              isMapPresented = true
            } label: {
              WatchRouteMap(
                map: map,
                offline: !hike.isReachable || hike.isStale,
                language: state.language,
                height: 56,
                showControls: false
              )
              .overlay(alignment: .topTrailing) {
                Image(systemName: "arrow.up.left.and.arrow.down.right")
                  .font(.caption2.bold())
                  .foregroundStyle(WatchPalette.ink)
                  .padding(5)
                  .background(WatchPalette.surface.opacity(0.9), in: Circle())
                  .padding(5)
              }
            }
            .buttonStyle(.plain)
          }
          if !hasFreshGPS(state) {
            HStack(spacing: 5) {
              Image(systemName: "location.slash.fill")
                .foregroundStyle(WatchPalette.red)
              Text(copy.t("noGps"))
                .font(WatchType.body.bold())
                .foregroundStyle(WatchPalette.red)
              Spacer(minLength: 2)
            }
            .lineLimit(1)
          }
          HStack(spacing: 12) {
            metric(copy.t("distance"), String(format: "%.2f km", state.distanceMeters / 1000))
            metric(copy.t("steps"), "\(state.steps)")
          }
          HStack(spacing: 12) {
            metric(copy.t("elevation"), elevationValue)
            metric(copy.t("time"), duration(state.elapsedSeconds))
          }
          heartRate(state)
          if let weather = state.weather {
            weatherCard(weather, daylight: state.daylight)
          }
        }
      }
    }
  }

  private func safetyPage(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    return VStack(spacing: 6) {
      pageHeader(copy.t("safetyTitle"), systemImage: "checkmark.shield.fill")
      card {
        VStack(alignment: .leading, spacing: 7) {
          safetyCheckin(state)
          if let terrain = state.terrainSection {
            VStack(alignment: .leading, spacing: 2) {
              HStack {
                Label(terrain.direction == "up" ? copy.t("ascent") : copy.t("descent"),
                      systemImage: terrain.direction == "up" ? "arrow.up.right" : "arrow.down.right")
                Spacer()
                Text("\(Int(terrain.gradePercent)) %")
                  .font(WatchType.metric)
              }
              Text(terrain.startsInMeters > 0
                ? "\(copy.t("startsIn")) \(Int(terrain.startsInMeters)) m · \(Int(terrain.remainingMeters)) m"
                : "\(copy.t("still")) \(Int(terrain.remainingMeters)) m")
                .foregroundStyle(WatchPalette.mutedWhite)
                .lineLimit(1)
          }
            .font(WatchType.body)
          }
          if let offRoute = state.offRoute {
            offRouteCard(offRoute)
          }
        }
      }
    }
  }

  private func poiStoryPage(_ story: SagaTrailWatchProtocol.PoiStory) -> some View {
    let chunks = poiTextChunks(story.text)
    let page = min(max(0, Int(poiTextPage.rounded())), max(0, chunks.count - 1))
    return VStack(spacing: 6) {
      pageHeader(copy.t("poiStory"), systemImage: "mappin.and.ellipse")
      card {
        VStack(spacing: 5) {
          AsyncImage(url: story.imageURL) { phase in
            if let image = phase.image {
              image.resizable().scaledToFill()
            } else {
              Image(systemName: "photo")
                .font(.title2)
                .foregroundStyle(WatchPalette.mutedWhite)
            }
        }
          .frame(height: 48)
          .frame(maxWidth: .infinity)
          .clipShape(RoundedRectangle(cornerRadius: 10))
          Text(story.name)
            .font(WatchType.title)
            .multilineTextAlignment(.center)
            .lineLimit(1)
          Text(chunks.isEmpty ? story.text : chunks[page])
            .font(WatchType.body)
            .foregroundStyle(WatchPalette.mutedWhite)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .lineLimit(3)
          Text("\(copy.t("turnCrown")) \(page + 1)/\(max(1, chunks.count))")
            .font(WatchType.label)
            .tracking(0.4)
            .foregroundStyle(WatchPalette.red)
        }
      }
    }
    .digitalCrownRotation(
      $poiTextPage,
      from: 0,
      through: Double(max(0, chunks.count - 1)),
      by: 1,
      sensitivity: .medium,
      isContinuous: false
    )
  }

  private func storyPage(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    return VStack(spacing: 6) {
      pageHeader("Story / Audio", systemImage: "waveform")
      card {
        VStack(spacing: 5) {
          Image(systemName: state.storyAudio?.isPlaying == true ? "speaker.wave.3.fill" : "speaker.slash.fill")
            .font(.system(size: 28, weight: .semibold))
            .foregroundStyle(state.storyAudio?.isPlaying == true ? WatchPalette.red : WatchPalette.mutedWhite)
          Text(state.storyAudio?.isPlaying == true ? copy.t("audioPlaying") : copy.t("audioPhone"))
            .font(WatchType.title)
            .multilineTextAlignment(.center)
          if let storyAudio = state.storyAudio {
            Text(storyAudio.text)
              .font(WatchType.body)
              .foregroundStyle(WatchPalette.mutedWhite)
              .multilineTextAlignment(.center)
              .lineLimit(2)
          }
          Text(copy.t("audioControlPhone"))
            .font(WatchType.body)
            .foregroundStyle(WatchPalette.mutedWhite)
            .multilineTextAlignment(.center)
        }
      }
    }
  }

  private var waitingPage: some View {
    VStack(spacing: 6) {
      pageHeader(copy.t("waiting"), systemImage: "figure.hiking")
      card {
        VStack(spacing: 7) {
          Image(systemName: "figure.hiking")
            .font(.system(size: 30, weight: .semibold))
            .foregroundStyle(WatchPalette.red)
          Text(copy.t("waitingStart"))
            .font(WatchType.title)
            .multilineTextAlignment(.center)
            .foregroundStyle(WatchPalette.ink)
        }
        .frame(maxWidth: .infinity)
      }
    }
  }

  private func hikeControl(_ state: SagaTrailWatchProtocol.LiveState) -> some View {
    return Button {
      hike.sendHikeCommand(state.isHiking ? "pause" : (state.sessionStatus == "preparing" ? "start" : "resume"))
    } label: {
      Label(
        state.isHiking ? copy.t("pause") : (state.sessionStatus == "preparing" ? copy.t("start") : copy.t("resume")),
        systemImage: state.isHiking ? "pause.fill" : "play.fill"
      )
    }
    .font(WatchType.body.bold())
    .buttonStyle(.borderedProminent)
    .controlSize(.mini)
    .tint(WatchPalette.red)
  }

  private func poiTextChunks(_ text: String) -> [String] {
    var chunks: [String] = []
    var current = ""
    for word in text.split(whereSeparator: { $0.isWhitespace }) {
      let candidate = current.isEmpty ? String(word) : "\(current) \(word)"
      if candidate.count > 220, !current.isEmpty {
        chunks.append(current)
        current = String(word)
      } else {
        current = candidate
      }
    }
    if !current.isEmpty { chunks.append(current) }
    return chunks.isEmpty ? [text] : chunks
  }
}

private struct WatchRouteMap: View {
  let map: SagaTrailWatchProtocol.RouteMap
  let offline: Bool
  let language: String
  let height: CGFloat
  let showControls: Bool
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
            .frame(height: height)
        } else {
          Map(position: $position) {
            MapPolyline(coordinates: coordinates)
              .stroke(WatchPalette.red, lineWidth: 4)
            if let start = coordinates.first {
              Marker(copy.t("startMarker"), systemImage: "flag.fill", coordinate: start)
                .tint(WatchPalette.black)
            }
            if let finish = coordinates.last {
              Marker(copy.t("finishMarker"), systemImage: "flag.checkered", coordinate: finish)
                .tint(WatchPalette.red)
            }
            if let current = map.current {
              Annotation("Du", coordinate: CLLocationCoordinate2D(
                latitude: current.latitude,
                longitude: current.longitude
              )) {
                ZStack {
                  Circle().fill(WatchPalette.white).frame(width: 15, height: 15)
                  Circle().fill(WatchPalette.red).frame(width: 10, height: 10)
                }
              }
            }

          }
          .mapStyle(.standard)
          .frame(height: height)
        }
      }
      .clipShape(RoundedRectangle(cornerRadius: 12))
      if showControls {
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
        .foregroundStyle(WatchPalette.white)
        .font(.caption2)
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .background(WatchPalette.black.opacity(0.7), in: Capsule())
        .padding(6)
      }
    }
    .digitalCrownRotation($zoom, from: 0.5, through: 2.0, by: 0.1, sensitivity: .medium, isContinuous: false)
    .onAppear { recenter() }
    .onChange(of: zoom) { _, _ in recenter() }
    .onChange(of: map.current?.latitude) { _, _ in
      if map.current != nil { recenter() }
    }
    .overlay(
      RoundedRectangle(cornerRadius: 12)
         .stroke(WatchPalette.white.opacity(0.2), lineWidth: 1)
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
    Self.words[language]?[key]
      ?? Self.words["de"]?[key]
      ?? Self.commonWords[language]?[key]
      ?? Self.commonWords["de"]?[key]
      ?? key
  }

  private static let commonWords: [String: [String: String]] = [
    "de": [
      "navigation": "Navigation", "current": "Aktuell", "status": "Status", "poiStory": "Ortgeschichte",
      "turnCrown": "Krone drehen", "audioPlaying": "Erzählung läuft",
      "audioPhone": "Audio bereit auf dem iPhone", "audioControlPhone": "Audio wird am iPhone gesteuert",
      "noGps": "Kein GPS-Empfang", "noGpsDetail": "Navigation wartet auf ein neues Signal",
      "gpsAvailable": "GPS verfügbar", "turnLeft": "LINKS", "turnRight": "RECHTS",
      "turnAround": "WENDEN", "goStraight": "GERADEAUS",
      "safeNow": "Ich bin sicher", "summaryPhone": "Details auf dem iPhone",
      "gpsPaused": "Kein GPS-Empfang",
    ],
    "en": [
      "navigation": "Navigation", "current": "Now", "status": "Status", "poiStory": "Place story",
      "turnCrown": "Turn crown", "audioPlaying": "Narration playing",
      "audioPhone": "Audio ready on iPhone", "audioControlPhone": "Audio is controlled on iPhone",
      "noGps": "No GPS reception", "noGpsDetail": "Navigation is waiting for a new signal",
      "gpsAvailable": "GPS available", "turnLeft": "LEFT", "turnRight": "RIGHT",
      "turnAround": "TURN AROUND", "goStraight": "STRAIGHT",
      "safeNow": "I'm safe", "summaryPhone": "Details on iPhone",
      "gpsPaused": "No GPS reception",
    ],
    "fr": [
      "navigation": "Navigation", "current": "Maintenant", "status": "État", "poiStory": "Histoire du lieu",
      "turnCrown": "Tournez la couronne", "audioPlaying": "Récit en cours",
      "audioPhone": "Audio prêt sur l’iPhone", "audioControlPhone": "Audio contrôlé sur l’iPhone",
      "noGps": "Aucun signal GPS", "noGpsDetail": "La navigation attend un nouveau signal",
      "gpsAvailable": "GPS disponible", "turnLeft": "GAUCHE", "turnRight": "DROITE",
      "turnAround": "FAIRE DEMI-TOUR", "goStraight": "TOUT DROIT",
      "safeNow": "Je vais bien", "summaryPhone": "Détails sur l’iPhone",
      "gpsPaused": "Aucun signal GPS",
    ],
    "it": [
      "navigation": "Navigazione", "current": "Ora", "status": "Stato", "poiStory": "Storia del luogo",
      "turnCrown": "Gira la corona", "audioPlaying": "Narrazione in corso",
      "audioPhone": "Audio pronto su iPhone", "audioControlPhone": "Audio controllato su iPhone",
      "noGps": "Nessun segnale GPS", "noGpsDetail": "La navigazione attende un nuovo segnale",
      "gpsAvailable": "GPS disponibile", "turnLeft": "SINISTRA", "turnRight": "DESTRA",
      "turnAround": "INVERSIONE", "goStraight": "DRITTO",
      "safeNow": "Sto bene", "summaryPhone": "Dettagli su iPhone",
      "gpsPaused": "Nessun segnale GPS",
    ],
    "es": [
      "navigation": "Navegación", "current": "Ahora", "status": "Estado", "poiStory": "Historia del lugar",
      "turnCrown": "Gira la corona", "audioPlaying": "Narración en curso",
      "audioPhone": "Audio listo en iPhone", "audioControlPhone": "Audio controlado en iPhone",
      "noGps": "Sin señal GPS", "noGpsDetail": "La navegación espera una nueva señal",
      "gpsAvailable": "GPS disponible", "turnLeft": "IZQUIERDA", "turnRight": "DERECHA",
      "turnAround": "GIRA", "goStraight": "RECTO",
      "safeNow": "Estoy bien", "summaryPhone": "Detalles en iPhone",
      "gpsPaused": "Sin señal GPS",
    ],
    "nl": [
      "navigation": "Navigatie", "current": "Nu", "status": "Status", "poiStory": "Plaatsverhaal",
      "turnCrown": "Draai de kroon", "audioPlaying": "Vertelling speelt",
      "audioPhone": "Audio klaar op iPhone", "audioControlPhone": "Audio wordt op iPhone bediend",
      "noGps": "Geen GPS-signaal", "noGpsDetail": "Navigatie wacht op een nieuw signaal",
      "gpsAvailable": "GPS beschikbaar", "turnLeft": "LINKS", "turnRight": "RECHTS",
      "turnAround": "OMKEREN", "goStraight": "RECHTDOOR",
      "safeNow": "Ik ben veilig", "summaryPhone": "Details op iPhone",
      "gpsPaused": "Geen GPS-signaal",
    ],
    "pt": [
      "navigation": "Navegação", "current": "Agora", "status": "Estado", "poiStory": "História do lugar",
      "turnCrown": "Rode a coroa", "audioPlaying": "Narração em curso",
      "audioPhone": "Áudio pronto no iPhone", "audioControlPhone": "Áudio controlado no iPhone",
      "noGps": "Sem sinal GPS", "noGpsDetail": "A navegação aguarda um novo sinal",
      "gpsAvailable": "GPS disponível", "turnLeft": "ESQUERDA", "turnRight": "DIREITA",
      "turnAround": "INVERTER", "goStraight": "EM FRENTE",
      "safeNow": "Estou bem", "summaryPhone": "Detalhes no iPhone",
      "gpsPaused": "Sem sinal GPS",
    ],
  ]

  private static let words: [String: [String: String]] = [
    "de": [
      "live": "Live vom iPhone", "unreachable": "iPhone nicht erreichbar", "stale": "Daten veraltet",
      "now": "jetzt", "ago": "vor", "waiting": "Warte auf dein iPhone",
      "waitingStart": "Warte auf den Start der Wanderung", "waitingPhone": "Warte auf dein iPhone",
      "waitingNext": "Warte auf deinen nächsten Standort", "pausedStatus": "Warte, bis du weitergehst",
      "finishedStatus": "Wanderung abgeschlossen", "next": "Danach",
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
      "gpsPaused": "Kein GPS-Empfang", "lastRoute": "Letzte Route", "north": "Nord", "route": "Route"
    ],
    "en": [
      "live": "Live from iPhone", "unreachable": "iPhone unreachable", "stale": "Data is stale",
      "now": "now", "ago": "ago", "waiting": "Waiting for iPhone",
      "waitingStart": "Waiting for the hike to start", "waitingPhone": "Waiting for your iPhone",
      "waitingNext": "Waiting for your next location", "pausedStatus": "Paused — continue when you’re ready",
      "finishedStatus": "Hike completed", "next": "Then",
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
      "gpsPaused": "No GPS reception", "lastRoute": "Last route", "north": "North", "route": "Route"
    ],
    "fr": [
      "live": "En direct depuis l’iPhone", "unreachable": "iPhone inaccessible", "stale": "Données anciennes",
      "now": "maintenant", "ago": "il y a", "waiting": "En attente de l’iPhone",
      "waitingStart": "En attente du début de la randonnée", "waitingPhone": "En attente de l’iPhone",
      "waitingNext": "En attente de votre prochaine position", "pausedStatus": "En pause — reprenez quand vous êtes prêt",
      "finishedStatus": "Randonnée terminée", "next": "Ensuite",
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
      "now": "ora", "ago": "fa", "waiting": "In attesa dell’iPhone",
      "waitingStart": "In attesa dell’inizio dell’escursione", "waitingPhone": "In attesa dell’iPhone",
      "waitingNext": "In attesa della prossima posizione", "pausedStatus": "In pausa — riprendi quando vuoi",
      "finishedStatus": "Escursione completata", "next": "Poi",
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
      "now": "ahora", "ago": "hace", "waiting": "Esperando al iPhone",
      "waitingStart": "Esperando el inicio de la ruta", "waitingPhone": "Esperando al iPhone",
      "waitingNext": "Esperando tu próxima ubicación", "pausedStatus": "En pausa — continúa cuando quieras",
      "finishedStatus": "Ruta completada", "next": "Después",
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
      "now": "nu", "ago": "geleden", "waiting": "Wachten op iPhone",
      "waitingStart": "Wachten tot de wandeling start", "waitingPhone": "Wachten op je iPhone",
      "waitingNext": "Wachten op je volgende locatie", "pausedStatus": "Gepauzeerd — ga verder wanneer je klaar bent",
      "finishedStatus": "Wandeling voltooid", "next": "Daarna",
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
      "now": "agora", "ago": "há", "waiting": "A aguardar o iPhone",
      "waitingStart": "A aguardar o início da caminhada", "waitingPhone": "A aguardar o iPhone",
      "waitingNext": "A aguardar a próxima localização", "pausedStatus": "Em pausa — continue quando quiser",
      "finishedStatus": "Caminhada concluída", "next": "Depois",
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
      context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(WatchPalette.black.opacity(0.82)))
      context.stroke(path, with: .color(WatchPalette.red), style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
      context.fill(Path(ellipseIn: dot(at: point(route[0]), radius: 7)), with: .color(WatchPalette.white))
      context.fill(Path(ellipseIn: dot(at: point(route[route.count - 1]), radius: 7)), with: .color(WatchPalette.red))
      if let current = map.current {
        context.fill(Path(ellipseIn: dot(at: point(current), radius: 6)), with: .color(WatchPalette.white))
        context.fill(Path(ellipseIn: dot(at: point(current), radius: 4)), with: .color(WatchPalette.black))
      }
    }
    .background(WatchPalette.black)
    .overlay(alignment: .topLeading) {
      Label(copy.t("offlineRoute"), systemImage: "wifi.slash")
        .font(.caption2)
         .foregroundStyle(WatchPalette.white)
        .padding(6)
    }
  }
}