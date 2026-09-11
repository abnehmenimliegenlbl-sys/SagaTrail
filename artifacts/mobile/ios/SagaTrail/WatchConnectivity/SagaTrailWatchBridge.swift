import Foundation
import React
import WatchConnectivity

private enum SagaTrailPhoneRemoteDiagnostics {
  static func log(_ message: String, data: [String: Any] = [:]) {
    let endpointString = Bundle.main.object(
      forInfoDictionaryKey: "SagaTrailRemoteDebugURL"
    ) as? String
    let configuredEndpoint = endpointString.flatMap { URL(string: $0) }
    guard let endpoint = configuredEndpoint
      ?? URL(string: "https://api.sagatrail.ch/api/debug/log") else { return }
    var request = URLRequest(url: endpoint)
    request.httpMethod = "POST"
    request.timeoutInterval = 8
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    var eventData = data
    eventData["atEpochMs"] = Int(Date().timeIntervalSince1970 * 1_000)
    request.httpBody = try? JSONSerialization.data(withJSONObject: [
      "tag": "watch_phone_native",
      "message": message,
      "data": [eventData],
    ])
    guard request.httpBody != nil else { return }
    URLSession.shared.dataTask(with: request).resume()
  }
}

private func poiTransportDiagnostics(for message: [String: Any]) -> [String: Any]? {
  let type = message["type"] as? String
  let payload = message["payload"] as? [String: Any] ?? [:]
  let story = payload["poiStory"] as? [String: Any]
  let action = payload["action"] as? String
  guard story != nil || action == "openPoiStory" else { return nil }
  return [
    "messageType": type ?? "unknown",
    "poiStoryId": story?["id"] as? String ?? NSNull(),
    "poiStoryKind": story?["kind"] as? String ?? NSNull(),
    "poiStoryTextLength": (story?["text"] as? String)?.count ?? 0,
    "poiStoryPresent": story != nil,
    "alertAction": action ?? NSNull(),
    "updatedAt": payload["updatedAt"] ?? NSNull(),
  ]
}

/// React Native entry point for the iPhone half of the companion app.
///
/// The phone owns hike state. This bridge only validates and forwards a
/// versioned snapshot to the watch; it never synthesizes location or metrics.
@objc(SagaTrailCompanion)
final class SagaTrailCompanion: RCTEventEmitter {
  private let connection = SagaTrailPhoneWatchConnection.shared
  private let garminConnection = SagaTrailGarminConnection.shared
  private var lastHeartRateMeasuredAt: Int64 = 0
  private var hasJavaScriptListeners = false
  private var pendingWatchActions: [(name: String, body: [String: Any])] = []
  private let pendingWatchActionsKey = "sagatrail.pending.watch.actions"
  private var lastRemoteLiveStateDiagnosticKey: String?

  override init() {
    super.init()
    connection.setActionHandler { [weak self] envelope in
      DispatchQueue.main.async {
        self?.processWatchEnvelope(envelope)
      }
    }
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWatchEvent(_:)),
      name: .sagaTrailWatchEvent,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleGarminEvent(_:)),
      name: .sagaTrailGarminEvent,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // WatchConnectivity callbacks and the React Native listener lifecycle can
  // overlap during cold start. Keep the emitter state on the main queue.
  @objc override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String] {
    ["SagaTrailWatchEvent", "SagaTrailWatchStatus", "SagaTrailCompanion.heartRate", "SagaTrailCompanion.sosRequest", "SagaTrailCompanion.hikeCommand"]
  }

  override func startObserving() {
    hasJavaScriptListeners = true
    NSLog("[SagaTrail Watch] JS listeners attached; pending actions stay queued until explicit drain")
    // DeviceEventEmitter may register its listeners just before React Native
    // finishes flipping the emitter into the observing state. The JS-side
    // drain can therefore arrive while hasJavaScriptListeners is still false.
    // Retry from the native observing boundary once the emitter is ready.
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.drainPendingWatchActions()
    }
  }

  @objc func drainPendingWatchActions() {
    guard hasJavaScriptListeners else {
      NSLog("[SagaTrail Watch] Pending action drain skipped because JS listeners are absent")
      return
    }
    let persisted = (UserDefaults.standard.array(forKey: pendingWatchActionsKey) as? [[String: Any]] ?? [])
      .compactMap { item -> (name: String, body: [String: Any])? in
        guard let name = item["name"] as? String,
              let body = item["body"] as? [String: Any] else {
          return nil
        }
        return (name: name, body: body)
      }
    // UserDefaults mirrors the in-memory queue. Prefer it when present so a
    // cold-start replay does not emit the same command twice.
    let pending = persisted.isEmpty ? pendingWatchActions : persisted
    NSLog("[SagaTrail Watch] Draining %ld pending actions (persisted: %ld, memory: %ld)",
          pending.count, persisted.count, pendingWatchActions.count)
    pendingWatchActions.removeAll()
    UserDefaults.standard.removeObject(forKey: pendingWatchActionsKey)
    pending.forEach { sendEvent(withName: $0.name, body: $0.body) }
  }

  override func stopObserving() {
    hasJavaScriptListeners = false
    NSLog("[SagaTrail Watch] JS listeners detached")
  }

  @objc func activate() {
    let session = WCSession.isSupported() ? WCSession.default : nil
    NSLog("[SagaTrail Watch] Native activate requested (listeners: %@, sessionState: %ld, reachable: %@)",
          String(hasJavaScriptListeners),
          session?.activationState.rawValue ?? -1,
          String(session?.isReachable ?? false))
    connection.activate()
    garminConnection.activate()
    emitStatus()
  }

  @objc func selectGarminDevice() {
    garminConnection.selectDevice()
  }

  /// Accepts a protocol v1 `HikeLiveState` dictionary. Coordinates are
  /// intentionally not protocol fields and are rejected by the validator.
  @objc func updateHikeLiveState(_ state: NSDictionary) {
    NSLog("[SagaTrail Watch] updateHikeLiveState called (keys: %@)",
          state.allKeys.compactMap { $0 as? String }.sorted().joined(separator: ","))
    do {
      try connection.sendLiveState(state as? [String: Any] ?? [:])
      emitStatus()
    } catch {
      NSLog("[SagaTrail Watch] updateHikeLiveState rejected: %@", error.localizedDescription)
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
  }

  /// Canonical HikeLiveState entry point used by lib/watchCompanion.ts.
  /// It transforms the JS contract into the deliberately small watch payload.
  @objc func publishLiveState(_ state: NSDictionary) {
    NSLog("[SagaTrail Watch] publishLiveState called (keys: %@)",
          state.allKeys.compactMap { $0 as? String }.sorted().joined(separator: ","))
    let canonicalState = state as? [String: Any] ?? [:]
    let status = canonicalState["sessionStatus"] as? String ?? "missing"
    let isHiking = canonicalState["isHiking"] as? Bool ?? false
    logPoiTransport("partner POI snapshot entered native bridge", state: canonicalState, phase: "received")
    do {
      try connection.publishCanonicalLiveState(canonicalState)
      logPoiTransport("partner POI snapshot accepted by native bridge", state: canonicalState, phase: "accepted")
      logLiveStateDiagnosticIfChanged(
        outcome: "accepted",
        status: status,
        isHiking: isHiking
      )
      emitStatus()
    } catch {
      NSLog("[SagaTrail Watch] publishLiveState rejected: %@", error.localizedDescription)
      logPoiTransport("partner POI snapshot rejected by native bridge", state: canonicalState, phase: "rejected")
      logLiveStateDiagnosticIfChanged(
        outcome: "rejected:\(String(describing: error))",
        status: status,
        isHiking: isHiking
      )
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
    garminConnection.sendLiveState(canonicalState)
  }

  private func logPoiTransport(
    _ message: String,
    state: [String: Any],
    phase: String
  ) {
    let story = state["poiStory"] as? [String: Any]
    let alert = state["activeAlert"] as? [String: Any]
    guard story != nil || alert?["action"] as? String == "openPoiStory" else { return }
    var data: [String: Any] = [
      "phase": phase,
      "sequence": state["sequence"] ?? NSNull(),
      "poiStoryId": story?["id"] as? String ?? NSNull(),
      "poiStoryKind": story?["kind"] as? String ?? NSNull(),
      "poiStoryTextLength": (story?["text"] as? String)?.count ?? 0,
      "poiStoryPresent": story != nil,
      "alertAction": alert?["action"] as? String ?? NSNull(),
      "wcActivated": WCSession.default.activationState == .activated,
      "wcReachable": WCSession.default.isReachable,
    ]
    SagaTrailPhoneRemoteDiagnostics.log(message, data: data)
  }

  private func logLiveStateDiagnosticIfChanged(
    outcome: String,
    status: String,
    isHiking: Bool
  ) {
    let key = "\(outcome):\(status):\(isHiking)"
    guard key != lastRemoteLiveStateDiagnosticKey else { return }
    lastRemoteLiveStateDiagnosticKey = key
    SagaTrailPhoneRemoteDiagnostics.log("live state processed by phone native", data: [
      "outcome": outcome,
      "sessionStatus": status,
      "isHiking": isHiking,
    ])
  }

  /// Sends a display-safe alert. Do not place coordinates in title/body.
  @objc func sendAlert(_ alert: NSDictionary) {
    NSLog("[SagaTrail Watch] sendAlert called (keys: %@)",
          alert.allKeys.compactMap { $0 as? String }.sorted().joined(separator: ","))
    do {
      try connection.sendAlert(alert as? [String: Any] ?? [:])
    } catch {
      NSLog("[SagaTrail Watch] sendAlert rejected: %@", error.localizedDescription)
      sendEvent(withName: "SagaTrailWatchEvent", body: [
        "v": 1, "type": "protocolError", "payload": ["message": error.localizedDescription]
      ])
    }
  }

  @objc func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    var status = connection.statusPayload
    status["garmin"] = garminConnection.statusPayload
    resolve(status)
  }

  @objc func getLatestHeartRate(_ resolve: @escaping RCTPromiseResolveBlock,
                                reject: @escaping RCTPromiseRejectBlock) {
    resolve(connection.latestHeartRatePayload ?? NSNull())
  }

  @objc private func handleWatchEvent(_ notification: Notification) {
    // WatchConnectivity delegate callbacks may arrive off the main queue.
    // React Native's event emitter must be called on the main queue or the
    // heart-rate event can be dropped before it reaches DeviceEventEmitter.
    guard Thread.isMainThread else {
      DispatchQueue.main.async { [weak self] in
        self?.handleWatchEvent(notification)
      }
      return
    }
    guard let envelope = notification.object as? [String: Any] else { return }
    processWatchEnvelope(envelope)
  }

  private func processWatchEnvelope(_ envelope: [String: Any]) {
    let payload = envelope["payload"] as? [String: Any] ?? [:]
    let type = envelope["type"] as? String ?? "unknown"
    NSLog("[SagaTrail Watch] Processing incoming envelope (type: %@, payloadKeys: %@, listeners: %@)",
          type, payload.keys.sorted().joined(separator: ","), String(hasJavaScriptListeners))
    switch type {
    case "heartRate":
      // Exact JS event contract; only the watch originates this event.
      let measuredAt = (payload["measuredAt"] as? NSNumber)?.int64Value
        ?? Int64(Date().timeIntervalSince1970 * 1000)
      guard measuredAt > lastHeartRateMeasuredAt else {
        NSLog("[SagaTrail Watch] Ignored stale heart-rate event (measuredAt: %lld, last: %lld)",
              measuredAt, lastHeartRateMeasuredAt)
        return
      }
      lastHeartRateMeasuredAt = measuredAt
      NSLog("[SagaTrail Watch] Forwarding heart-rate event to JS (measuredAt: %lld, hasBpm: %@)",
            measuredAt, String(payload["bpm"] != nil))
      sendEvent(withName: "SagaTrailCompanion.heartRate", body: [
        "bpm": payload["bpm"] ?? 0,
         "measuredAt": measuredAt,
        "source": "watch"
      ])
    case "sosConfirmed":
      // Confirmation is a request to the phone. JS remains responsible for
      // the actual emergency workflow and any location handling.
      NSLog("[SagaTrail Watch] Forwarding SOS request to JS")
      emitOrQueueWatchAction(name: "SagaTrailCompanion.sosRequest", body: [
        "requestedAt": payload["requestedAt"] ?? Int(Date().timeIntervalSince1970 * 1000)
      ])
    case "hikeCommand":
      if let command = payload["command"] as? String {
        NSLog("[SagaTrail Watch] Forwarding hike command to JS (command: %@, hasDuration: %@)",
              command, String(payload["durationMinutes"] != nil))
        if command == "safetyStart" || command == "safetyConfirm" {
          SagaTrailPhoneRemoteDiagnostics.log("safety command forwarding to JS", data: [
            "command": command,
            "hasDuration": payload["durationMinutes"] != nil,
            "hasJavaScriptListeners": hasJavaScriptListeners,
          ])
        }
        var event: [String: Any] = ["command": command]
        if let durationMinutes = payload["durationMinutes"] as? NSNumber,
           [30, 60, 120].contains(durationMinutes.intValue) {
          event["durationMinutes"] = durationMinutes.intValue
        }
        emitOrQueueWatchAction(name: "SagaTrailCompanion.hikeCommand", body: event)
      }
    default:
      NSLog("[SagaTrail Watch] Ignoring unknown incoming envelope type: %@", type)
      break
    }
    sendEvent(withName: "SagaTrailWatchEvent", body: envelope)
    emitStatus()
  }

  @objc private func handleGarminEvent(_ notification: Notification) {
    guard Thread.isMainThread else {
      DispatchQueue.main.async { [weak self] in
        self?.handleGarminEvent(notification)
      }
      return
    }
    guard let envelope = notification.object as? [String: Any],
          let type = envelope["type"] as? String else { return }
    let payload = envelope["payload"] as? [String: Any] ?? [:]
    if type == "sosRequest" {
      sendEvent(withName: "SagaTrailCompanion.sosRequest", body: [
        "requestedAt": payload["requestedAt"] ?? Int(Date().timeIntervalSince1970 * 1000),
        "requestId": payload["requestId"] ?? NSNull(),
        "source": "garmin_connect_iq"
      ])
    } else if type == "heartRate" {
      sendEvent(withName: "SagaTrailCompanion.heartRate", body: [
        "bpm": payload["bpm"] ?? 0,
        "measuredAt": payload["measuredAt"] ?? Int(Date().timeIntervalSince1970 * 1000),
        "source": "garmin"
      ])
    } else if type == "hikeCommand",
              let command = payload["command"] as? String {
      var event: [String: Any] = ["command": command, "source": "garmin_connect_iq"]
      if let durationMinutes = payload["durationMinutes"] {
        event["durationMinutes"] = durationMinutes
      }
      sendEvent(withName: "SagaTrailCompanion.hikeCommand", body: event)
    }
    sendEvent(withName: "SagaTrailWatchStatus", body: [
      "v": 1,
      "garmin": garminConnection.statusPayload
    ])
  }

  private func emitStatus() {
    let session = WCSession.isSupported() ? WCSession.default : nil
    NSLog("[SagaTrail Watch] Emitting status (state: %ld, reachable: %@, paired: %@, installed: %@)",
          session?.activationState.rawValue ?? -1,
          String(session?.isReachable ?? false),
          String(session?.isPaired ?? false),
          String(session?.isWatchAppInstalled ?? false))
    sendEvent(withName: "SagaTrailWatchStatus", body: connection.statusPayload)
  }

  private func emitOrQueueWatchAction(name: String, body: [String: Any]) {
    guard hasJavaScriptListeners else {
      pendingWatchActions.append((name: name, body: body))
      if pendingWatchActions.count > 20 {
        pendingWatchActions.removeFirst(pendingWatchActions.count - 20)
      }
      UserDefaults.standard.set(
        pendingWatchActions.map { ["name": $0.name, "body": $0.body] },
        forKey: pendingWatchActionsKey
      )
      NSLog("[SagaTrail Watch] Queued action because JS listeners are absent (name: %@, queueCount: %ld)",
            name, pendingWatchActions.count)
      return
    }
    NSLog("[SagaTrail Watch] Emitting action to JS (name: %@)", name)
    sendEvent(withName: name, body: body)
  }
}

extension Notification.Name {
  static let sagaTrailWatchEvent = Notification.Name("SagaTrailWatchEvent")
}

final class SagaTrailPhoneWatchConnection: NSObject, WCSessionDelegate {
  static let shared = SagaTrailPhoneWatchConnection()
  private let protocolVersion = 1
  private let latestHeartRateLock = NSLock()
  private var cachedLatestHeartRate: [String: Any]?
  private let actionLock = NSLock()
  private var actionHandler: (([String: Any]) -> Void)?
  private var pendingActions: [[String: Any]] = []
  private var deliveredActionKeys: [String] = []
  private let pendingActionsKey = "sagatrail.pending.watch.actions.native"

  private override init() {
    super.init()
    pendingActions = UserDefaults.standard.array(forKey: pendingActionsKey) as? [[String: Any]] ?? []
  }

  func activate() {
    guard WCSession.isSupported() else {
      NSLog("[SagaTrail Watch] Phone connection activation skipped: unsupported")
      return
    }
    let session = WCSession.default
    session.delegate = self
    NSLog("[SagaTrail Watch] Phone connection activating (state: %ld, reachable: %@)",
          session.activationState.rawValue, String(session.isReachable))
    session.activate()
  }

  func setActionHandler(_ handler: @escaping ([String: Any]) -> Void) {
    actionLock.lock()
    actionHandler = handler
    let queued = pendingActions
    pendingActions.removeAll()
    UserDefaults.standard.removeObject(forKey: pendingActionsKey)
    actionLock.unlock()
    NSLog("[SagaTrail Watch] Action handler attached; replaying %ld native actions", queued.count)
    queued.forEach(handler)
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

  var latestHeartRatePayload: [String: Any]? {
    if WCSession.isSupported() {
      cacheHeartRate(from: WCSession.default.receivedApplicationContext)
    }
    latestHeartRateLock.lock()
    defer { latestHeartRateLock.unlock() }
    return cachedLatestHeartRate
  }

  func sendLiveState(_ state: [String: Any], durable: Bool = false) throws {
    NSLog("[SagaTrail Watch] Validating compact live state (keys: %@, durable: %@)",
          state.keys.sorted().joined(separator: ","), String(durable))
    let payload = try validatedLiveState(state)
    let message = try propertyListSafeEnvelope(envelope(type: "liveState", payload: payload))
    send(message, preferApplicationContext: true, durable: durable)
  }

  func publishCanonicalLiveState(_ state: [String: Any]) throws {
    NSLog("[SagaTrail Watch] Validating canonical live state (keys: %@)",
          state.keys.sorted().joined(separator: ","))
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
    if let offRoute = state["offRoute"] as? [String: Any], !validOffRoutePayload(offRoute) {
      throw ProtocolError.invalidOffRoutePayload
    }
    if let weather = state["weather"] as? [String: Any], !validWeatherPayload(weather) {
      throw ProtocolError.invalidWeatherPayload
    }
    if let daylight = state["daylight"] as? [String: Any], !validDaylightPayload(daylight) {
      throw ProtocolError.invalidDaylightPayload
    }
    if let poiStory = state["poiStory"] as? [String: Any], !validPoiStoryPayload(poiStory) {
      throw ProtocolError.invalidPoiStoryPayload
    }
    if let storyAudio = state["storyAudio"] as? [String: Any],
       !validStoryAudioPayload(storyAudio) {
      throw ProtocolError.invalidStoryAudioPayload
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
    if let upcomingGradeChange = state["upcomingGradeChange"] as? [String: Any] {
      watchState["upcomingGradeChange"] = upcomingGradeChange
    }
    if let upcomingSurfaceChange = state["upcomingSurfaceChange"] as? [String: Any] {
      watchState["upcomingSurfaceChange"] = upcomingSurfaceChange
    }
    if let upcomingAttraction = state["upcomingAttraction"] as? [String: Any] {
      watchState["upcomingAttraction"] = upcomingAttraction
    }
    if let safetyCheckin = state["safetyCheckin"] as? [String: Any] {
      watchState["safetyCheckin"] = safetyCheckin
    }
    if let map = state["map"] as? [String: Any] {
      watchState["map"] = map
    }
    if let offRoute = state["offRoute"] as? [String: Any] {
      watchState["offRoute"] = offRoute
    }
    if let weather = state["weather"] as? [String: Any] {
      watchState["weather"] = weather
    }
    if let daylight = state["daylight"] as? [String: Any] {
      watchState["daylight"] = daylight
    }
    if let poiStory = state["poiStory"] as? [String: Any] {
      watchState["poiStory"] = poiStory
    }
    if let storyAudio = state["storyAudio"] as? [String: Any] {
      watchState["storyAudio"] = storyAudio
    } else if let alert,
       let kind = alert["kind"] as? String,
       (kind == "narration" || kind == "discovery"),
       let text = alert["text"] as? String {
      watchState["storyAudio"] = [
        "isPlaying": kind == "narration",
        "text": text,
      ]
    }
    if let language = state["language"] as? String, language.count <= 8 {
      watchState["language"] = language
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
    let durable = state["safetyCheckin"] is [String: Any]
      || status == "sos_requested"
      || (alert?["kind"] as? String) == "safety"
      || (alert?["kind"] as? String) == "sos"
    try sendLiveState(watchState, durable: durable)
    if let alert, let text = alert["text"] as? String, !text.isEmpty {
      let haptic = (alert["haptic"] as? String)
        ?? ((alert["kind"] as? String) == "safety"
          ? "warning"
          : ((alert["kind"] as? String) == "sos" ? "failure" : "click"))
      var watchAlert: [String: Any] = [
        "title": "SagaTrail",
        "body": text,
        "haptic": haptic
      ]
      if alert["action"] as? String == "openPoiStory" {
        watchAlert["action"] = "openPoiStory"
      }
      try sendAlert(watchAlert)
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
    if alert["action"] as? String == "openPoiStory" {
      payload["action"] = "openPoiStory"
    }
    send(
      try propertyListSafeEnvelope(envelope(type: "alert", payload: payload)),
      preferApplicationContext: false,
      durable: true
    )
  }

  private func send(_ message: [String: Any], preferApplicationContext: Bool, durable: Bool = false) {
    guard WCSession.isSupported() else {
      NSLog("[SagaTrail Watch] Send skipped: WatchConnectivity unsupported")
      return
    }
    let session = WCSession.default
    let type = message["type"] as? String ?? "unknown"
    NSLog("[SagaTrail Watch] Sending to Watch (type: %@, durable: %@, context: %@, state: %ld, reachable: %@)",
          type, String(durable), String(preferApplicationContext),
          session.activationState.rawValue, String(session.isReachable))
    if var poiData = poiTransportDiagnostics(for: message) {
      poiData["channel"] = preferApplicationContext ? "applicationContext" : "action"
      poiData["durable"] = durable
      poiData["wcActivated"] = session.activationState == .activated
      poiData["wcReachable"] = session.isReachable
      SagaTrailPhoneRemoteDiagnostics.log("partner POI transport send started", data: poiData)
    }
    var contextUpdated = false
    if durable {
      // Application context is replaceable state, not an action queue. Safety
      // and SOS transitions must also survive a missed direct delivery.
      session.transferUserInfo(message)
      NSLog("[SagaTrail Watch] transferUserInfo queued (type: %@)", type)
    }
    if preferApplicationContext {
      if session.activationState == .activated {
        do {
          try session.updateApplicationContext(message)
          contextUpdated = true
          NSLog("[SagaTrail Watch] application context updated (type: %@)", type)
           if var poiData = poiTransportDiagnostics(for: message) {
             poiData["channel"] = "applicationContext"
             poiData["outcome"] = "updated"
             SagaTrailPhoneRemoteDiagnostics.log("partner POI application context updated", data: poiData)
           }
        } catch {
          NSLog("[SagaTrail Watch] Could not update application context: %@", error.localizedDescription)
        }
      }
      // Keep the latest state persisted for a watch that is not reachable,
      // but do not stop here: when the direct channel is available the watch
      // must receive "active" immediately instead of waiting for a later
      // application-context delivery.
    }
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { error in
        NSLog("[SagaTrail Watch] Direct message failed (type: %@); error: %@", type, error.localizedDescription)
        if var poiData = poiTransportDiagnostics(for: message) {
          poiData["channel"] = "direct"
          poiData["outcome"] = "failed"
          poiData["errorCode"] = (error as NSError).code
          SagaTrailPhoneRemoteDiagnostics.log("partner POI direct message failed", data: poiData)
        }
        // Reachability is only a point-in-time hint. Retain critical state
        // when the direct channel fails.
        if durable || preferApplicationContext {
          session.transferUserInfo(message)
          NSLog("[SagaTrail Watch] transferUserInfo fallback queued (type: %@)", type)
        }
      }
      NSLog("[SagaTrail Watch] Direct message submitted (type: %@)", type)
      if var poiData = poiTransportDiagnostics(for: message) {
        poiData["channel"] = "direct"
        poiData["outcome"] = "submitted"
        SagaTrailPhoneRemoteDiagnostics.log("partner POI direct message submitted", data: poiData)
      }
    } else if !contextUpdated && !durable {
      session.transferUserInfo(message)
      NSLog("[SagaTrail Watch] transferUserInfo fallback queued (not reachable, type: %@)", type)
      if var poiData = poiTransportDiagnostics(for: message) {
        poiData["channel"] = "transferUserInfo"
        poiData["outcome"] = "queued"
        SagaTrailPhoneRemoteDiagnostics.log("partner POI transfer fallback queued", data: poiData)
      }
    }
  }

  private func envelope(type: String, payload: [String: Any]) -> [String: Any] {
    ["v": protocolVersion, "type": type, "timestamp": Int(Date().timeIntervalSince1970 * 1000), "payload": payload]
  }

  private func propertyListSafeEnvelope(_ message: [String: Any]) throws -> [String: Any] {
    guard let sanitized = removingNulls(from: message) as? [String: Any],
          PropertyListSerialization.propertyList(sanitized, isValidFor: .binary) else {
      throw ProtocolError.invalidPropertyListPayload
    }
    return sanitized
  }

  private func removingNulls(from value: Any) -> Any? {
    if value is NSNull {
      return nil
    }
    if let dictionary = value as? [String: Any] {
      var sanitized: [String: Any] = [:]
      for (key, nestedValue) in dictionary {
        if let cleanedValue = removingNulls(from: nestedValue) {
          sanitized[key] = cleanedValue
        }
      }
      return sanitized
    }
    if let array = value as? [Any] {
      return array.compactMap { removingNulls(from: $0) }
    }
    return value
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
    if let offRoute = input["offRoute"] as? [String: Any], !validOffRoutePayload(offRoute) {
      throw ProtocolError.invalidOffRoutePayload
    }
    if let weather = input["weather"] as? [String: Any], !validWeatherPayload(weather) {
      throw ProtocolError.invalidWeatherPayload
    }
    if let daylight = input["daylight"] as? [String: Any], !validDaylightPayload(daylight) {
      throw ProtocolError.invalidDaylightPayload
    }
    if let poiStory = input["poiStory"] as? [String: Any], !validPoiStoryPayload(poiStory) {
      throw ProtocolError.invalidPoiStoryPayload
    }
    guard let updatedAt = input["updatedAt"] as? NSNumber else { throw ProtocolError.missingUpdatedAt }
    var result: [String: Any] = ["updatedAt": updatedAt]
    let fields = ["routeName", "nextInstruction", "navigationDirection", "sessionStatus", "isHiking",
                  "elapsedSeconds", "distanceMeters", "ascentMeters", "steps",
                  "heartRateBpm", "bearingDegrees", "distanceToTurnMeters",
                  "remainingDistanceMeters", "remainingSeconds", "arrivalAtEpochMs",
                   "upcomingNavigations", "plannedAscentMeters", "remainingAscentMeters",
                   "terrainSection", "upcomingGradeChange", "upcomingSurfaceChange",
                   "upcomingAttraction", "safetyCheckin", "map", "language", "storyAudio"]
    let optionalFields = ["offRoute", "weather", "daylight", "poiStory"]
    for field in fields + optionalFields { if let value = input[field] { result[field] = value } }
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

  private func validOffRoutePayload(_ value: [String: Any]) -> Bool {
    guard let distance = (value["distanceM"] as? NSNumber)?.doubleValue else { return false }
    let bearing = (value["bearingToRouteDeg"] as? NSNumber)?.doubleValue
    return distance.isFinite && distance >= 0 && distance <= 100_000 &&
      (bearing == nil || (bearing!.isFinite && bearing! >= 0 && bearing! < 360))
  }

  private func validWeatherPayload(_ value: [String: Any]) -> Bool {
    guard let temperature = (value["temperatureC"] as? NSNumber)?.doubleValue,
          let weatherCode = (value["weatherCode"] as? NSNumber)?.intValue else {
      return false
    }
    guard let wind = (value["windKmh"] as? NSNumber)?.doubleValue,
          let gusts = (value["windGustsKmh"] as? NSNumber)?.doubleValue,
          let precipitation = (value["precipitationMm"] as? NSNumber)?.doubleValue,
          value["isThunderstorm"] is Bool else { return false }
    return temperature.isFinite && temperature >= -90 && temperature <= 70 &&
      weatherCode >= 0 && weatherCode <= 999 &&
      wind.isFinite && wind >= 0 && wind <= 400 &&
      gusts.isFinite && gusts >= 0 && gusts <= 500 &&
      precipitation.isFinite && precipitation >= 0 && precipitation <= 1000
  }

  private func validDaylightPayload(_ value: [String: Any]) -> Bool {
    guard let sunset = (value["sunsetAtEpochMs"] as? NSNumber)?.doubleValue,
          value["arrivalAfterSunset"] is Bool else {
      return false
    }
    return sunset.isFinite && sunset > 0
  }

  private func validPoiStoryPayload(_ value: [String: Any]) -> Bool {
    guard let id = value["id"] as? String,
          !id.isEmpty,
          id.count <= 180,
          let name = value["name"] as? String,
          !name.isEmpty,
          name.count <= 180,
          let text = value["text"] as? String,
          !text.isEmpty,
          text.count <= 8_000 else {
      return false
    }
    if let imageUrl = value["imageUrl"] as? String {
      guard imageUrl.count <= 2_000,
            imageUrl.hasPrefix("https://") || imageUrl.hasPrefix("http://") else {
        return false
      }
    } else if !(value["imageUrl"] == nil || value["imageUrl"] is NSNull) {
      return false
    }
    return !containsCoordinate(name) && !containsCoordinate(text)
  }

  private func validStoryAudioPayload(_ value: [String: Any]) -> Bool {
    guard let isPlaying = value["isPlaying"] as? Bool,
          let text = value["text"] as? String,
          !text.isEmpty,
          text.count <= 2_000 else {
      return false
    }
    return !containsCoordinate(text)
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
    NSLog("[SagaTrail Watch] Phone WC activation completed (state: %ld, reachable: %@, error: %@)",
          activationState.rawValue, String(session.isReachable), error?.localizedDescription ?? "none")
    NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: envelope(
      type: "connectionStatus",
      payload: statusPayload.merging(["activationState": activationState.rawValue]) { _, new in new }
    ))
  }
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
  func sessionReachabilityDidChange(_ session: WCSession) {
    NSLog("[SagaTrail Watch] Phone reachability changed (reachable: %@, state: %ld)",
          String(session.isReachable), session.activationState.rawValue)
    NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: envelope(type: "connectionStatus", payload: statusPayload))
  }
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    NSLog("[SagaTrail Watch] Phone received direct message from Watch (type: %@)",
          message["type"] as? String ?? "unknown")
    logSafetyReceipt(message, transport: "direct")
    receive(message)
  }
  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    NSLog("[SagaTrail Watch] Phone received direct message with reply handler (type: %@)",
          message["type"] as? String ?? "unknown")
    logSafetyReceipt(message, transport: "direct_with_reply")
    let accepted = receive(message)
    replyHandler(["v": protocolVersion, "accepted": accepted])
  }
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    NSLog("[SagaTrail Watch] Phone received transferred user info (type: %@)",
          userInfo["type"] as? String ?? "unknown")
    logSafetyReceipt(userInfo, transport: "durable")
    receive(userInfo)
  }
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    NSLog("[SagaTrail Watch] Phone received application context (type: %@)",
          applicationContext["type"] as? String ?? "unknown")
    receive(applicationContext)
  }

  @discardableResult
  private func receive(_ message: [String: Any]) -> Bool {
    guard (message["v"] as? NSNumber)?.intValue == protocolVersion else {
      NSLog("[SagaTrail Watch] Rejected incoming message: protocol version mismatch")
      logSafetyOutcome(message, message: "safety command rejected", outcome: "protocol_version_mismatch")
      return false
    }
    guard let type = message["type"] as? String,
          ["sosConfirmed", "heartRate", "hikeCommand"].contains(type) else {
      NSLog("[SagaTrail Watch] Rejected incoming message: unsupported type (%@)",
            message["type"] as? String ?? "missing")
      logSafetyOutcome(message, message: "safety command rejected", outcome: "unsupported_type")
      return false
    }
    NSLog("[SagaTrail Watch] Processing incoming phone action (type: %@)", type)
    if type == "heartRate" {
      guard cacheHeartRate(from: message) else {
        NSLog("[SagaTrail Watch] Rejected incoming heart-rate payload")
        return false
      }
      NotificationCenter.default.post(name: .sagaTrailWatchEvent, object: message)
    } else {
      guard claimAction(message) else {
        NSLog("[SagaTrail Watch] Ignored duplicate incoming action (type: %@)", type)
        logSafetyOutcome(message, message: "safety duplicate ignored", outcome: "already_claimed")
        return true
      }
      logSafetyOutcome(message, message: "safety command accepted by phone", outcome: "accepted")
      deliverAction(message)
    }
    return true
  }

  private func claimAction(_ message: [String: Any]) -> Bool {
    let payload = message["payload"] as? [String: Any] ?? [:]
    let timestamp = (message["timestamp"] as? NSNumber)?.int64Value ?? 0
    let requestedAt = (payload["requestedAt"] as? NSNumber)?.int64Value ?? timestamp
    let action = payload["action"] as? String ?? ""
    let key = "\(message["type"] as? String ?? ""):\(action):\(requestedAt)"

    actionLock.lock()
    defer { actionLock.unlock() }
    if deliveredActionKeys.contains(key) {
      NSLog("[SagaTrail Watch] Action already claimed (key: %@)", key)
      return false
    }
    deliveredActionKeys.append(key)
    if deliveredActionKeys.count > 50 {
      deliveredActionKeys.removeFirst(deliveredActionKeys.count - 50)
    }
    return true
  }

  private func deliverAction(_ message: [String: Any]) {
    let type = message["type"] as? String ?? "unknown"
    actionLock.lock()
    if let handler = actionHandler {
      actionLock.unlock()
      NSLog("[SagaTrail Watch] Delivering action to native handler (type: %@)", type)
      logSafetyOutcome(message, message: "safety command delivered to native handler", outcome: "delivered")
      handler(message)
      return
    }
    pendingActions.append(message)
    if pendingActions.count > 20 {
      pendingActions.removeFirst(pendingActions.count - 20)
    }
    UserDefaults.standard.set(pendingActions, forKey: pendingActionsKey)
    actionLock.unlock()
    NSLog("[SagaTrail Watch] Queued action until native handler is ready (type: %@, queueCount: %ld)",
          type, pendingActions.count)
    logSafetyOutcome(message, message: "safety command queued for native handler", outcome: "queued")
  }

  private func safetyCommand(in message: [String: Any]) -> String? {
    guard message["type"] as? String == "hikeCommand",
          let payload = message["payload"] as? [String: Any],
          let command = payload["command"] as? String,
          command == "safetyStart" || command == "safetyConfirm" else {
      return nil
    }
    return command
  }

  private func logSafetyReceipt(_ message: [String: Any], transport: String) {
    guard let command = safetyCommand(in: message) else { return }
    let payload = message["payload"] as? [String: Any] ?? [:]
    SagaTrailPhoneRemoteDiagnostics.log("safety command received on phone", data: [
      "command": command,
      "transport": transport,
      "hasDuration": payload["durationMinutes"] != nil,
    ])
  }

  private func logSafetyOutcome(
    _ watchMessage: [String: Any],
    message: String,
    outcome: String
  ) {
    guard let command = safetyCommand(in: watchMessage) else { return }
    SagaTrailPhoneRemoteDiagnostics.log(message, data: [
      "command": command,
      "outcome": outcome,
    ])
  }

  @discardableResult
  private func cacheHeartRate(from message: [String: Any]) -> Bool {
    guard (message["v"] as? NSNumber)?.intValue == protocolVersion,
          message["type"] as? String == "heartRate",
          let payload = message["payload"] as? [String: Any],
          let bpm = (payload["bpm"] as? NSNumber)?.doubleValue,
          bpm.isFinite,
          bpm > 0,
          bpm <= 500,
          let measuredAt = (payload["measuredAt"] as? NSNumber)?.int64Value,
          measuredAt > 0 else {
      return false
    }
    let latest: [String: Any] = [
      "bpm": bpm,
      "measuredAt": measuredAt,
      "source": "watch"
    ]
    latestHeartRateLock.lock()
    if let previous = (cachedLatestHeartRate?["measuredAt"] as? NSNumber)?.int64Value,
       previous > measuredAt {
      latestHeartRateLock.unlock()
      return true
    }
    cachedLatestHeartRate = latest
    latestHeartRateLock.unlock()
    return true
  }

  private enum ProtocolError: LocalizedError {
    case coordinatesNotAllowed, missingUpdatedAt, invalidAlert, invalidCanonicalState,
         invalidMapPayload, invalidOffRoutePayload, invalidWeatherPayload, invalidDaylightPayload,
          invalidPoiStoryPayload, invalidStoryAudioPayload, invalidPropertyListPayload
    var errorDescription: String? {
      switch self {
      case .coordinatesNotAllowed: return "Coordinates are not allowed in the watch protocol."
      case .missingUpdatedAt: return "HikeLiveState.updatedAt is required."
      case .invalidAlert: return "An alert needs display text and cannot contain coordinates."
      case .invalidCanonicalState: return "The HikeLiveState protocol v1 payload is invalid."
      case .invalidMapPayload: return "The watch map payload is invalid."
      case .invalidOffRoutePayload: return "The watch off-route payload is invalid."
      case .invalidWeatherPayload: return "The watch weather payload is invalid."
      case .invalidDaylightPayload: return "The watch daylight payload is invalid."
      case .invalidPoiStoryPayload: return "The watch POI story payload is invalid."
      case .invalidStoryAudioPayload: return "The watch story audio payload is invalid."
      case .invalidPropertyListPayload: return "The watch payload contains a value that WatchConnectivity cannot transport."
      }
    }
  }
}