import Foundation

/// Shared wire contract. Keep this in sync with the iPhone bridge.
/// `updatedAt` is Unix milliseconds; only the phone writes route progress.
enum SagaTrailWatchProtocol {
  static let version = 1

  struct LiveState {
    let routeName: String
    let nextInstruction: String
    let navigationDirection: String
    let sessionStatus: String
    let isHiking: Bool
    let elapsedSeconds: Double
    let distanceMeters: Double
    let ascentMeters: Double
    let steps: Int
    let heartRateBpm: Double?
    let bearingDegrees: Double?
    let distanceToTurnMeters: Double?
    let remainingDistanceMeters: Double?
    let remainingSeconds: Double?
    let arrivalAtEpochMs: Double?
    let updatedAt: Date

    static func decode(_ dictionary: [String: Any]) -> LiveState? {
      guard let updated = (dictionary["updatedAt"] as? NSNumber)?.doubleValue else { return nil }
      func number(_ key: String) -> Double { (dictionary[key] as? NSNumber)?.doubleValue ?? 0 }
      return LiveState(
        routeName: dictionary["routeName"] as? String ?? "SagaTrail",
        nextInstruction: dictionary["nextInstruction"] as? String ?? "Warte auf Navigation",
        navigationDirection: dictionary["navigationDirection"] as? String ?? "straight",
        sessionStatus: dictionary["sessionStatus"] as? String ?? ((dictionary["isHiking"] as? Bool) == true ? "active" : "preparing"),
        isHiking: (dictionary["isHiking"] as? Bool) ?? false,
        elapsedSeconds: number("elapsedSeconds"), distanceMeters: number("distanceMeters"),
        ascentMeters: number("ascentMeters"), steps: Int(number("steps")),
        heartRateBpm: (dictionary["heartRateBpm"] as? NSNumber)?.doubleValue,
        bearingDegrees: (dictionary["bearingDegrees"] as? NSNumber)?.doubleValue,
        distanceToTurnMeters: (dictionary["distanceToTurnMeters"] as? NSNumber)?.doubleValue,
        remainingDistanceMeters: (dictionary["remainingDistanceMeters"] as? NSNumber)?.doubleValue,
        remainingSeconds: (dictionary["remainingSeconds"] as? NSNumber)?.doubleValue,
        arrivalAtEpochMs: (dictionary["arrivalAtEpochMs"] as? NSNumber)?.doubleValue,
        updatedAt: Date(timeIntervalSince1970: updated / 1000)
      )
    }
  }

  static func envelope(type: String, payload: [String: Any] = [:]) -> [String: Any] {
    ["v": version, "type": type, "timestamp": Int(Date().timeIntervalSince1970 * 1000), "payload": payload]
  }
}