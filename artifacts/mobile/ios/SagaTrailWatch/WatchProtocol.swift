import Foundation

/// Shared wire contract. Keep this in sync with the iPhone bridge.
/// `updatedAt` is Unix milliseconds; only the phone writes route progress.
enum SagaTrailWatchProtocol {
  static let version = 1

  struct NavigationHint {
    let direction: String
    let bearingDegrees: Double?
    let distanceMeters: Double?

  }

  struct TerrainSection {
    let direction: String
    let gradePercent: Double
    let remainingMeters: Double
    let startsInMeters: Double
  }

  struct SafetyCheckin {
    let status: String
    let remainingSeconds: Double
    let liveLinkActive: Bool
  }

  struct MapPoint {
    let latitude: Double
    let longitude: Double
  }

  struct RouteMap {
    let route: [MapPoint]
    let current: MapPoint?
    let gpsFresh: Bool
  }

  struct OffRoute {
    let distanceMeters: Double
  }

  struct Weather {
    let temperatureCelsius: Double
    let weatherCode: Int
  }

  struct Daylight {
    let sunsetAt: Date
    let arrivalAfterSunset: Bool
  }

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
    let upcomingNavigations: [NavigationHint]
    let plannedAscentMeters: Double?
    let remainingAscentMeters: Double?
    let terrainSection: TerrainSection?
    let safetyCheckin: SafetyCheckin?
    let map: RouteMap?
    let offRoute: OffRoute?
    let weather: Weather?
    let daylight: Daylight?
    let updatedAt: Date

    static func decode(_ dictionary: [String: Any]) -> LiveState? {
      guard let updated = (dictionary["updatedAt"] as? NSNumber)?.doubleValue else { return nil }
      func number(_ key: String) -> Double { (dictionary[key] as? NSNumber)?.doubleValue ?? 0 }
      func optionalNumber(_ key: String, from value: [String: Any]) -> Double? {
        (value[key] as? NSNumber)?.doubleValue
      }
      func navigationHint(_ value: [String: Any]) -> NavigationHint? {
        guard let direction = value["direction"] as? String,
              direction == "left" || direction == "right" else { return nil }
        return NavigationHint(
          direction: direction,
          bearingDegrees: optionalNumber("bearingDeg", from: value),
          distanceMeters: optionalNumber("distanceM", from: value)
        )
      }
      let upcomingNavigations = (dictionary["upcomingNavigations"] as? [[String: Any]] ?? [])
        .compactMap { navigationHint($0) }
      let terrainSection: TerrainSection? = {
        guard let value = dictionary["terrainSection"] as? [String: Any],
              let direction = value["direction"] as? String,
              direction == "up" || direction == "down",
              let gradePercent = (value["gradePct"] as? NSNumber)?.doubleValue,
              let remainingMeters = (value["remainingM"] as? NSNumber)?.doubleValue,
              let startsInMeters = (value["startsInM"] as? NSNumber)?.doubleValue else {
          return nil
        }
        return TerrainSection(
          direction: direction,
          gradePercent: gradePercent,
          remainingMeters: remainingMeters,
          startsInMeters: startsInMeters
        )
      }()
      let safetyCheckin: SafetyCheckin? = {
        guard let value = dictionary["safetyCheckin"] as? [String: Any],
              let status = value["status"] as? String,
              status == "idle" || status == "active" || status == "overdue",
              let remainingSeconds = (value["remainingSec"] as? NSNumber)?.doubleValue,
              remainingSeconds >= 0,
              let liveLinkActive = value["liveLinkActive"] as? Bool else {
          return nil
        }
        return SafetyCheckin(
          status: status,
          remainingSeconds: remainingSeconds,
          liveLinkActive: liveLinkActive
        )
      }()
      let map: RouteMap? = {
        guard let value = dictionary["map"] as? [String: Any],
              let rawRoute = value["route"] as? [[String: Any]],
              rawRoute.count >= 2,
              rawRoute.count <= 120,
              let gpsFresh = value["gpsFresh"] as? Bool else {
          return nil
        }
        func point(_ raw: [String: Any]) -> MapPoint? {
          guard let latitude = (raw["lat"] as? NSNumber)?.doubleValue,
                let longitude = (raw["lng"] as? NSNumber)?.doubleValue,
                latitude.isFinite,
                latitude >= -90,
                latitude <= 90,
                longitude.isFinite,
                longitude >= -180,
                longitude <= 180 else {
            return nil
          }
          return MapPoint(latitude: latitude, longitude: longitude)
        }
        let route = rawRoute.compactMap(point)
        guard route.count == rawRoute.count else { return nil }
        let current: MapPoint? = {
          guard let rawCurrent = value["current"] as? [String: Any] else { return nil }
          return point(rawCurrent)
        }()
        return RouteMap(route: route, current: current, gpsFresh: gpsFresh)
      }()
      let offRoute: OffRoute? = {
        guard let value = dictionary["offRoute"] as? [String: Any],
              let distanceMeters = (value["distanceM"] as? NSNumber)?.doubleValue,
              distanceMeters >= 0,
              distanceMeters.isFinite else {
          return nil
        }
        return OffRoute(distanceMeters: distanceMeters)
      }()
      let weather: Weather? = {
        guard let value = dictionary["weather"] as? [String: Any],
              let temperatureCelsius = (value["temperatureC"] as? NSNumber)?.doubleValue,
              let weatherCode = (value["weatherCode"] as? NSNumber)?.intValue,
              temperatureCelsius.isFinite else {
          return nil
        }
        return Weather(temperatureCelsius: temperatureCelsius, weatherCode: weatherCode)
      }()
      let daylight: Daylight? = {
        guard let value = dictionary["daylight"] as? [String: Any],
              let sunsetAtEpochMs = (value["sunsetAtEpochMs"] as? NSNumber)?.doubleValue,
              let arrivalAfterSunset = value["arrivalAfterSunset"] as? Bool else {
          return nil
        }
        return Daylight(
          sunsetAt: Date(timeIntervalSince1970: sunsetAtEpochMs / 1000),
          arrivalAfterSunset: arrivalAfterSunset
        )
      }()
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
        upcomingNavigations: upcomingNavigations,
        plannedAscentMeters: (dictionary["plannedAscentMeters"] as? NSNumber)?.doubleValue,
        remainingAscentMeters: (dictionary["remainingAscentMeters"] as? NSNumber)?.doubleValue,
        terrainSection: terrainSection,
        safetyCheckin: safetyCheckin,
        map: map,
        offRoute: offRoute,
        weather: weather,
        daylight: daylight,
        updatedAt: Date(timeIntervalSince1970: updated / 1000)
      )
    }
  }

  static func envelope(type: String, payload: [String: Any] = [:]) -> [String: Any] {
    ["v": version, "type": type, "timestamp": Int(Date().timeIntervalSince1970 * 1000), "payload": payload]
  }
}