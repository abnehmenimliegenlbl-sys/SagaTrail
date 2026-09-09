using Toybox.ActivityMonitor as ActivityMonitor;
using Toybox.Graphics as Graphics;
using Toybox.SensorHistory as SensorHistory;
using Toybox.System as System;
using Toybox.WatchUi as WatchUi;

const BRAND_RED = 0xCC0000;
const GPS_GREEN = 0x1C9B57;
const BACKGROUND = 0xF4F5F7;
const CARD = 0xFFFFFF;
const INK = 0x181A1E;
const MUTED = 0x181A1E;
const CARD_BORDER = 0xCCCCCC;

class SagaTrailView extends WatchUi.View {
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
        dc.setColor(INK, BACKGROUND);
        dc.clear();

        var width = dc.getWidth();
        var y = drawHeader(dc, state, pageTitle());

        if (page == 0) {
            drawNavigationPage(dc, state, y);
        } else if (page == 1) {
            drawInfoPage(dc, state, y);
        } else if (page == 2) {
            drawSafetyPage(dc, state, y);
        } else {
            drawStoryPage(dc, state, y);
        }

        var sos = app.getSosState();
        if (confirmSos) {
            footer(dc, "SELECT: SOS BESTAETIGEN", BRAND_RED);
        } else if (sos == "pending") {
            footer(dc, "SOS WARTET AUF TELEFON", BRAND_RED);
        } else if (sos == "failed") {
            footer(dc, "SOS FEHLER - ERNEUT", BRAND_RED);
        } else if (sos == "acknowledged") {
            footer(dc, "SOS BESTAETIGT", GPS_GREEN);
        } else {
            footer(dc, "HOCH / RUNTER", MUTED);
        }
    }

    function drawNavigationPage(dc, state, y) {
        var companionReady = app.isPhoneCompanionReady();
        var inset = safeInset(dc);
        if (value(state, :sessionStatus, "") == "finished") {
            drawCompletionPage(dc, state, y);
            return;
        }

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 88);
        var direction = companionReady ?
            directionLabel(value(state, :direction, "none")) :
            "TELEFON VERBINDEN";
        var directionFont = direction.length() > 12 ?
            Graphics.FONT_XTINY : Graphics.FONT_MEDIUM;
        centered(dc, y + 7, direction, directionFont, BRAND_RED);

        var remainingKm = value(state, :remainingKm, null);
        var distanceText = remainingKm == null ? "--" : remainingKm.format("%.1f") + " km";
        centered(dc, y + 38, distanceText, Graphics.FONT_SMALL, INK);
        centered(dc, y + 61, shortText(value(state, :nextInstruction, "Route folgen"),
            charsPerLine(dc)), Graphics.FONT_XTINY, MUTED);
        y += 94;

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 55);
        var walked = value(state, :totalDistanceM, 0);
        var remaining = value(state, :remainingDistanceM, 0);
        drawProgress(dc, inset + 9, y + 9,
            dc.getWidth() - ((inset + 9) * 2), walked, remaining);
        centered(dc, y + 25, formatDistance(walked) + "  |  " +
            formatDistance(remaining), Graphics.FONT_XTINY, INK);
        centered(dc, y + 40, formatTime(value(state, :elapsedS, 0)) + "  |  ETA " +
            formatTime(value(state, :remainingSeconds, 0)), Graphics.FONT_XTINY, MUTED);
        y += 61;

        var offRoute = value(state, :offRoute, null);
        if (offRoute != null) {
            drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 29);
            centered(dc, y + 7, "ABWEG  " +
                formatDistance(value(offRoute, :distanceM, 0)),
                Graphics.FONT_XTINY, BRAND_RED);
        }
    }

    function drawInfoPage(dc, state, y) {
        var inset = safeInset(dc);
        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 62);
        var hr = displayHeartRate(state);
        centered(dc, y + 7, "DISTANZ  " + formatDistance(value(state, :totalDistanceM, 0)),
            Graphics.FONT_XTINY, INK);
        centered(dc, y + 24, "AUFSTIEG  " + value(state, :ascentM, 0).format("%d") +
            " m    SCHRITTE  " + value(state, :steps, 0).format("%d"),
            Graphics.FONT_XTINY, INK);
        centered(dc, y + 41, "PULS  " + (hr == null ? "--" : hr.format("%d")) +
            " bpm", Graphics.FONT_XTINY, hr == null ? MUTED : BRAND_RED);
        y += 68;

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 58);
        var terrain = value(state, :terrainSection, null);
        if (terrain != null) {
            centered(dc, y + 7, shortText("GELAENDE  " +
                terrainDirection(value(terrain, :direction, "")) + "  " +
                value(terrain, :gradePct, 0).format("%d") + "% " +
                formatDistance(value(terrain, :remainingM, 0)), charsPerLine(dc)),
                Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 7, "GELAENDE  --", Graphics.FONT_XTINY, MUTED);
        }

        var weather = value(state, :weather, null);
        if (weather != null) {
            centered(dc, y + 25, value(weather, :temperatureC, 0).format("%d") +
                " C    WIND  " + value(weather, :windKmh, 0).format("%d") + " km/h",
                Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 25, "WETTER  --", Graphics.FONT_XTINY, MUTED);
        }
        var daylight = value(state, :daylight, null);
        if (daylight != null && value(daylight, :arrivalAfterSunset, false) == true) {
            centered(dc, y + 42, "ANKUNFT NACH SONNENUNTERGANG",
                Graphics.FONT_XTINY, BRAND_RED);
        } else {
            centered(dc, y + 42, "TAGESLICHT OK", Graphics.FONT_XTINY, GPS_GREEN);
        }
        y += 64;

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 47);
        var upcoming = value(state, :upcomingNavigations, []);
        if (upcoming.size() > 1) {
            var next = upcoming[1];
            centered(dc, y + 7, "DANACH", Graphics.FONT_XTINY, MUTED);
            centered(dc, y + 23, directionLabel(value(next, :direction, "")) + "  " +
                formatDistance(value(next, :distanceM, 0)), Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 15, "KEIN WEITERER ABBIEGEPUNKT",
                Graphics.FONT_XTINY, MUTED);
        }
    }

    function drawSafetyPage(dc, state, y) {
        var inset = safeInset(dc);
        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 69);
        centered(dc, y + 7, "SICHERHEITS-CHECK-IN", Graphics.FONT_XTINY, MUTED);
        var checkin = value(state, :safetyCheckin, null);
        if (checkin != null && value(checkin, :status, "idle") != "idle") {
            var checkColor = value(checkin, :status, "") == "overdue" ? BRAND_RED : GPS_GREEN;
            centered(dc, y + 25, safetyStatus(value(checkin, :status, "")),
                Graphics.FONT_SMALL, checkColor);
            centered(dc, y + 48, "NOCH " +
                formatTime(value(checkin, :remainingSec, 0)),
                Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 27, "KEIN CHECK-IN AKTIV",
                Graphics.FONT_XTINY, MUTED);
            centered(dc, y + 46, "MENU: 30 / 60 / 120 MIN",
                Graphics.FONT_XTINY, INK);
        }
        y += 75;

        var alertText = value(state, :alertText, "");
        var safetyText = value(state, :safetyText, "");
        var offRoute = value(state, :offRoute, null);
        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 55);
        if (offRoute != null) {
            centered(dc, y + 8, "ABWEG", Graphics.FONT_SMALL, BRAND_RED);
            centered(dc, y + 33, formatDistance(value(offRoute, :distanceM, 0)) +
                " ZUR ROUTE", Graphics.FONT_XTINY, INK);
        } else if (alertText != "") {
            centered(dc, y + 8, "HINWEIS", Graphics.FONT_XTINY, BRAND_RED);
            centered(dc, y + 29, shortText(alertText, charsPerLine(dc)),
                Graphics.FONT_XTINY, INK);
        } else if (safetyText != "") {
            centered(dc, y + 8, "SICHERHEIT", Graphics.FONT_XTINY, BRAND_RED);
            centered(dc, y + 29, shortText(safetyText, charsPerLine(dc)),
                Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 18, "KEINE AKUTE WARNUNG",
                Graphics.FONT_XTINY, GPS_GREEN);
        }
        y += 61;

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 42);
        centered(dc, y + 6, "SELECT 2x: SOS", Graphics.FONT_XTINY, BRAND_RED);
        centered(dc, y + 23, "MENU: CHECK-IN / PAUSE",
            Graphics.FONT_XTINY, INK);
    }

    function drawStoryPage(dc, state, y) {
        var story = value(state, :poiStory, null);
        var narration = value(state, :narrationText, "");
        var inset = safeInset(dc);

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 48);
        if (narration != "") {
            centered(dc, y + 6, "STORY / AUDIO AKTIV",
                Graphics.FONT_XTINY, BRAND_RED);
            centered(dc, y + 24, shortText(narration, charsPerLine(dc)),
                Graphics.FONT_XTINY, INK);
        } else {
            centered(dc, y + 14, "AUDIO WIRD AM TELEFON",
                Graphics.FONT_XTINY, MUTED);
        }
        y += 54;

        if (story == null) {
            drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 82);
            centered(dc, y + 14, "KEINE POI-GESCHICHTE",
                Graphics.FONT_XTINY, MUTED);
            centered(dc, y + 37, "Naehere dich einem Ort,",
                Graphics.FONT_XTINY, INK);
            centered(dc, y + 54, "um seine Geschichte zu hoeren.",
                Graphics.FONT_XTINY, INK);
            return;
        }

        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 112);
        centered(dc, y + 7, shortText(value(story, :name, "ORT"),
            charsPerLine(dc)), Graphics.FONT_SMALL, BRAND_RED);
        var text = value(story, :text, "");
        if (text == "") {
            centered(dc, y + 40, "GESCHICHTE LAEUFT",
                Graphics.FONT_XTINY, INK);
        } else {
            drawWrapped(dc, y + 36, text, 4, INK);
        }
        if (value(story, :imageUrl, "") != "") {
            centered(dc, y + 93, "FOTO AUF DEM TELEFON",
                Graphics.FONT_XTINY, MUTED);
        }
    }

    function drawCompletionPage(dc, state, y) {
        var inset = safeInset(dc);
        drawCard(dc, inset, y, dc.getWidth() - (inset * 2), 157);
        centered(dc, y + 11, "WANDERUNG BEENDET", Graphics.FONT_SMALL, GPS_GREEN);
        centered(dc, y + 43, formatDistance(value(state, :totalDistanceM, 0)),
            Graphics.FONT_MEDIUM, BRAND_RED);
        centered(dc, y + 79, "ZEIT  " + formatTime(value(state, :elapsedS, 0)),
            Graphics.FONT_XTINY, INK);
        centered(dc, y + 99, "AUFSTIEG  " +
            value(state, :ascentM, 0).format("%d") + " m",
            Graphics.FONT_XTINY, INK);
        centered(dc, y + 119, "SCHRITTE  " +
            value(state, :steps, 0).format("%d"),
            Graphics.FONT_XTINY, INK);
        centered(dc, y + 138, "DETAILS AUF DEM TELEFON",
            Graphics.FONT_XTINY, MUTED);
    }

    function value(state, key, fallback) {
        var candidate = state[key];
        return candidate == null ? fallback : candidate;
    }

    function getLocalHeartRate() {
        if ((Toybox has :SensorHistory) && (Toybox.SensorHistory has :getHeartRateHistory)) {
            var history = SensorHistory.getHeartRateHistory({});
            var sample = history == null ? null : history.next();
            if (sample != null && sample.data != null && sample.data > 0) {
                return sample.data;
            }
        }
        return null;
    }

    function displayHeartRate(state) {
        var local = getLocalHeartRate();
        if (local != null) {
            return local;
        }
        return value(state, :heartRateBpm, null);
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

    function shortText(text, maxChars) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars - 3) + "...";
    }

    function pageTitle() {
        if (page == 0) {
            return "NAVIGATION";
        }
        if (page == 1) {
            return "STATUS";
        }
        if (page == 2) {
            return "SICHERHEIT";
        }
        return "STORY / AUDIO";
    }

    function directionLabel(direction) {
        if (direction == "left") {
            return "LINKS";
        }
        if (direction == "right") {
            return "RECHTS";
        }
        if (direction == "uTurn" || direction == "uturn" || direction == "turnAround") {
            return "WENDEN";
        }
        if (direction == "straight") {
            return "GERADEAUS";
        }
        return "ROUTE FOLGEN";
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

    function charsPerLine(dc) {
        return dc.getWidth() >= 260 ? 24 : 20;
    }

    function safeInset(dc) {
        return dc.getWidth() >= 260 ? 30 : 27;
    }

    function drawHeader(dc, state, text) {
        var gpsFresh = app.isPhoneCompanionReady() &&
            value(state, :hasFreshGps, false) == true;
        drawHiker(dc, 12, 6, gpsFresh ? GPS_GREEN : BRAND_RED);
        centered(dc, 5, text, Graphics.FONT_XTINY, MUTED);
        dc.setColor(BRAND_RED, BACKGROUND);
        dc.drawLine(dc.getWidth() - 38, 16, dc.getWidth() - 12, 16);
        return 25;
    }

    function drawHiker(dc, x, y, color) {
        dc.setColor(color, BACKGROUND);
        dc.fillCircle(x + 4, y + 3, 2);
        dc.drawLine(x + 4, y + 6, x + 4, y + 12);
        dc.drawLine(x + 4, y + 8, x, y + 11);
        dc.drawLine(x + 4, y + 8, x + 8, y + 10);
        dc.drawLine(x + 4, y + 12, x + 1, y + 17);
        dc.drawLine(x + 4, y + 12, x + 8, y + 17);
    }

    function drawCard(dc, x, y, width, height) {
        dc.setColor(CARD, BACKGROUND);
        dc.fillRectangle(x, y, width, height);
        dc.setColor(CARD_BORDER, BACKGROUND);
        dc.drawRectangle(x, y, width, height);
        dc.setColor(BRAND_RED, BACKGROUND);
        dc.fillRectangle(x, y, 3, height);
    }

    function drawProgress(dc, x, y, width, walked, remaining) {
        var total = walked + remaining;
        var fillWidth = 0;
        if (total > 0) {
            fillWidth = ((width * walked * 1.0) / total).toNumber();
            if (fillWidth < 0) {
                fillWidth = 0;
            } else if (fillWidth > width) {
                fillWidth = width;
            }
        }
        dc.setColor(CARD_BORDER, CARD);
        dc.fillRectangle(x, y, width, 5);
        if (fillWidth > 0) {
            dc.setColor(BRAND_RED, CARD);
            dc.fillRectangle(x, y, fillWidth, 5);
        }
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
            centered(dc, y + (row * 16), text.substring(index, endIndex),
                Graphics.FONT_XTINY, color);
            index = endIndex;
            row += 1;
        }
    }

    function centered(dc, y, text, font, color) {
        dc.setColor(color, BACKGROUND);
        dc.drawText(dc.getWidth() / 2, y, font,
            shortText(text, charsPerLine(dc)), Graphics.TEXT_JUSTIFY_CENTER);
    }

    function footer(dc, text, color) {
        dc.setColor(color, BACKGROUND);
        dc.drawText(dc.getWidth() / 2, dc.getHeight() - 32, Graphics.FONT_XTINY,
            shortText(text, charsPerLine(dc)), Graphics.TEXT_JUSTIFY_CENTER);
    }
}