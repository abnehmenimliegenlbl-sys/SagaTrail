import Foundation

/// Shared wire contract. Keep this in sync with the iPhone bridge.
/// `updatedAt` is Unix milliseconds; only the phone writes route progress.
enum SagaTrailWatchProtocol {
  static let version = 1

  static func unixMilliseconds(_ date: Date = Date()) -> Int64 {
    Int64(date.timeIntervalSince1970 * 1000)
  }

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

  struct UpcomingGradeChange {
    let direction: String
    let gradePercent: Double
    let distanceMeters: Double
  }

  struct UpcomingSurfaceChange {
    let surface: String
    let distanceMeters: Double
  }

  struct UpcomingAttraction {
    let name: String
    let distanceMeters: Double
  }

  struct SafetyCheckin {
    let status: String
    let remainingSeconds: Double
    let expiresAtEpochMs: Double?
    let liveLinkActive: Bool
  }

  struct MapPoint {
    let latitude: Double
    let longitude: Double
    let gradeBand: String?
  }

  struct RouteMap {
    let route: [MapPoint]
    let current: MapPoint?
    let gpsFresh: Bool
  }

  struct OffRoute {
    let distanceMeters: Double
    let bearingToRouteDegrees: Double?
  }

  struct Weather {
    let temperatureCelsius: Double
    let weatherCode: Int
    let windKmh: Double
    let windGustsKmh: Double
    let precipitationMm: Double
    let isThunderstorm: Bool
  }

  struct Daylight {
    let sunsetAt: Date
    let arrivalAfterSunset: Bool
  }

  struct PoiStory: Equatable {
    let id: String
    let name: String
    let imageURL: URL?
    let text: String
    let kind: String
  }

  struct StoryAudio: Equatable {
    let isPlaying: Bool
    let text: String
  }

  struct LiveState {
    let sequence: Int64
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
    let upcomingGradeChange: UpcomingGradeChange?
    let upcomingSurfaceChange: UpcomingSurfaceChange?
    let upcomingAttraction: UpcomingAttraction?
    let safetyCheckin: SafetyCheckin?
    let map: RouteMap?
    let offRoute: OffRoute?
    let weather: Weather?
    let daylight: Daylight?
    let poiStory: PoiStory?
    let storyAudio: StoryAudio?
    let language: String
    let updatedAt: Date

    static func decode(_ dictionary: [String: Any]) -> LiveState? {
      func validNumber(
        _ raw: Any?,
        minimum: Double = -Double.greatestFiniteMagnitude,
        maximum: Double = Double.greatestFiniteMagnitude
      ) -> Double? {
        guard let result = (raw as? NSNumber)?.doubleValue,
              result.isFinite,
              result >= minimum,
              result <= maximum else {
          return nil
        }
        return result
      }
      func number(
        _ key: String,
        fallback defaultValue: Double = 0,
        minimum: Double = 0,
        maximum: Double = 1_000_000_000
      ) -> Double? {
        guard let raw = dictionary[key] else { return defaultValue }
        return validNumber(raw, minimum: minimum, maximum: maximum)
      }
      func optionalNumber(
        _ key: String,
        from value: [String: Any],
        minimum: Double = -Double.greatestFiniteMagnitude,
        maximum: Double = Double.greatestFiniteMagnitude
      ) -> Double? {
        guard let raw = value[key] else { return nil }
        return validNumber(raw, minimum: minimum, maximum: maximum)
      }
      guard let updated = validNumber(
              dictionary["updatedAt"],
              minimum: 0,
              maximum: 32_503_680_000_000
            ),
            let elapsedSeconds = number("elapsedSeconds"),
            let distanceMeters = number("distanceMeters"),
            let ascentMeters = number("ascentMeters"),
            let stepsValue = number("steps", maximum: 1_000_000_000),
             let sequenceValue = number("sequence", maximum: 9_000_000_000_000_000),
            stepsValue <= Double(Int.max) else {
        return nil
      }
      let heartRateBpm = optionalNumber(
        "heartRateBpm",
        from: dictionary,
        minimum: 0,
        maximum: 500
      )
      let bearingDegrees = optionalNumber("bearingDegrees", from: dictionary)
      let distanceToTurnMeters = optionalNumber(
        "distanceToTurnMeters",
        from: dictionary,
        minimum: 0,
        maximum: 1_000_000_000
      )
      let remainingDistanceMeters = optionalNumber(
        "remainingDistanceMeters",
        from: dictionary,
        minimum: 0,
        maximum: 1_000_000_000
      )
      let remainingSeconds = optionalNumber(
        "remainingSeconds",
        from: dictionary,
        minimum: 0,
        maximum: 1_000_000_000
      )
      let arrivalAtEpochMs = optionalNumber(
        "arrivalAtEpochMs",
        from: dictionary,
        minimum: 0,
        maximum: 32_503_680_000_000
      )
      let plannedAscentMeters = optionalNumber(
        "plannedAscentMeters",
        from: dictionary,
        minimum: 0,
        maximum: 1_000_000
      )
      let remainingAscentMeters = optionalNumber(
        "remainingAscentMeters",
        from: dictionary,
        minimum: 0,
        maximum: 1_000_000
      )
      func navigationHint(_ value: [String: Any]) -> NavigationHint? {
        guard let direction = value["direction"] as? String,
              direction == "left" || direction == "right" else { return nil }
        return NavigationHint(
          direction: direction,
          bearingDegrees: optionalNumber("bearingDeg", from: value),
          distanceMeters: optionalNumber(
            "distanceM",
            from: value,
            minimum: 0,
            maximum: 1_000_000_000
          )
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
              let startsInMeters = (value["startsInM"] as? NSNumber)?.doubleValue,
              gradePercent.isFinite,
              gradePercent >= -1_000,
              gradePercent <= 1_000,
              remainingMeters.isFinite,
              remainingMeters >= 0,
              remainingMeters <= 1_000_000_000,
              startsInMeters.isFinite,
              startsInMeters >= 0,
              startsInMeters <= 1_000_000_000 else {
          return nil
        }
        return TerrainSection(
          direction: direction,
          gradePercent: gradePercent,
          remainingMeters: remainingMeters,
          startsInMeters: startsInMeters
        )
      }()
      let upcomingGradeChange: UpcomingGradeChange? = {
        guard let value = dictionary["upcomingGradeChange"] as? [String: Any],
              let direction = value["direction"] as? String,
              direction == "up" || direction == "down",
              let gradePercent = optionalNumber(
                "gradePct",
                from: value,
                minimum: 0,
                maximum: 1_000
              ),
              let distanceMeters = optionalNumber(
                "distanceM",
                from: value,
                minimum: 0,
                maximum: 1_000_000_000
              ) else {
          return nil
        }
        return UpcomingGradeChange(
          direction: direction,
          gradePercent: gradePercent,
          distanceMeters: distanceMeters
        )
      }()
      let upcomingSurfaceChange: UpcomingSurfaceChange? = {
        guard let value = dictionary["upcomingSurfaceChange"] as? [String: Any],
              let surface = value["surface"] as? String,
              ["asphalt", "kies", "fels", "holz", "naturweg"].contains(surface),
              let distanceMeters = optionalNumber(
                "distanceM",
                from: value,
                minimum: 0,
                maximum: 1_000_000_000
              ) else {
          return nil
        }
        return UpcomingSurfaceChange(surface: surface, distanceMeters: distanceMeters)
      }()
      let upcomingAttraction: UpcomingAttraction? = {
        guard let value = dictionary["upcomingAttraction"] as? [String: Any],
              let name = value["name"] as? String,
              !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              name.count <= 180,
              let distanceMeters = optionalNumber(
                "distanceM",
                from: value,
                minimum: 0,
                maximum: 1_000_000_000
              ) else {
          return nil
        }
        return UpcomingAttraction(name: name, distanceMeters: distanceMeters)
      }()
      let safetyCheckin: SafetyCheckin? = {
        guard let value = dictionary["safetyCheckin"] as? [String: Any],
              let status = value["status"] as? String,
              status == "idle" || status == "active" || status == "overdue",
              let remainingSeconds = (value["remainingSec"] as? NSNumber)?.doubleValue,
              remainingSeconds.isFinite,
              remainingSeconds >= 0,
              remainingSeconds <= 1_000_000_000,
              let liveLinkActive = value["liveLinkActive"] as? Bool else {
          return nil
        }
        let expiresAtEpochMs: Double? = {
          guard let raw = value["expiresAtEpochMs"] else { return nil }
          return validNumber(raw, minimum: 1, maximum: 100_000_000_000_000)
        }()
        return SafetyCheckin(
          status: status,
          remainingSeconds: remainingSeconds,
          expiresAtEpochMs: expiresAtEpochMs,
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
          let gradeBand = raw["gradeBand"] as? String
          guard gradeBand == nil ||
                gradeBand == "green" ||
                gradeBand == "yellow" ||
                gradeBand == "orange" ||
                gradeBand == "red" else {
            return nil
          }
          return MapPoint(latitude: latitude, longitude: longitude, gradeBand: gradeBand)
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
              distanceMeters.isFinite,
              distanceMeters <= 1_000_000_000 else {
          return nil
        }
        return OffRoute(
          distanceMeters: distanceMeters,
          bearingToRouteDegrees: optionalNumber("bearingToRouteDeg", from: value)
        )
      }()
      let weather: Weather? = {
        guard let value = dictionary["weather"] as? [String: Any],
              let temperatureCelsius = (value["temperatureC"] as? NSNumber)?.doubleValue,
              let weatherCode = (value["weatherCode"] as? NSNumber)?.intValue,
              let windKmh = (value["windKmh"] as? NSNumber)?.doubleValue,
              let windGustsKmh = (value["windGustsKmh"] as? NSNumber)?.doubleValue,
              let precipitationMm = (value["precipitationMm"] as? NSNumber)?.doubleValue,
              let isThunderstorm = value["isThunderstorm"] as? Bool,
              temperatureCelsius.isFinite,
              temperatureCelsius >= -150,
              temperatureCelsius <= 150,
              windKmh.isFinite,
              windKmh >= 0,
              windKmh <= 1_000,
              windGustsKmh.isFinite,
              windGustsKmh >= 0,
              windGustsKmh <= 1_000,
              precipitationMm.isFinite,
              precipitationMm >= 0,
              precipitationMm <= 10_000 else {
          return nil
        }
        return Weather(
          temperatureCelsius: temperatureCelsius,
          weatherCode: weatherCode,
          windKmh: windKmh,
          windGustsKmh: windGustsKmh,
          precipitationMm: precipitationMm,
          isThunderstorm: isThunderstorm
        )
      }()
      let daylight: Daylight? = {
        guard let value = dictionary["daylight"] as? [String: Any],
              let sunsetAtEpochMs = (value["sunsetAtEpochMs"] as? NSNumber)?.doubleValue,
              sunsetAtEpochMs.isFinite,
              sunsetAtEpochMs >= 0,
              sunsetAtEpochMs <= 32_503_680_000_000,
              let arrivalAfterSunset = value["arrivalAfterSunset"] as? Bool else {
          return nil
        }
        return Daylight(
          sunsetAt: Date(timeIntervalSince1970: sunsetAtEpochMs / 1000),
          arrivalAfterSunset: arrivalAfterSunset
        )
      }()
      let poiStory: PoiStory? = {
        guard let value = dictionary["poiStory"] as? [String: Any],
              let id = value["id"] as? String,
              !id.isEmpty,
              id.count <= 180,
              let name = value["name"] as? String,
              !name.isEmpty,
              name.count <= 180,
              let text = value["text"] as? String,
              !text.isEmpty,
              text.count <= 8_000 else {
          return nil
        }
        let imageURL = (value["imageUrl"] as? String).flatMap(URL.init(string:))
        let kind = value["kind"] as? String == "partner" ? "partner" : "poi"
        return PoiStory(id: id, name: name, imageURL: imageURL, text: text, kind: kind)
      }()
      let storyAudio: StoryAudio? = {
        guard let value = dictionary["storyAudio"] as? [String: Any],
              let isPlaying = value["isPlaying"] as? Bool,
              let text = value["text"] as? String,
              !text.isEmpty else {
          return nil
        }
        return StoryAudio(isPlaying: isPlaying, text: text)
      }()
      let sessionStatus = dictionary["sessionStatus"] as? String
        ?? ((dictionary["isHiking"] as? Bool) == true ? "active" : "preparing")
      let isHiking = (dictionary["isHiking"] as? Bool) ?? (sessionStatus == "active")
      return LiveState(
        sequence: Int64(sequenceValue.rounded(.towardZero)),
        routeName: dictionary["routeName"] as? String ?? "SagaTrail",
        nextInstruction: dictionary["nextInstruction"] as? String ?? "Warte auf Navigation",
        navigationDirection: dictionary["navigationDirection"] as? String ?? "straight",
        sessionStatus: sessionStatus,
        isHiking: isHiking,
        elapsedSeconds: elapsedSeconds, distanceMeters: distanceMeters,
        ascentMeters: ascentMeters, steps: Int(stepsValue.rounded(.towardZero)),
        heartRateBpm: heartRateBpm,
        bearingDegrees: bearingDegrees,
        distanceToTurnMeters: distanceToTurnMeters,
        remainingDistanceMeters: remainingDistanceMeters,
        remainingSeconds: remainingSeconds,
        arrivalAtEpochMs: arrivalAtEpochMs,
        upcomingNavigations: upcomingNavigations,
        plannedAscentMeters: plannedAscentMeters,
        remainingAscentMeters: remainingAscentMeters,
        terrainSection: terrainSection,
        upcomingGradeChange: upcomingGradeChange,
        upcomingSurfaceChange: upcomingSurfaceChange,
        upcomingAttraction: upcomingAttraction,
        safetyCheckin: safetyCheckin,
        map: map,
        offRoute: offRoute,
        weather: weather,
        daylight: daylight,
        poiStory: poiStory,
        storyAudio: storyAudio,
        language: dictionary["language"] as? String ?? "de",
        updatedAt: Date(timeIntervalSince1970: updated / 1000)
      )
    }
  }

  static func envelope(type: String, payload: [String: Any] = [:]) -> [String: Any] {
    ["v": version, "type": type, "timestamp": unixMilliseconds(), "payload": payload]
  }
}