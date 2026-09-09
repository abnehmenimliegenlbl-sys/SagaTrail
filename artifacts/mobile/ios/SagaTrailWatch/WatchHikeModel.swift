import Foundation
import HealthKit
import WatchConnectivity
import WatchKit
import ClockKit

@MainActor
final class WatchHikeModel: NSObject, ObservableObject {
  @Published private(set) var state: SagaTrailWatchProtocol.LiveState?
  @Published private(set) var isReachable = false
  @Published private(set) var receivedAt: Date?
  @Published private(set) var currentHeartRate: Double?
  @Published private(set) var workoutAverageHeartRate: Double?
  @Published private(set) var workoutMaxHeartRate: Double?
  @Published private(set) var activeEnergyKcal: Double?
  @Published private(set) var healthStatus = "Puls nicht gestartet"
  @Published var showSOSConfirmation = false
  @Published var showSafetyCheckinOptions = false
  @Published var activeAlert: WatchAlert?

  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?
  private var workoutBuilder: HKLiveWorkoutBuilder?
  private var workoutFinishInProgress = false
  private var workoutAuthorizationInFlight = false
  private var automaticWorkoutStartBlocked = false
  private var lastHeartRateRelayAt: Date?
  private var turnHapticArmed = true
  private var lastAlertKey: String?
  private var lastSafetyStatus: String?

  var isStale: Bool {
    guard let receivedAt else { return true }
    return Date().timeIntervalSince(receivedAt) > 45
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
    apply(envelope: session.receivedApplicationContext)
  }

  func requestSOSConfirmation() { showSOSConfirmation = true }

  func requestSafetyCheckin() { showSafetyCheckinOptions = true }

  func sendSafetyCheckin(durationMinutes: Int) {
    guard [30, 60, 120].contains(durationMinutes) else { return }
    showSafetyCheckinOptions = false
    let message = SagaTrailWatchProtocol.envelope(type: "hikeCommand", payload: [
      "command": "safetyStart",
      "durationMinutes": durationMinutes,
      "requestedAt": Int(Date().timeIntervalSince1970 * 1000)
    ])
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil)
    } else {
      session.transferUserInfo(message)
    }
  }

  func confirmSafetyCheckin() {
    let message = SagaTrailWatchProtocol.envelope(type: "hikeCommand", payload: [
      "command": "safetyConfirm",
      "requestedAt": Int(Date().timeIntervalSince1970 * 1000)
    ])
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil)
    } else {
      session.transferUserInfo(message)
    }
  }

  func confirmSOS() {
    showSOSConfirmation = false
    let message = SagaTrailWatchProtocol.envelope(type: "sosConfirmed", payload: [
      "source": "watch",
      "requestedAt": Int(Date().timeIntervalSince1970 * 1000)
    ])
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil)
    } else {
      session.transferUserInfo(message)
    }
  }

  func sendHikeCommand(_ command: String) {
    guard ["start", "pause", "resume"].contains(command) else { return }
    let message = SagaTrailWatchProtocol.envelope(type: "hikeCommand", payload: [
      "command": command,
      "requestedAt": Int(Date().timeIntervalSince1970 * 1000)
    ])
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil)
    } else {
      session.transferUserInfo(message)
    }
  }

  func startHeartRate() {
    automaticWorkoutStartBlocked = false
    requestWorkoutAuthorizationAndStart(automatic: false)
  }

  private func requestWorkoutAuthorizationAndStart(automatic: Bool) {
    guard workoutSession == nil,
          !workoutAuthorizationInFlight,
          !(automatic && automaticWorkoutStartBlocked) else { return }
    guard HKHealthStore.isHealthDataAvailable() else {
      healthStatus = "HealthKit nicht verfügbar"
      return
    }
    guard let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate),
          let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
      healthStatus = "HealthKit-Datentypen nicht verfügbar"
      return
    }
    workoutAuthorizationInFlight = true
    healthStore.requestAuthorization(toShare: [HKObjectType.workoutType()], read: [heartRate, activeEnergy]) { [weak self] success, error in
      Task { @MainActor in
        guard let self else { return }
        self.workoutAuthorizationInFlight = false
        guard success else {
          if automatic { self.automaticWorkoutStartBlocked = true }
          self.healthStatus = error?.localizedDescription ?? "HealthKit-Zugriff erforderlich"
          return
        }
        guard self.state?.sessionStatus == "active" || !automatic else {
          self.healthStatus = "Workout bereit"
          return
        }
        self.beginWorkout()
      }
    }
  }

  private func beginWorkout() {
    guard workoutSession == nil else { return }
    workoutAverageHeartRate = nil
    workoutMaxHeartRate = nil
    activeEnergyKcal = nil
    lastHeartRateRelayAt = nil
    do {
      let configuration = HKWorkoutConfiguration()
      configuration.activityType = .hiking
      configuration.locationType = .outdoor
      let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
      let builder = session.associatedWorkoutBuilder()
      builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)
      session.delegate = self
      builder.delegate = self
      workoutSession = session
      workoutBuilder = builder
      let now = Date()
      session.startActivity(with: now)
      builder.beginCollection(withStart: now) { [weak self] success, error in
        Task { @MainActor in
          self?.healthStatus = success ? "Live-Puls" : (error?.localizedDescription ?? "Puls konnte nicht starten")
        }
      }
    } catch {
      healthStatus = error.localizedDescription
    }
  }

  private func syncWorkout(with sessionStatus: String) {
    switch sessionStatus {
    case "preparing":
      automaticWorkoutStartBlocked = false
    case "active":
      if workoutSession == nil {
        requestWorkoutAuthorizationAndStart(automatic: true)
      } else if workoutSession?.state == .paused {
        workoutSession?.resume()
      }
    case "paused":
      if workoutSession?.state == .running {
        workoutSession?.pause()
      }
    case "finished":
      finishWorkout()
    default:
      break
    }
  }

  private func finishWorkout() {
    guard let session = workoutSession else { return }
    guard !workoutFinishInProgress else { return }
    workoutFinishInProgress = true
    let builder = workoutBuilder
    if session.state == .running || session.state == .paused {
      session.end()
    }
    guard let builder else {
      workoutSession = nil
      workoutFinishInProgress = false
      return
    }
    let end = Date()
    builder.endCollection(withEnd: end) { [weak self, weak builder] success, error in
      guard let builder else { return }
      builder.finishWorkout { [weak self] _, finishError in
        Task { @MainActor in
          self?.healthStatus = finishError?.localizedDescription
            ?? error?.localizedDescription
            ?? (success ? "Workout gespeichert" : "Workout konnte nicht gespeichert werden")
          self?.workoutSession = nil
          self?.workoutBuilder = nil
          self?.workoutFinishInProgress = false
        }
      }
    }
  }

  private func apply(envelope: [String: Any]) {
    guard (envelope["v"] as? NSNumber)?.intValue == SagaTrailWatchProtocol.version,
          let type = envelope["type"] as? String,
          let payload = envelope["payload"] as? [String: Any] else {
      NSLog("[SagaTrail Watch] Ignored malformed envelope (keys: %@)", Array(envelope.keys).sorted().joined(separator: ","))
      return
    }
    switch type {
    case "liveState":
      guard let decoded = SagaTrailWatchProtocol.LiveState.decode(payload) else {
        let status = payload["sessionStatus"] as? String ?? "<missing>"
        let hiking = payload["isHiking"] as? Bool
        NSLog("[SagaTrail Watch] Rejected live state (status: %@, isHiking: %@, keys: %@)",
              status,
              hiking.map { String($0) } ?? "<missing>",
              Array(payload.keys).sorted().joined(separator: ","))
        return
      }
      NSLog("[SagaTrail Watch] Applied live state (status: %@, isHiking: %@, updatedAt: %@)",
            decoded.sessionStatus,
            String(decoded.isHiking),
            String(decoded.updatedAt.timeIntervalSince1970))
      playTurnHapticIfNeeded(decoded)
      if decoded.offRoute != nil && state?.offRoute == nil {
        WKInterfaceDevice.current().play(.failure)
      } else if decoded.offRoute == nil && state?.offRoute != nil {
        WKInterfaceDevice.current().play(.success)
      }
      let safetyStatus = decoded.safetyCheckin?.status
      if safetyStatus == "overdue" && lastSafetyStatus != "overdue" {
        WKInterfaceDevice.current().play(.failure)
        showSOSConfirmation = true
      } else if safetyStatus != "overdue" && lastSafetyStatus == "overdue" {
        WKInterfaceDevice.current().play(.success)
      }
      lastSafetyStatus = safetyStatus
      state = decoded
      receivedAt = Date()
      syncWorkout(with: decoded.sessionStatus)
      persistComplication(decoded)
      ComplicationController.reload()
    case "alert":
      // The protocol deliberately carries display text only, never coordinates.
      let title = payload["title"] as? String ?? "SagaTrail"
      let body = payload["body"] as? String ?? ""
      let haptic = payload["haptic"] as? String
      let alertKey = "\(title)|\(body)|\(haptic ?? "")"
      if alertKey != lastAlertKey {
        lastAlertKey = alertKey
        playAlertHaptic(haptic)
      }
      activeAlert = WatchAlert(title: title, body: body)
    default:
      break
    }
  }

  private func playTurnHapticIfNeeded(_ state: SagaTrailWatchProtocol.LiveState) {
    guard state.isHiking,
          state.map?.gpsFresh == true,
          let distance = state.distanceToTurnMeters,
          distance >= 0,
          distance <= 120 else {
      if state.distanceToTurnMeters == nil || (state.distanceToTurnMeters ?? 0) > 150 {
        turnHapticArmed = true
      }
      return
    }
    guard turnHapticArmed else { return }
    // When the Watch app is visible, use the native turn haptic. If it is
    // not visible, the iPhone's mirrored local notification is the sole
    // notification surface; this prevents a double vibration.
    guard WKExtension.shared().applicationState == .active else { return }
    turnHapticArmed = false
    let direction = state.navigationDirection.lowercased()
    WKInterfaceDevice.current().play(direction.contains("left") ? .directionUp : .directionDown)
  }

  private func playAlertHaptic(_ haptic: String?) {
    switch haptic {
    case "warning":
      WKInterfaceDevice.current().play(.notification)
    case "failure":
      WKInterfaceDevice.current().play(.failure)
    case "click":
      WKInterfaceDevice.current().play(.click)
    case "notification":
      WKInterfaceDevice.current().play(.notification)
    case "success":
      WKInterfaceDevice.current().play(.success)
    default:
      break
    }
  }

  private func persistComplication(_ state: SagaTrailWatchProtocol.LiveState) {
    let turnDistance = state.distanceToTurnMeters.map { "\(Int($0)) m" } ?? "—"
    let remaining = state.remainingDistanceMeters.map { String(format: "%.1f km", $0 / 1000) } ?? "—"
    let status = state.offRoute.map { "ABWEG \(Int($0.distanceMeters)) m" }
      ?? (state.isHiking ? state.navigationDirection : "Pause")
    var snapshot: [String: Any] = [
      "direction": status,
      "turnDistance": turnDistance,
      "remaining": remaining,
      "active": state.isHiking,
      "gpsFresh": state.map?.gpsFresh == true && !isStale,
      "offRoute": state.offRoute != nil,
      "arrivalAfterSunset": state.daylight?.arrivalAfterSunset ?? false,
      "updatedAt": state.updatedAt.timeIntervalSince1970
    ]
    if let temperature = state.weather?.temperatureCelsius {
      snapshot["weatherTemperature"] = temperature
    }
    if let sunsetAt = state.daylight?.sunsetAt.timeIntervalSince1970 {
      snapshot["sunsetAt"] = sunsetAt
    }
    guard PropertyListSerialization.propertyList(snapshot, isValidFor: .binary) else {
      NSLog("[SagaTrail Watch] Rejected invalid complication snapshot")
      return
    }
    UserDefaults.standard.set(snapshot, forKey: "sagatrail.complication.snapshot")
  }
}

struct WatchAlert: Identifiable {
  let id = UUID()
  let title: String
  let body: String
}

extension WatchHikeModel: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let receivedContext = session.receivedApplicationContext
    let reachable = session.isReachable
    NSLog("[SagaTrail Watch] WC activation completed (state: %ld, reachable: %@, contextKeys: %@, error: %@)",
          activationState.rawValue,
          String(reachable),
          Array(receivedContext.keys).sorted().joined(separator: ","),
          error?.localizedDescription ?? "none")
    Task { @MainActor in
      self.apply(envelope: receivedContext)
      self.isReachable = reachable
    }
  }
  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    NSLog("[SagaTrail Watch] WC reachability changed: %@", String(session.isReachable))
    Task { @MainActor in self.isReachable = session.isReachable }
  }
  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    NSLog("[SagaTrail Watch] Received application context (keys: %@)",
          Array(applicationContext.keys).sorted().joined(separator: ","))
    Task { @MainActor in self.apply(envelope: applicationContext) }
  }
  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    NSLog("[SagaTrail Watch] Received direct message (keys: %@)",
          Array(message.keys).sorted().joined(separator: ","))
    Task { @MainActor in self.apply(envelope: message) }
  }
  nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    NSLog("[SagaTrail Watch] Received transferred user info (keys: %@)",
          Array(userInfo.keys).sorted().joined(separator: ","))
    Task { @MainActor in self.apply(envelope: userInfo) }
  }
}

extension WatchHikeModel: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                                  from fromState: HKWorkoutSessionState, date: Date) {}
  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    Task { @MainActor in self.healthStatus = error.localizedDescription }
  }
  nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
  nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                                  didCollectDataOf collectedTypes: Set<HKSampleType>) {
    guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
          let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
      return
    }
    let heartRateStats = collectedTypes.contains(heartRateType)
      ? workoutBuilder.statistics(for: heartRateType)
      : nil
    let energyStats = collectedTypes.contains(energyType)
      ? workoutBuilder.statistics(for: energyType)
      : nil
    let bpm = heartRateStats?.mostRecentQuantity()?.doubleValue(
      for: HKUnit.count().unitDivided(by: .minute())
    )
    let average = heartRateStats?.averageQuantity()?.doubleValue(
      for: HKUnit.count().unitDivided(by: .minute())
    )
    let maximum = heartRateStats?.maximumQuantity()?.doubleValue(
      for: HKUnit.count().unitDivided(by: .minute())
    )
    let energy = energyStats?.sumQuantity()?.doubleValue(for: .kilocalorie())
    Task { @MainActor in
      if let bpm, bpm.isFinite, bpm >= 0, bpm <= 500 {
        let now = Date()
        let shouldRelay = self.lastHeartRateRelayAt.map {
          now.timeIntervalSince($0) >= 10
        } ?? true
        if shouldRelay {
          self.lastHeartRateRelayAt = now
          self.relayHeartRate(bpm, measuredAt: now)
        }
        self.currentHeartRate = bpm
      }
      if let average, average.isFinite, average >= 0, average <= 500 {
        self.workoutAverageHeartRate = average
      }
      if let maximum, maximum.isFinite, maximum >= 0, maximum <= 500 {
        self.workoutMaxHeartRate = maximum
      }
      if let energy, energy.isFinite, energy >= 0, energy <= 1_000_000 {
        self.activeEnergyKcal = energy
      }
    }
  }

  @MainActor
  private func relayHeartRate(_ bpm: Double, measuredAt: Date) {
    let envelope = SagaTrailWatchProtocol.envelope(type: "heartRate", payload: [
      "bpm": bpm,
      "measuredAt": Int(measuredAt.timeIntervalSince1970 * 1000),
      "source": "watch"
    ])
    let session = WCSession.default
    if session.activationState == .activated {
      do {
        // Keep the latest sample available even when the phone is
        // temporarily not reachable. The phone bridge consumes this
        // context and forwards it to the React Native Hike screen.
        try session.updateApplicationContext(envelope)
      } catch {
        NSLog("[SagaTrail Watch] Could not update heart-rate context: %@", error.localizedDescription)
      }
    }
    if session.isReachable {
      session.sendMessage(envelope, replyHandler: nil)
    } else {
      session.transferUserInfo(envelope)
    }
  }
}