using Toybox.Graphics as Graphics;
using Toybox.SensorHistory as SensorHistory;
using Toybox.WatchUi as WatchUi;

const HORIZON_RED = 0xCC0000;
const HORIZON_GREEN = 0x1C9B57;
const HORIZON_PAPER = 0xF4F3F0;
const HORIZON_INK = 0x171719;
const HORIZON_MID = 0x777777;
const HORIZON_LIGHT = 0xC7C7C3;

class SagaTrailHorizonView extends WatchUi.View {
    var app;
    var confirmSos = false;
    var page = 0;

    function initialize(appRef) {
        View.initialize();
        app = appRef;
    }

    function setSosConfirmation(value) {
        confirmSos = value;
        requestUpdate();
    }

    function changePage(delta) {
        page += delta;
        if (page < 0) {
            page = 3;
        } else if (page > 3) {
            page = 0;
        }
        requestUpdate();
    }

    function onUpdate(dc) {
        var state = app.getLiveState();
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        dc.clear();

        drawHeader(dc, state);
        if (page == 0) {
            drawNavigation(dc, state);
        } else if (page == 1) {
            drawStatus(dc, state);
        } else if (page == 2) {
            drawSafety(dc, state);
        } else {
            drawStory(dc, state);
        }

        var sos = app.getSosState();
        if (confirmSos) {
            footer(dc, "SELECT: SOS SENDEN", HORIZON_RED);
        } else if (sos == "pending") {
            footer(dc, "SOS WARTET AUF TELEFON", HORIZON_RED);
        } else if (sos == "failed") {
            footer(dc, "SOS FEHLER", HORIZON_RED);
        } else if (sos == "acknowledged") {
            footer(dc, "SOS BESTAETIGT", HORIZON_GREEN);
        } else {
            footer(dc, "HOCH / RUNTER", HORIZON_MID);
        }
    }

    function drawNavigation(dc, state) {
        if (value(state, :sessionStatus, "") == "finished") {
            drawCompletion(dc, state);
            return;
        }

        if (!app.isPhoneCompanionReady()) {
            centered(dc, 55, "TELEFON", Graphics.FONT_MEDIUM, HORIZON_RED);
            centered(dc, 86, "VERBINDEN", Graphics.FONT_SMALL, HORIZON_INK);
            centered(dc, 116, "GARMIN CONNECT OEFFNEN", Graphics.FONT_XTINY, HORIZON_INK);
            drawHorizon(dc, 148);
            centered(dc, 198, "KEINE LIVE-DATEN", Graphics.FONT_XTINY, HORIZON_RED);
            return;
        }

        var direction = value(state, :direction, "none");
        drawDirectionArrow(dc, 55, 61, direction, HORIZON_RED);

        var label = directionLabel(direction);
        var labelFont = label.length() > 8 ? Graphics.FONT_XTINY : Graphics.FONT_SMALL;
        dc.setColor(HORIZON_RED, HORIZON_PAPER);
        dc.drawText(87, 43, labelFont, label, Graphics.TEXT_JUSTIFY_LEFT);

        var maneuverM = nextManeuverDistance(state);
        var maneuverText = maneuverM == null ? "--" : formatDistance(maneuverM);
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        dc.drawText(87, 70, Graphics.FONT_MEDIUM, maneuverText, Graphics.TEXT_JUSTIFY_LEFT);

        var remainingM = value(state, :remainingDistanceM, null);
        if (remainingM == null) {
            var remainingKm = value(state, :remainingKm, null);
            remainingM = remainingKm == null ? null : remainingKm * 1000;
        }
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        dc.drawText(dc.getWidth() - safeInset(dc), 102, Graphics.FONT_XTINY,
            remainingM == null ? "-- REST" : formatDistance(remainingM) + " REST",
            Graphics.TEXT_JUSTIFY_RIGHT);

        centered(dc, 121, shortText(value(state, :nextInstruction, "Route folgen"),
            charsPerLine(dc)), Graphics.FONT_XTINY, HORIZON_INK);

        drawHorizon(dc, 145);
        drawRouteProgress(dc, 184, state);

        drawBottomStat(dc, 196, true, formatTime(value(state, :elapsedS, 0)), "ZEIT");
        drawBottomStat(dc, 196, false, formatTime(value(state, :remainingSeconds, 0)), "ETA");
        drawBottomStat(dc, 215, true,
            value(state, :ascentM, 0).format("%d") + " m", "AUFSTIEG");
        drawBottomStat(dc, 215, false,
            value(state, :steps, 0).format("%d"), "SCHRITTE");

        var offRoute = value(state, :offRoute, null);
        if (offRoute != null) {
            centered(dc, 121, "ABWEG  " +
                formatDistance(value(offRoute, :distanceM, 0)) + " ZUR ROUTE",
                Graphics.FONT_XTINY, HORIZON_RED);
        }
    }

    function drawStatus(dc, state) {
        centered(dc, 43, "UNTERWEGS", Graphics.FONT_SMALL, HORIZON_RED);
        centered(dc, 67, routeProgress(state).format("%d") + "%",
            Graphics.FONT_MEDIUM, HORIZON_INK);
        drawRouteProgress(dc, 96, state);

        drawMetricRow(dc, 111, "DISTANZ",
            formatDistance(value(state, :totalDistanceM, 0)),
            "AUFSTIEG", value(state, :ascentM, 0).format("%d") + " m");
        drawMetricRow(dc, 141, "SCHRITTE",
            value(state, :steps, 0).format("%d"),
            "PULS", heartRateText(state));
        drawMetricRow(dc, 163, "ZEIT",
            formatTime(value(state, :elapsedS, 0)),
            "ETA", formatTime(value(state, :remainingSeconds, 0)));

        var daylight = value(state, :daylight, null);
        if (daylight != null &&
            value(daylight, :arrivalAfterSunset, false) == true) {
            centered(dc, 204, "ANKUNFT NACH SONNENUNTERG.",
                Graphics.FONT_XTINY, HORIZON_RED);
        } else {
            var terrain = value(state, :terrainSection, null);
            var weather = value(state, :weather, null);
            if (terrain != null || weather != null) {
                var environmentText = terrain == null ? "" :
                    (value(terrain, :direction, "") == "up" ? "AUF " : "AB ") +
                    value(terrain, :gradePct, 0).format("%d") + "%";
                if (weather != null) {
                    environmentText += "  " +
                        value(weather, :temperatureC, 0).format("%d") +
                        " C  WIND " + value(weather, :windKmh, 0).format("%d");
                }
                centered(dc, 204, environmentText, Graphics.FONT_XTINY, HORIZON_INK);
            } else {
                centered(dc, 204, gpsFresh(state) ? "GPS FRISCH" : "GPS NICHT FRISCH",
                    Graphics.FONT_XTINY, gpsFresh(state) ? HORIZON_GREEN : HORIZON_RED);
            }
        }
    }

    function drawSafety(dc, state) {
        centered(dc, 42, "CHECK-IN", Graphics.FONT_SMALL, HORIZON_RED);
        var checkin = value(state, :safetyCheckin, null);
        var checkColor = HORIZON_LIGHT;
        var checkText = "--";
        var checkLabel = "NICHT AKTIV";
        if (checkin != null && value(checkin, :status, "idle") != "idle") {
            checkColor = value(checkin, :status, "") == "overdue" ?
                HORIZON_RED : HORIZON_GREEN;
            checkText = formatTime(value(checkin, :remainingSec, 0));
            checkLabel = safetyStatus(value(checkin, :status, ""));
        }
        dc.setColor(checkColor, HORIZON_PAPER);
        dc.drawCircle(dc.getWidth() / 2, 94, 36);
        dc.drawCircle(dc.getWidth() / 2, 94, 35);
        centered(dc, 78, checkText, Graphics.FONT_SMALL, HORIZON_INK);
        centered(dc, 103, checkLabel, Graphics.FONT_XTINY, checkColor);

        var offRoute = value(state, :offRoute, null);
        var alertText = value(state, :alertText, "");
        var safetyText = value(state, :safetyText, "");
        if (offRoute != null) {
            centered(dc, 139, "ABWEG", Graphics.FONT_SMALL, HORIZON_RED);
            centered(dc, 164, formatDistance(value(offRoute, :distanceM, 0)) +
                " ZUR ROUTE", Graphics.FONT_XTINY, HORIZON_INK);
        } else if (alertText != "") {
            centered(dc, 139, "HINWEIS", Graphics.FONT_XTINY, HORIZON_RED);
            centered(dc, 160, shortText(alertText, charsPerLine(dc)),
                Graphics.FONT_XTINY, HORIZON_INK);
        } else if (safetyText != "") {
            centered(dc, 139, "SICHERHEIT", Graphics.FONT_XTINY, HORIZON_RED);
            centered(dc, 160, shortText(safetyText, charsPerLine(dc)),
                Graphics.FONT_XTINY, HORIZON_INK);
        } else {
            centered(dc, 146, "KEINE AKUTE WARNUNG",
                Graphics.FONT_XTINY, HORIZON_GREEN);
        }

        dc.setColor(HORIZON_RED, HORIZON_PAPER);
        dc.drawLine(safeInset(dc) + 14, 187, dc.getWidth() - safeInset(dc) - 14, 187);
        centered(dc, 194, confirmSos ? "NOCHMALS SELECT" : "SELECT 2x: SOS",
            Graphics.FONT_XTINY, HORIZON_RED);
        centered(dc, 213, "MENU: CHECK-IN / PAUSE",
            Graphics.FONT_XTINY, HORIZON_INK);
    }

    function drawStory(dc, state) {
        var story = value(state, :poiStory, null);
        var audioPlaying = value(state, :audioPlaying, false) == true;
        centered(dc, 43, "STORY / AUDIO", Graphics.FONT_SMALL, HORIZON_RED);

        dc.setColor(HORIZON_LIGHT, HORIZON_PAPER);
        dc.drawLine(safeInset(dc) + 10, 73, dc.getWidth() - safeInset(dc) - 10, 73);
        drawPlayMark(dc, 57, 87, audioPlaying ? HORIZON_RED : HORIZON_MID);
        dc.setColor(audioPlaying ? HORIZON_RED : HORIZON_INK, HORIZON_PAPER);
        dc.drawText(78, 78, Graphics.FONT_XTINY,
            audioPlaying ? "TELEFON SPIELT" : "KEINE WIEDERGABE",
            Graphics.TEXT_JUSTIFY_LEFT);
        dc.setColor(HORIZON_LIGHT, HORIZON_PAPER);
        dc.drawLine(safeInset(dc) + 10, 105, dc.getWidth() - safeInset(dc) - 10, 105);

        if (story == null) {
            centered(dc, 133, "KEINE POI-GESCHICHTE",
                Graphics.FONT_XTINY, HORIZON_MID);
            centered(dc, 158, "Naehere dich einem Ort.", Graphics.FONT_XTINY, HORIZON_INK);
            centered(dc, 180, "Audio bleibt am Telefon.", Graphics.FONT_XTINY, HORIZON_INK);
            return;
        }

        centered(dc, 122, shortText(value(story, :name, "ORT"), charsPerLine(dc)),
            Graphics.FONT_SMALL, HORIZON_RED);
        drawWrapped(dc, 151, value(story, :text, ""), 3, HORIZON_INK);
        if (value(story, :imageUrl, "") != "") {
            centered(dc, 207, "FOTO AUF DEM TELEFON",
                Graphics.FONT_XTINY, HORIZON_MID);
        }
    }

    function drawCompletion(dc, state) {
        centered(dc, 52, "WANDERUNG BEENDET", Graphics.FONT_SMALL, HORIZON_GREEN);
        centered(dc, 82, formatDistance(value(state, :totalDistanceM, 0)),
            Graphics.FONT_MEDIUM, HORIZON_RED);
        drawHorizon(dc, 117);
        drawMetricRow(dc, 165, "ZEIT", formatTime(value(state, :elapsedS, 0)),
            "AUFSTIEG", value(state, :ascentM, 0).format("%d") + " m");
        drawMetricRow(dc, 196, "SCHRITTE", value(state, :steps, 0).format("%d"),
            "DETAILS", "TELEFON");
    }

    function drawHeader(dc, state) {
        var inset = safeInset(dc);
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        centered(dc, 16, "SAGATRAIL  " + pageTitle(),
            Graphics.FONT_XTINY, HORIZON_INK);
        dc.setColor(HORIZON_LIGHT, HORIZON_PAPER);
        dc.drawLine(inset + 12, 34, dc.getWidth() - inset - 12, 34);
    }

    function drawDirectionArrow(dc, x, y, direction, color) {
        dc.setColor(color, HORIZON_PAPER);
        if (direction == "left") {
            thickLine(dc, x + 14, y, x - 13, y);
            thickLine(dc, x - 13, y, x - 4, y - 9);
            thickLine(dc, x - 13, y, x - 4, y + 9);
        } else if (direction == "right") {
            thickLine(dc, x - 14, y, x + 13, y);
            thickLine(dc, x + 13, y, x + 4, y - 9);
            thickLine(dc, x + 13, y, x + 4, y + 9);
        } else if (direction == "uTurn" || direction == "uturn" ||
            direction == "turnAround") {
            thickLine(dc, x + 10, y + 12, x + 10, y - 8);
            thickLine(dc, x + 10, y - 8, x - 10, y - 8);
            thickLine(dc, x - 10, y - 8, x - 2, y - 16);
            thickLine(dc, x - 10, y - 8, x - 2, y);
        } else {
            thickLine(dc, x, y + 14, x, y - 13);
            thickLine(dc, x, y - 13, x - 9, y - 4);
            thickLine(dc, x, y - 13, x + 9, y - 4);
        }
    }

    function thickLine(dc, x1, y1, x2, y2) {
        dc.drawLine(x1, y1, x2, y2);
        dc.drawLine(x1 + 1, y1, x2 + 1, y2);
    }

    function drawHorizon(dc, y) {
        var w = dc.getWidth();
        dc.setColor(HORIZON_MID, HORIZON_PAPER);
        dc.drawLine(18, y + 28, 42, y + 20);
        dc.drawLine(42, y + 20, 61, y + 25);
        dc.drawLine(61, y + 25, 89, y + 5);
        dc.drawLine(89, y + 5, 108, y + 22);
        dc.drawLine(108, y + 22, 132, y);
        dc.drawLine(132, y, 158, y + 24);
        dc.drawLine(158, y + 24, 181, y + 8);
        dc.drawLine(181, y + 8, 209, y + 27);
        dc.drawLine(209, y + 27, w - 18, y + 19);
        dc.setColor(HORIZON_LIGHT, HORIZON_PAPER);
        dc.drawLine(18, y + 33, 57, y + 27);
        dc.drawLine(57, y + 27, 84, y + 34);
        dc.drawLine(84, y + 34, 117, y + 18);
        dc.drawLine(117, y + 18, 151, y + 34);
        dc.drawLine(151, y + 34, 187, y + 21);
        dc.drawLine(187, y + 21, w - 18, y + 34);
        dc.setColor(HORIZON_RED, HORIZON_PAPER);
        thickLine(dc, 132, y, 140, y + 13);
        thickLine(dc, 140, y + 13, 153, y + 22);
    }

    function drawRouteProgress(dc, y, state) {
        var inset = safeInset(dc) + 8;
        var width = dc.getWidth() - (inset * 2);
        var fillWidth = ((width * routeProgress(state)) / 100).toNumber();
        dc.setColor(HORIZON_LIGHT, HORIZON_PAPER);
        dc.fillRectangle(inset, y, width, 4);
        if (fillWidth > 0) {
            dc.setColor(HORIZON_RED, HORIZON_PAPER);
            dc.fillRectangle(inset, y, fillWidth, 4);
        }
    }

    function drawBottomStat(dc, y, left, text, label) {
        var x = left ? safeInset(dc) + 7 : dc.getWidth() - safeInset(dc) - 7;
        var justify = left ? Graphics.TEXT_JUSTIFY_LEFT : Graphics.TEXT_JUSTIFY_RIGHT;
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        dc.drawText(x, y, Graphics.FONT_XTINY, text + " " + label, justify);
    }

    function drawMetricRow(dc, y, leftLabel, leftValue, rightLabel, rightValue) {
        var inset = safeInset(dc) + 8;
        dc.setColor(HORIZON_MID, HORIZON_PAPER);
        dc.drawText(inset, y, Graphics.FONT_XTINY, leftLabel, Graphics.TEXT_JUSTIFY_LEFT);
        dc.drawText(dc.getWidth() - inset, y, Graphics.FONT_XTINY,
            rightLabel, Graphics.TEXT_JUSTIFY_RIGHT);
        dc.setColor(HORIZON_INK, HORIZON_PAPER);
        dc.drawText(inset, y + 14, Graphics.FONT_SMALL, leftValue,
            Graphics.TEXT_JUSTIFY_LEFT);
        dc.drawText(dc.getWidth() - inset, y + 14, Graphics.FONT_SMALL, rightValue,
            Graphics.TEXT_JUSTIFY_RIGHT);
    }

    function drawPlayMark(dc, x, y, color) {
        dc.setColor(color, HORIZON_PAPER);
        dc.drawLine(x, y - 7, x, y + 7);
        dc.drawLine(x, y - 7, x + 10, y);
        dc.drawLine(x + 10, y, x, y + 7);
    }

    function drawHiker(dc, x, y, color) {
        dc.setColor(color, HORIZON_PAPER);
        dc.drawLine(x + 2, y + 2, x + 6, y + 2);
        dc.drawLine(x + 4, y + 6, x + 4, y + 12);
        dc.drawLine(x + 4, y + 8, x, y + 11);
        dc.drawLine(x + 4, y + 8, x + 8, y + 10);
        dc.drawLine(x + 4, y + 12, x + 1, y + 17);
        dc.drawLine(x + 4, y + 12, x + 8, y + 17);
    }

    function nextManeuverDistance(state) {
        var upcoming = value(state, :upcomingNavigations, []);
        if (upcoming.size() > 0) {
            var distance = value(upcoming[0], :distanceM, null);
            if (distance != null) {
                return distance;
            }
        }
        var km = value(state, :remainingKm, null);
        return km == null ? null : km * 1000;
    }

    function routeProgress(state) {
        var walked = value(state, :totalDistanceM, 0);
        var remaining = value(state, :remainingDistanceM, 0);
        var total = walked + remaining;
        if (total <= 0) {
            return 0;
        }
        var progress = ((walked * 100.0) / total).toNumber();
        if (progress < 0) {
            return 0;
        }
        if (progress > 100) {
            return 100;
        }
        return progress;
    }

    function gpsFresh(state) {
        return app.isPhoneCompanionReady() &&
            value(state, :hasFreshGps, false) == true;
    }

    function displayHeartRate(state) {
        if ((Toybox has :SensorHistory) &&
            (Toybox.SensorHistory has :getHeartRateHistory)) {
            var history = SensorHistory.getHeartRateHistory({});
            var sample = history == null ? null : history.next();
            if (sample != null && sample.data != null && sample.data > 0) {
                return sample.data;
            }
        }
        return value(state, :heartRateBpm, null);
    }

    function heartRateText(state) {
        var heartRate = displayHeartRate(state);
        return heartRate == null ? "--" : heartRate.format("%d") + " bpm";
    }

    function value(state, key, fallback) {
        var candidate = state[key];
        return candidate == null ? fallback : candidate;
    }

    function formatDistance(meters) {
        if (meters >= 1000) {
            return (meters / 1000.0).format("%.1f") + " km";
        }
        return meters.format("%d") + " m";
    }

    function formatTime(seconds) {
        var hours = seconds / 3600;
        var minutes = (seconds % 3600) / 60;
        return hours.format("%d") + ":" + minutes.format("%02d");
    }

    function directionLabel(direction) {
        if (direction == "left") {
            return "LINKS";
        }
        if (direction == "right") {
            return "RECHTS";
        }
        if (direction == "uTurn" || direction == "uturn" ||
            direction == "turnAround") {
            return "WENDEN";
        }
        if (direction == "straight") {
            return "GERADEAUS";
        }
        return "GERADEAUS";
    }

    function terrainDirection(direction) {
        return direction == "up" ? "AUFSTIEG" : "ABSTIEG";
    }

    function safetyStatus(status) {
        if (status == "overdue") {
            return "UEBERFAELLIG";
        }
        if (status == "active") {
            return "AKTIV";
        }
        return "BEREIT";
    }

    function pageTitle() {
        if (page == 0) {
            return "NAV";
        }
        if (page == 1) {
            return "STATUS";
        }
        if (page == 2) {
            return "SICHER";
        }
        return "STORY";
    }

    function charsPerLine(dc) {
        return dc.getWidth() >= 260 ? 24 : 20;
    }

    function safeInset(dc) {
        return dc.getWidth() >= 260 ? 30 : 27;
    }

    function shortText(text, maxChars) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars - 3) + "...";
    }

    function drawWrapped(dc, y, text, maxLines, color) {
        var maxChars = charsPerLine(dc);
        var index = 0;
        var row = 0;
        while (index < text.length() && row < maxLines) {
            var endIndex = index + maxChars;
            if (endIndex > text.length()) {
                endIndex = text.length();
            }
            centered(dc, y + (row * 17), text.substring(index, endIndex),
                Graphics.FONT_XTINY, color);
            index = endIndex;
            row += 1;
        }
    }

    function centered(dc, y, text, font, color) {
        dc.setColor(color, HORIZON_PAPER);
        dc.drawText(dc.getWidth() / 2, y, font,
            shortText(text, charsPerLine(dc)), Graphics.TEXT_JUSTIFY_CENTER);
    }

    function footer(dc, text, color) {
        dc.setColor(color, HORIZON_PAPER);
        dc.drawText(dc.getWidth() / 2, dc.getHeight() - 27,
            Graphics.FONT_XTINY, shortText(text, charsPerLine(dc)),
            Graphics.TEXT_JUSTIFY_CENTER);
    }
}