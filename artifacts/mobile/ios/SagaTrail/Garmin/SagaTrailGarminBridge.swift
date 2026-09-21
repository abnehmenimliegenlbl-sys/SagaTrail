import Foundation
import ConnectIQ

/// Real iPhone transport for the standalone SagaTrail Connect IQ app.
///
/// Garmin's iOS SDK requires the user to select the devices that the
/// companion may access in Garmin Connect Mobile. Until that selection and a
/// Bluetooth connection exist, this class reports disconnected and refuses to
/// send snapshots.
final class SagaTrailGarminConnection: NSObject, IQDeviceEventDelegate, IQAppMessageDelegate {
  static let shared = SagaTrailGarminConnection()

  private let applicationID = "1f264eae-ef0d-45ad-9548-ee64460b7d7f"
  private let urlScheme = "sagatrail-connectiq"
  private var initialized = false
  private var devices: [IQDevice] = []
  private var activeDevice: IQDevice?
  private var lastError: String?

  private override init() {
    super.init()
  }

  func activate() {
    guard !initialized else {
      refreshActiveDevice()
      return
    }
    initialized = true
    ConnectIQ.sharedInstance().initialize(
      withUrlScheme: urlScheme,
      uiOverrideDelegate: nil,
      stateRestorationIdentifier: urlScheme
    )
    emitStatus()
  }

  func selectDevice() {
    activate()
    ConnectIQ.sharedInstance().showDeviceSelection()
  }

  /// Handles the callback URL returned by Garmin Connect Mobile after device
  /// selection. Returns true only for SagaTrail's own scheme.
  func handle(_ url: URL) -> Bool {
    guard url.scheme == urlScheme else { return false }
    let selected = ConnectIQ.sharedInstance().parseDeviceSelectionResponse(from: url)
    devices = selected?.compactMap { $0 as? IQDevice } ?? []
    devices.forEach(register)
    refreshActiveDevice()
    return true
  }

  var statusPayload: [String: Any] {
    [
      "platform": "ios",
      "sdkReady": initialized,
      "connected": activeDevice.map {
        ConnectIQ.sharedInstance().getDeviceStatus($0) == .connected
      } ?? false,
      "deviceName": activeDevice?.friendlyName ?? NSNull(),
      "error": lastError ?? NSNull(),
      "bridge": "connectIqMobile"
    ]
  }

  func sendLiveState(_ canonical: [String: Any]) {
    activate()
    guard let payload = garminPayload(from: canonical) else {
      lastError = "Invalid canonical hike state"
      emitStatus()
      return
    }
    guard let device = connectedDevice() else {
      lastError = "No connected Garmin device"
      emitStatus()
      return
    }

    guard let uuid = UUID(uuidString: applicationID),
          let app = IQApp(uuid: uuid, store: nil, device: device) else {
      lastError = "Invalid Connect IQ application id"
      emitStatus()
      return
    }

    ConnectIQ.sharedInstance().sendMessage(
      payload,
      to: app,
      progress: nil
    ) { [weak self] result in
      guard let self else { return }
      if result == .success {
        self.lastError = nil
      } else {
        self.lastError = NSStringFromSendMessageResult(result)
      }
      self.emitStatus()
    }
  }

  func deviceStatusChanged(_ device: IQDevice, status: IQDeviceStatus) {
    if status == .connected {
      activeDevice = device
      registerAppEvents(for: device)
    } else if activeDevice?.uuid == device.uuid {
      activeDevice = nil
    }
    emitStatus()
  }

  func deviceCharacteristicsDiscovered(_ device: IQDevice) {
    if ConnectIQ.sharedInstance().getDeviceStatus(device) == .connected {
      activeDevice = device
      registerAppEvents(for: device)
    }
    emitStatus()
  }

  func receivedMessage(_ message: Any, from app: IQApp) {
    guard let dictionary = message as? [String: Any],
          (dictionary["protocolVersion"] as? NSNumber)?.intValue == 1 else {
      return
    }
    let type = dictionary["type"] as? String
    if type == "heartRate",
       let bpm = (dictionary["bpm"] as? NSNumber)?.doubleValue,
       bpm > 0 {
      NotificationCenter.default.post(
        name: .sagaTrailGarminEvent,
        object: [
          "type": "heartRate",
          "payload": [
            "bpm": bpm,
            "measuredAt": dictionary["measuredAt"] ?? Int(Date().timeIntervalSince1970 * 1000),
            "source": "garmin"
          ]
        ] as [String: Any]
      )
      return
    }
    if type == "hikeCommand",
       let command = dictionary["command"] as? String,
       ["start", "pause", "resume", "safetyStart", "safetyConfirm"].contains(command) {
      var payload: [String: Any] = [
        "command": command,
        "requestedAt": dictionary["requestedAt"] ?? Int(Date().timeIntervalSince1970 * 1000)
      ]
      if let duration = (dictionary["durationMinutes"] as? NSNumber)?.intValue,
         [30, 60, 120].contains(duration) {
        payload["durationMinutes"] = duration
      }
      NotificationCenter.default.post(
        name: .sagaTrailGarminEvent,
        object: ["type": "hikeCommand", "payload": payload] as [String: Any]
      )
      return
    }
    guard type == "sosRequest" else { return }
    NotificationCenter.default.post(
      name: .sagaTrailGarminEvent,
      object: [
        "type": "sosRequest",
        "payload": [
          "requestedAt": Int(Date().timeIntervalSince1970 * 1000),
          "requestId": dictionary["requestId"] ?? NSNull(),
          "source": "garmin_connect_iq"
        ]
      ] as [String: Any]
    )
  }

  private func register(_ device: IQDevice) {
    ConnectIQ.sharedInstance().register(forDeviceEvents: device, delegate: self)
    refreshStatus(for: device)
  }

  private func registerAppEvents(for device: IQDevice) {
    guard let uuid = UUID(uuidString: applicationID),
          let app = IQApp(uuid: uuid, store: nil, device: device) else {
      return
    }
    ConnectIQ.sharedInstance().unregister(forAppMessages: app, delegate: self)
    ConnectIQ.sharedInstance().register(forAppMessages: app, delegate: self)
  }

  private func refreshStatus(for device: IQDevice) {
    let status = ConnectIQ.sharedInstance().getDeviceStatus(device)
    if status == .connected {
      activeDevice = device
      registerAppEvents(for: device)
    }
  }

  private func refreshActiveDevice() {
    devices.forEach(refreshStatus)
    if activeDevice != nil && connectedDevice() == nil {
      activeDevice = nil
    }
    emitStatus()
  }

  private func connectedDevice() -> IQDevice? {
    guard let activeDevice,
          ConnectIQ.sharedInstance().getDeviceStatus(activeDevice) == .connected else {
      return nil
    }
    return activeDevice
  }

  private func emitStatus() {
    NotificationCenter.default.post(
      name: .sagaTrailGarminEvent,
      object: [
        "type": "status",
        "payload": statusPayload
      ] as [String: Any]
    )
  }

  private func garminPayload(from canonical: [String: Any]) -> [String: Any]? {
    guard (canonical["version"] as? NSNumber)?.intValue == 1,
          canonical["sessionStatus"] as? String != nil,
          canonical["gpsFreshness"] as? String != nil else {
      return nil
    }
    let navigation = canonical["nextNavigation"] as? [String: Any]
    let heartRate = canonical["heartRate"] as? [String: Any]
    let alert = canonical["activeAlert"] as? [String: Any]
    let timestamp = (canonical["timestamp"] as? NSNumber)?.doubleValue ?? Date().timeIntervalSince1970 * 1000
    let sessionStatus = canonical["sessionStatus"] as? String ?? "preparing"
    let nextDistanceM = (navigation?["distanceM"] as? NSNumber)?.doubleValue
      ?? (canonical["remainingDistanceM"] as? NSNumber)?.doubleValue
      ?? 0
    let direction = navigation?["direction"] as? String ?? "none"
    let nextInstruction = (alert?["text"] as? String)
      ?? (direction == "none" ? "Continue on route" : "Turn \(direction)")
    let acknowledgement = (canonical["sosAcknowledgement"] as? String)
      .flatMap { ($0 == "acknowledged" || $0 == "failed") ? $0 : nil } ?? "none"
    var payload: [String: Any] = [
      "protocolVersion": 1,
      "type": "hikeLiveState",
      "bridge": "connectIqMobile",
      "companionStatus": connectedDevice() == nil ? "disconnected" : "connected",
      "updatedAtMs": timestamp,
      "direction": direction,
      "sessionStatus": sessionStatus,
      "nextInstruction": nextInstruction,
      "remainingKm": nextDistanceM / 1000,
      "hasFreshGps": (canonical["gpsFreshness"] as? String) == "fresh",
      "sosAcknowledgement": acknowledgement
    ]
    if let heading = navigation?["bearingDeg"] as? NSNumber { payload["heading"] = heading }
    if let bpm = heartRate?["bpm"] as? NSNumber { payload["heartRateBpm"] = bpm }
    if let value = canonical["elapsedSec"] as? NSNumber { payload["elapsedS"] = value }
    if let value = canonical["walkedDistanceM"] as? NSNumber { payload["totalDistanceM"] = value }
    if let value = canonical["ascentM"] as? NSNumber { payload["ascentM"] = value }
    if let value = canonical["steps"] as? NSNumber { payload["steps"] = value }
    if let value = canonical["remainingDistanceM"] as? NSNumber { payload["remainingDistanceM"] = value }
    if let value = canonical["remainingSeconds"] as? NSNumber { payload["remainingSeconds"] = value }
    if let value = canonical["arrivalAtEpochMs"] as? NSNumber { payload["arrivalAtEpochMs"] = value }
    if let value = canonical["plannedAscentM"] as? NSNumber { payload["plannedAscentM"] = value }
    if let value = canonical["remainingAscentM"] as? NSNumber { payload["remainingAscentM"] = value }
    if let value = canonical["upcomingNavigations"] as? [[String: Any]] {
      payload["upcomingNavigations"] = value.map { navigation in
        var item: [String: Any] = ["direction": navigation["direction"] ?? "right"]
        if let heading = navigation["bearingDeg"] { item["heading"] = heading }
        if let distance = navigation["distanceM"] { item["distanceM"] = distance }
        return item
      }
    }
    if let value = canonical["terrainSection"] as? [String: Any] { payload["terrainSection"] = value }
    if let value = canonical["safetyCheckin"] as? [String: Any] { payload["safetyCheckin"] = value }
    if let value = canonical["offRoute"] as? [String: Any] { payload["offRoute"] = value }
    if let value = canonical["weather"] as? [String: Any] { payload["weather"] = value }
    if let value = canonical["daylight"] as? [String: Any] { payload["daylight"] = value }
    if let value = canonical["language"] as? String, value.count <= 8 { payload["language"] = value }
    payload["freshnessS"] = max(0, Date().timeIntervalSince1970 * 1000 - timestamp) / 1000
    if let kind = alert?["kind"] as? String, let text = alert?["text"] as? String {
      if kind == "safety" { payload["safetyText"] = text }
      if kind == "narration" { payload["narrationText"] = text }
      payload["alertKind"] = kind
      payload["alertText"] = text
    }
    return payload
  }
}

extension Notification.Name {
  static let sagaTrailGarminEvent = Notification.Name("SagaTrailGarminEvent")
}