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
  @Published private(set) var healthStatus = "Puls nicht gestartet"
  @Published var showSOSConfirmation = false
  @Published var activeAlert: WatchAlert?

  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?
  private var workoutBuilder: HKLiveWorkoutBuilder?
  private var turnHapticArmed = true
  private var lastAlertKey: String?

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
    guard HKHealthStore.isHealthDataAvailable() else {
      healthStatus = "HealthKit nicht verfügbar"
      return
    }
    let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate)!
    healthStore.requestAuthorization(toShare: [HKObjectType.workoutType()], read: [heartRate]) { [weak self] success, error in
      Task { @MainActor in
        guard success else {
          self?.healthStatus = error?.localizedDescription ?? "HealthKit-Zugriff erforderlich"
          return
        }
        self?.beginWorkout()
      }
    }
  }

  private func beginWorkout() {
    guard workoutSession == nil else { return }
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

  private func apply(envelope: [String: Any]) {
    guard (envelope["v"] as? NSNumber)?.intValue == SagaTrailWatchProtocol.version,
          let type = envelope["type"] as? String,
          let payload = envelope["payload"] as? [String: Any] else { return }
    switch type {
    case "liveState":
      guard let decoded = SagaTrailWatchProtocol.LiveState.decode(payload) else { return }
      playTurnHapticIfNeeded(decoded)
      state = decoded
      receivedAt = Date()
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
    UserDefaults.standard.set([
      "direction": state.navigationDirection,
      "turnDistance": turnDistance,
      "remaining": remaining,
      "active": state.isHiking,
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
    guard let type = HKObjectType.quantityType(forIdentifier: .heartRate), collectedTypes.contains(type),
          let stats = workoutBuilder.statistics(for: type),
          let quantity = stats.mostRecentQuantity() else { return }
    let bpm = quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
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
    Task { @MainActor in self.currentHeartRate = bpm }
  }
}