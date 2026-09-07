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
  @Published private(set) var batteryLevel: Float?
  @Published private(set) var isCharging = false
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
  private var turnHapticArmed = true
  private var lastAlertKey: String?
  private var lastSafetyStatus: String?
  private var batteryObserver: NSObjectProtocol?

  var isStale: Bool {
    guard let receivedAt else { return true }
    return Date().timeIntervalSince(receivedAt) > 45
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let device = WKInterfaceDevice.current()
    device.isBatteryMonitoringEnabled = true
    updateBattery()
    if batteryObserver == nil {
      batteryObserver = NotificationCenter.default.addObserver(
        forName: WKInterfaceDevice.batteryLevelDidChangeNotification,
        object: device,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.updateBattery() }
      }
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
    apply(envelope: session.receivedApplicationContext)
  }

  deinit {
    if let batteryObserver {
      NotificationCenter.default.removeObserver(batteryObserver)
    }
  }

  private func updateBattery() {
    let device = WKInterfaceDevice.current()
    batteryLevel = device.batteryLevel >= 0 ? device.batteryLevel : nil
    isCharging = device.batteryState == .charging || device.batteryState == .full
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
    workoutAuthorizationInFlight = true
    let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate)!
    let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
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
          let payload = envelope["payload"] as? [String: Any] else { return }
    switch type {
    case "liveState":
      guard let decoded = SagaTrailWatchProtocol.LiveState.decode(payload) else { return }
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
          let distance = state.distanceToTurnMeters,
          distance >= 0,
          distance <= 120 else {
      if state.distanceToTurnMeters == nil || (state.distanceToTurnMeters ?? 0) > 150 {
        turnHapticArmed = true
      }
      return
    }
    guard turnHapticArmed else { return }
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
    UserDefaults.standard.set([
      "direction": status,
      "turnDistance": turnDistance,
      "remaining": remaining,
      "active": state.isHiking,
      "offRoute": state.offRoute != nil,
      "weatherTemperature": state.weather?.temperatureCelsius,
      "sunsetAt": state.daylight?.sunsetAt.timeIntervalSince1970,
      "arrivalAfterSunset": state.daylight?.arrivalAfterSunset ?? false,
      "updatedAt": state.updatedAt.timeIntervalSince1970
    ], forKey: "sagatrail.complication.snapshot")
  }
}

struct WatchAlert: Identifiable {
  let id = UUID()
  let title: String
  let body: String
}

extension WatchHikeModel: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    Task { @MainActor in self.isReachable = session.isReachable }
  }
  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    Task { @MainActor in self.isReachable = session.isReachable }
  }
  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    Task { @MainActor in self.apply(envelope: applicationContext) }
  }
  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    Task { @MainActor in self.apply(envelope: message) }
  }
  nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
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
    let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!
    let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
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
    if let bpm {
      let envelope = SagaTrailWatchProtocol.envelope(type: "heartRate", payload: [
        "bpm": bpm,
        "measuredAt": Int(Date().timeIntervalSince1970 * 1000),
        "source": "watch"
      ])
      let session = WCSession.default
      if session.isReachable {
        session.sendMessage(envelope, replyHandler: nil)
      } else {
        session.transferUserInfo(envelope)
      }
    }
    Task { @MainActor in
      if let bpm { self.currentHeartRate = bpm }
      if let average { self.workoutAverageHeartRate = average }
      if let maximum { self.workoutMaxHeartRate = maximum }
      if let energy { self.activeEnergyKcal = energy }
    }
  }
}