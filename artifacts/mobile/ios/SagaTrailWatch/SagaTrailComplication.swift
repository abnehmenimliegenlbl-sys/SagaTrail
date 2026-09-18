import ClockKit
import Foundation
import UIKit

/// Small, glanceable route status for the active watch face.
final class ComplicationController: NSObject, CLKComplicationDataSource {
  private static let snapshotKey = "sagatrail.complication.snapshot"
  private static let brandRed = UIColor(red: 204 / 255, green: 0, blue: 0, alpha: 1)

  static func reload() {
    let server = CLKComplicationServer.sharedInstance()
    for complication in server.activeComplications ?? [] {
      server.reloadTimeline(for: complication)
    }
  }

  func getCurrentTimelineEntry(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void
  ) {
    handler(CLKComplicationTimelineEntry(
      date: Date(),
      complicationTemplate: template(for: complication.family)
    ))
  }

  func getPlaceholderTemplate(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTemplate?) -> Void
  ) {
    handler(template(for: complication.family))
  }

  func getSupportedTimeTravelDirections(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTimeTravelDirections) -> Void
  ) {
    handler([])
  }

  func getTimelineStartDate(
    for complication: CLKComplication,
    withHandler handler: @escaping (Date?) -> Void
  ) {
    handler(Date())
  }

  func getTimelineEndDate(
    for complication: CLKComplication,
    withHandler handler: @escaping (Date?) -> Void
  ) {
    handler(nil)
  }

  func getPrivacyBehavior(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void
  ) {
    handler(.showOnLockScreen)
  }

  private func template(for family: CLKComplicationFamily) -> CLKComplicationTemplate {
    let snapshot = UserDefaults.standard.dictionary(forKey: Self.snapshotKey) ?? [:]
    let direction = snapshot["direction"] as? String ?? "SagaTrail"
    let turnDistance = snapshot["turnDistance"] as? String ?? "—"
    let remaining = snapshot["remaining"] as? String ?? "Wanderung"
    let active = snapshot["active"] as? Bool ?? false
    let gpsFresh = snapshot["gpsFresh"] as? Bool ?? false
    let offRoute = snapshot["offRoute"] as? Bool ?? false
    let arrivalAfterSunset = snapshot["arrivalAfterSunset"] as? Bool ?? false
    let copy = WatchCopy(language: snapshot["language"] as? String ?? Locale.current.identifier)
    let noGPS = snapshot["noGPS"] as? String ?? copy.t("complicationNoGPS")
    let pause = snapshot["pause"] as? String ?? copy.t("complicationPause")
    let wait = snapshot["wait"] as? String ?? copy.t("complicationWait")
    let back = snapshot["back"] as? String ?? copy.t("complicationBack")
    let waitSignal = snapshot["waitSignal"] as? String ?? copy.t("complicationWaitSignal")
    let afterSunset = snapshot["afterSunset"] as? String ?? copy.t("afterSunset")
    let temperature = snapshot["weatherTemperature"] as? Double
    let status = active && !gpsFresh ? noGPS : (offRoute ? direction : (active ? direction : pause))

    let line1 = brandText(status)
    let line2 = brandText(active && !gpsFresh ? wait : (offRoute ? back : turnDistance))
    let temperatureText = temperature.flatMap { value -> String? in
      guard value.isFinite, value >= -150, value <= 150 else { return nil }
      return "\(Int(value.rounded()))° · \(remaining)"
    }
    let body = brandText(
      active && !gpsFresh
        ? waitSignal
        : arrivalAfterSunset
        ? afterSunset
        : temperatureText ?? remaining
    )

    switch family {
    case .modularSmall:
      return CLKComplicationTemplateModularSmallStackText(
        line1TextProvider: line1,
        line2TextProvider: line2
      )
    case .modularLarge:
      return CLKComplicationTemplateModularLargeStandardBody(
        headerTextProvider: brandText("SagaTrail"),
        body1TextProvider: line1,
        body2TextProvider: body
      )
    case .utilitarianSmall:
      return CLKComplicationTemplateUtilitarianSmallSquare(
        imageProvider: CLKImageProvider(
          onePieceImage: symbolImage(
            direction: direction,
            active: active,
            gpsFresh: gpsFresh,
            offRoute: offRoute
          )
        )
      )
    case .utilitarianSmallFlat:
      return CLKComplicationTemplateUtilitarianSmallFlat(textProvider: line2)
    case .circularSmall:
      return CLKComplicationTemplateCircularSmallSimpleImage(
        imageProvider: CLKImageProvider(
          onePieceImage: symbolImage(
            direction: direction,
            active: active,
            gpsFresh: gpsFresh,
            offRoute: offRoute
          )
        )
      )
    case .graphicCircular:
      return CLKComplicationTemplateGraphicCircularImage(
        imageProvider: CLKFullColorImageProvider(
          fullColorImage: symbolImage(
            direction: direction,
            active: active,
            gpsFresh: gpsFresh,
            offRoute: offRoute
          )
        )
      )
    case .graphicRectangular:
      return CLKComplicationTemplateGraphicRectangularStandardBody(
        headerTextProvider: brandText("SagaTrail"),
        body1TextProvider: line1,
        body2TextProvider: body
      )
    default:
      return CLKComplicationTemplateModularSmallStackText(
        line1TextProvider: line1,
        line2TextProvider: line2
      )
    }
  }

  private func symbolImage(
    direction: String,
    active: Bool,
    gpsFresh: Bool,
    offRoute: Bool
  ) -> UIImage {
    let symbolName: String
    if active && !gpsFresh {
      symbolName = "location.slash"
    } else if offRoute {
      symbolName = "exclamationmark.triangle.fill"
    } else if !active {
      symbolName = "pause.fill"
    } else if direction.lowercased().contains("left") ||
              direction.lowercased().contains("links") {
      symbolName = "arrow.turn.up.left"
    } else if direction.lowercased().contains("right") ||
              direction.lowercased().contains("rechts") {
      symbolName = "arrow.turn.up.right"
    } else {
      symbolName = "figure.walk"
    }

    let image = UIImage(systemName: symbolName)
      ?? UIImage(systemName: "figure.walk")
      ?? UIImage()
    return image.withTintColor(Self.brandRed, renderingMode: .alwaysOriginal)
  }

  private func brandText(_ text: String) -> CLKSimpleTextProvider {
    let provider = CLKSimpleTextProvider(text: text)
    provider.tintColor = Self.brandRed
    return provider
  }
}