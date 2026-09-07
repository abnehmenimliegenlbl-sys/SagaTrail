import Foundation
import React
import WatchConnectivity

/// React Native entry point for the iPhone half of the companion app.
///
/// The phone owns hike state. This bridge only validates and forwards a
/// versioned snapshot to the watch; it never synthesizes location or metrics.
@objc(SagaTrailCompanion)
final class SagaTrailCompanion: RCTEventEmitter {
  private let connection = SagaTrailPhoneWatchConnection.shared

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWatchEvent(_:)),
      name: .sagaTrailWatchEvent,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String] {
    ["SagaTrailWatchEvent", "SagaTrailWatchStatus", "SagaTrailCompanion.heartRate", "SagaTrailCompanion.sosRequest", "SagaTrailCompanion.hikeCommand"]
  }

  @objc func activate() {
    connection.activate()
    emitStatus()
  }

  /// Accepts a protocol v1 `HikeLiveState` dictionary. Coordinates are
  /// intentionally not protocol fields and are rejected by the validator.
  @objc func updateHikeLiveState(_ state: NSDictionary) {
    do {
      try connection.sendLiveState(state as? [String: Any] ?? [:])
      emitStatus()
    } catch {
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
  }

  /// Canonical HikeLiveState entry point used by lib/watchCompanion.ts.
  /// It transforms the JS contract into the deliberately small watch payload.
  @objc func publishLiveState(_ state: NSDictionary) {
    do {
      try connection.publishCanonicalLiveState(state as? [String: Any] ?? [:])
      emitStatus()
    } catch {
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
  }

  /// Sends a display-safe alert. Do not place coordinates in title/body.
  @objc func sendAlert(_ alert: NSDictionary) {
    do {
      try connection.sendAlert(alert as? [String: Any] ?? [:])
    } catch {
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
  }

  @objc func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    resolve(connection.statusPayload)
  }

  @objc private func handleWatchEvent(_ notification: Notification) {
    guard let envelope = notification.object as? [String: Any] else { return }
    let payload = envelope["payload"] as? [String: Any] ?? [:]
    switch envelope["type"] as? String {
    case "heartRate":
      // Exact JS event contract; only the watch originates this event.
      sendEvent(withName: "SagaTrailCompanion.heartRate", body: [
        "bpm": payload["bpm"] ?? 0,
        "measuredAt": payload["measuredAt"] ?? Int(Date().timeIntervalSince1970 * 1000),
        "source": "watch"
      ])
    case "sosConfirmed":
      // Confirmation is a request to the phone. JS remains responsible for
      // the actual emergency workflow and any location handling.
      sendEvent(withName: "SagaTrailCompanion.sosRequest", body: [
        "requestedAt": payload["requestedAt"] ?? Int(Date().timeIntervalSince1970 * 1000)
      ])
    case "hikeCommand":
      if let command = payload["command"] as? String {
        sendEvent(withName: "SagaTrailCompanion.hikeCommand", body: ["command": command])
      }
    default:
      break
    }
    sendEvent(withName: "SagaTrailWatchEvent", body: envelope)
    emitStatus()
  }

  private func emitStatus() {
    sendEvent(withName: "SagaTrailWatchStatus", body: connection.statusPayload)
  }
}

extension Notification.Name {
  static let sagaTrailWatchEvent = Notification.Name("SagaTrailWatchEvent")
}

private final class SagaTrailPhoneWatchConnection: NSObject, WCSessionDelegate {
  static let shared = SagaTrailPhoneWatchConnection()
  private let protocolVersion = 1

  private override init() {
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  var statusPayload: [String: Any] {
    let session = WCSession.isSupported() ? WCSession.default : nil
    return [
      "v": protocolVersion,
      "reachable": session?.isReachable ?? false,
      "paired": session?.isPaired ?? false,
      "watchAppInstalled": session?.isWatchAppInstalled ?? false,
      "phoneAuthoritative": true
    ]
  }

  func sendLiveState(_ state: [String: Any]) throws {
    let payload = try validatedLiveState(state)
    send(envelope(type: "liveState", payload: payload), preferApplicationContext: true)
  }

  func publishCanonicalLiveState(_ state: [String: Any]) throws {
    guard (state["version"] as? NSNumber)?.intValue == protocolVersion,
          let timestamp = state["timestamp"] as? NSNumber,
          state["sequence"] is NSNumber,
          let status = state["sessionStatus"] as? String,
          ["preparing", "active", "paused", "finished", "sos_requested"].contains(status),
          let freshness = state["gpsFreshness"] as? String,
          ["fresh", "stale", "unavailable"].contains(freshness) else {
      throw ProtocolError.invalidCanonicalState
    }
    guard !containsForbiddenCoordinates(in: state, allowingMapPayload: true) else {
      throw ProtocolError.coordinatesNotAllowed
    }
    if let map = state["map"] as? [String: Any] {
      guard validMapPayload(map) else { throw ProtocolError.invalidMapPayload }
    }
    let navigation = state["nextNavigation"] as? [String: Any]
    let upcomingNavigations = state["upcomingNavigations"] as? [[String: Any]] ?? []
    let alert = state["activeAlert"] as? [String: Any]
    let heartRate = state["heartRate"] as? [String: Any]
    let direction = navigation?["direction"] as? String
    guard navigation == nil || ["left", "right"].contains(direction ?? "") else {
      throw ProtocolError.invalidCanonicalState
    }
    guard upcomingNavigations.count <= 3,
          upcomingNavigations.allSatisfy({ item in
            guard let direction = item["direction"] as? String else { return false }
            return direction == "left" || direction == "right"
          }) else {
      throw ProtocolError.invalidCanonicalState
    }
    if let alertText = alert?["text"] as? String, containsCoordinate(alertText) {
      throw ProtocolError.invalidAlert
    }
    var watchState: [String: Any] = [
      "updatedAt": timestamp,
      "isHiking": status == "active",
      "elapsedSeconds": state["elapsedSec"] ?? 0,
      "distanceMeters": state["walkedDistanceM"] ?? 0,
      "ascentMeters": state["ascentM"] ?? 0,
      "steps": state["steps"] ?? 0,
      "sessionStatus": status,
      "navigationDirection": direction ?? "straight",
      "nextInstruction": alert?["text"] as? String ?? (status == "active" ? "Weiter auf der Route" : "Hike nicht aktiv")
    ]
    if !upcomingNavigations.isEmpty {
      watchState["upcomingNavigations"] = upcomingNavigations
    }
    if let plannedAscent = state["plannedAscentM"] {
      watchState["plannedAscentMeters"] = plannedAscent
    }
    if let remainingAscent = state["remainingAscentM"] {
      watchState["remainingAscentMeters"] = remainingAscent
    }
    if let terrainSection = state["terrainSection"] as? [String: Any] {
      watchState["terrainSection"] = terrainSection
    }
    if let safetyCheckin = state["safetyCheckin"] as? [String: Any] {
      watchState["safetyCheckin"] = safetyCheckin
    }
    if let map = state["map"] as? [String: Any] {
      watchState["map"] = map
    }
    if let navigation {
      watchState["bearingDegrees"] = navigation["bearingDeg"]
      watchState["distanceToTurnMeters"] = navigation["distanceM"]
    }
    if let remainingDistance = state["remainingDistanceM"] {
      watchState["remainingDistanceMeters"] = remainingDistance
    }
    if let remainingSeconds = state["remainingSeconds"] {
      watchState["remainingSeconds"] = remainingSeconds
    }
    if let arrivalAt = state["arrivalAtEpochMs"] {
      watchState["arrivalAtEpochMs"] = arrivalAt
    }
    if let heartRate { watchState["heartRateBpm"] = heartRate["bpm"] }
    try sendLiveState(watchState)
    if let alert, let text = alert["text"] as? String, !text.isEmpty {
      let haptic = (alert["haptic"] as? String)
        ?? ((alert["kind"] as? String) == "safety"
          ? "warning"
          : ((alert["kind"] as? String) == "sos" ? "failure" : "click"))
      try sendAlert(["title": "SagaTrail", "body": text, "haptic": haptic])
    }
  }

  func sendAlert(_ alert: [String: Any]) throws {
    let title = alert["title"] as? String ?? ""
    let body = alert["body"] as? String ?? ""
    guard (!title.isEmpty || !body.isEmpty) && !containsCoordinate(title) && !containsCoordinate(body) else {
      throw ProtocolError.invalidAlert
    }
    // Alerts cross a lock-screen boundary: retain only human-readable text.
    var payload: [String: Any] = ["title": title, "body": body]
    if let haptic = alert["haptic"] as? String { payload["haptic"] = haptic }
    send(envelope(type: "alert", payload: payload), preferApplicationContext: false)
  }

  private func send(_ message: [String: Any], preferApplicationContext: Bool) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if preferApplicationContext {
      do { try session.updateApplicationContext(message) }
      catch { NSLog("[SagaTrail Watch] Could not update application context: %@", error.localizedDescription) }
    } else if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { error in
        NSLog("[SagaTrail Watch] Could not send alert: %@", error.localizedDescription)
      }
    } else {
      session.transferUserInfo(message)
    }
  }

  private func envelope(type: String, payload: [String: Any]) -> [String: Any] {
    ["v": protocolVersion, "type": type, "timestamp": Int(Date().timeIntervalSince1970 * 1000), "payload": payload]
  }

  private func containsCoordinate(_ text: String) -> Bool {
    // Blocks common latitude/longitude pairs before they can reach a watch
    // alert or notification surface (for example: 46.8182, 8.2275).
    text.range(of: #"\b-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\b"#,
               options: .regularExpression) != nil
  }

  private func validatedLiveState(_ input: [String: Any]) throws -> [String: Any] {
    guard !containsForbiddenCoordinates(in: input, allowingMapPayload: true) else {
      throw ProtocolError.coordinatesNotAllowed
    }
    if let map = input["map"] as? [String: Any], !validMapPayload(map) {
      throw ProtocolError.invalidMapPayload
    }
    guard let updatedAt = input["updatedAt"] as? NSNumber else { throw ProtocolError.missingUpdatedAt }
    var result: [String: Any] = ["updatedAt": updatedAt]
    let fields = ["routeName", "nextInstruction", "navigationDirection", "sessionStatus", "isHiking",
                  "elapsedSeconds", "distanceMeters", "ascentMeters", "steps",
                  "heartRateBpm", "bearingDegrees", "distanceToTurnMeters",
                  "remainingDistanceMeters", "remainingSeconds", "arrivalAtEpochMs",
                  "upcomingNavigations", "plannedAscentM", "remainingAscentM",
                   "terrainSection", "map"]
    for field in fields { if let value = input[field] { result[field] = value } }
    return result
  }

  private func validMapPayload(_ map: [String: Any]) -> Bool {
    guard let route = map["route"] as? [[String: Any]],
          route.count >= 2,
          route.count <= 120,
          let gpsFresh = map["gpsFresh"] as? Bool else {
      return false
    }
    func validPoint(_ point: [String: Any]) -> Bool {
      guard let lat = (point["lat"] as? NSNumber)?.doubleValue,
            let lng = (point["lng"] as? NSNumber)?.doubleValue else {
        return false
      }
      return lat.isFinite && lat >= -90 && lat <= 90 &&
        lng.isFinite && lng >= -180 && lng <= 180
    }
    guard route.allSatisfy(validPoint) else { return false }
    if let current = map["current"] as? [String: Any], !validPoint(current) {
      return false
    }
    return map["current"] == nil || map["current"] is [String: Any] || map["current"] is NSNull
  }

  private func containsForbiddenCoordinates(in value: Any, allowingMapPayload: Bool = false) -> Bool {
    let forbidden = Set(["latitude", "longitude", "lat", "lng", "coordinate", "coordinates"])
    if let dictionary = value as? [String: Any] {
      return dictionary.contains {
        if allowingMapPayload && $0.key.lowercased() == "map" { return false }
        return forbidden.contains($0.key.lowercased())
          || containsForbiddenCoordinates(in: $0.value, allowingMapPayload: allowingMapPayload)
      }
    }
    if let array = value as? [Any] {
      return array.contains(where: { containsForbiddenCoordinates(in: $0, allowingMapPayload: allowingMapPayload) })
    }
    return false
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: envelope(
      type: "connectionStatus",
      payload: statusPayload.merging(["activationState": activationState.rawValue]) { _, new in new }
    ))
  }
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
  func sessionReachabilityDidChange(_ session: WCSession) {
    NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: envelope(type: "connectionStatus", payload: statusPayload))
  }
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) { receive(message) }
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) { receive(userInfo) }

  private func receive(_ message: [String: Any]) {
    guard (message["v"] as? NSNumber)?.intValue == protocolVersion,
          let type = message["type"] as? String,
           ["sosConfirmed", "heartRate", "hikeCommand"].contains(type) else { return }
    // JS / the phone owns the actual SOS action and any location sharing.
    NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: message)
  }

  private enum ProtocolError: LocalizedError {
    case coordinatesNotAllowed, missingUpdatedAt, invalidAlert, invalidCanonicalState, invalidMapPayload
    var errorDescription: String? {
      switch self {
      case .coordinatesNotAllowed: return "Coordinates are not allowed in the watch protocol."
      case .missingUpdatedAt: return "HikeLiveState.updatedAt is required."
      case .invalidAlert: return "An alert needs display text and cannot contain coordinates."
      case .invalidCanonicalState: return "The HikeLiveState protocol v1 payload is invalid."
      case .invalidMapPayload: return "The watch map payload is invalid."
      }
    }
  }
}