using Toybox.ActivityMonitor as ActivityMonitor;
using Toybox.Graphics as Graphics;
using Toybox.SensorHistory as SensorHistory;
using Toybox.System as System;
using Toybox.WatchUi as WatchUi;

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
            page = 1;
        } else if (page > 1) {
            page = 0;
        }
        requestUpdate();
    }

    function onUpdate(dc) {
        var state = app.getLiveState();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var width = dc.getWidth();
        var y = 4;
        title(dc, width, y, page == 0 ? "SAGATRAIL" : "SAGATRAIL  INFO"); y += 18;

        if (page == 0) {
            drawNavigationPage(dc, state, y);
        } else {
            drawInfoPage(dc, state, y);
        }

        var sos = app.getSosState();
        if (confirmSos) {
            inverse(dc, 2, dc.getHeight() - 26, width - 4, "ENTER CONFIRM SOS");
        } else if (sos == "pending") {
            inverse(dc, 2, dc.getHeight() - 26, width - 4, "SOS PENDING PHONE");
        } else if (sos == "failed") {
            inverse(dc, 2, dc.getHeight() - 26, width - 4, "SOS FAILED - RETRY");
        } else if (sos == "acknowledged") {
            inverse(dc, 2, dc.getHeight() - 26, width - 4, "SOS ACKNOWLEDGED");
        } else {
            inverse(dc, 2, dc.getHeight() - 26, width - 4, "UP/DOWN INFO  ENTER SOS");
        }
    }

    function drawNavigationPage(dc, state, y) {
        var companionReady = app.isPhoneCompanionReady();
        var status = companionReady ? "MOBILE CONNECTED" : "MOBILE COMPANION NEEDED";
        var fresh = value(state, :freshnessS, null);
        if (fresh != null) {
            status += " " + fresh.format("%d") + "s";
        }
        line(dc, 4, y, shortText(status, 29)); y += 19;

        if (companionReady && value(state, :hasFreshGps, false) != true) {
            line(dc, 4, y, "GPS STATE STALE"); y += 19;
        } else {
            line(dc, 4, y, shortText(companionReady ?
                value(state, :direction, "Awaiting direction") :
                "Awaiting real phone companion", 29)); y += 19;
        }

        line(dc, 4, y, shortText(value(state, :nextInstruction, "Continue on route"), 29)); y += 20;
        var remainingKm = value(state, :remainingKm, null);
        var distanceText = remainingKm == null ? "--" : remainingKm.format("%.1f") + " km";
        large(dc, 4, y, distanceText); y += 31;

        line(dc, 4, y, "TIME " + formatTime(value(state, :elapsedS, 0)) +
            "  DIST " + formatDistance(value(state, :totalDistanceM, 0))); y += 19;
        line(dc, 4, y, "REST " + formatDistance(value(state, :remainingDistanceM, 0)) +
            "  ETA " + formatTime(value(state, :remainingSeconds, 0))); y += 19;

        var hr = getLocalHeartRate();
        line(dc, 4, y, "ASC " + value(state, :ascentM, 0).format("%d") +
            "m  STEP " + value(state, :steps, 0).format("%d") +
            "  HR " + (hr == null ? "--" : hr.format("%d"))); y += 19;

        var offRoute = value(state, :offRoute, null);
        if (offRoute != null) {
            line(dc, 4, y, shortText("OFF ROUTE " +
                formatDistance(value(offRoute, :distanceM, 0)), 29));
        } else {
            var safety = value(state, :safetyText, "");
            var alertText = value(state, :alertText, "");
            if (alertText != "") {
                line(dc, 4, y, shortText("ALERT " + alertText, 29));
            } else if (safety != "") {
                line(dc, 4, y, shortText("SAFETY " + safety, 29));
            }
        }
    }

    function drawInfoPage(dc, state, y) {
        var terrain = value(state, :terrainSection, null);
        if (terrain != null) {
            line(dc, 4, y, shortText("TERRAIN " + value(terrain, :direction, "") + " " +
                value(terrain, :gradePct, 0).format("%d") + "% " +
                formatDistance(value(terrain, :remainingM, 0)), 29));
        } else {
            line(dc, 4, y, "TERRAIN --");
        }
        y += 21;

        var weather = value(state, :weather, null);
        if (weather != null) {
            line(dc, 4, y, "WEATHER " + value(weather, :temperatureC, 0).format("%d") +
                "C  WIND " + value(weather, :windKmh, 0).format("%d") + " km/h");
        } else {
            line(dc, 4, y, "WEATHER --");
        }
        y += 21;

        var daylight = value(state, :daylight, null);
        if (daylight != null && value(daylight, :arrivalAfterSunset, false) == true) {
            line(dc, 4, y, "ARRIVAL AFTER SUNSET");
        } else {
            line(dc, 4, y, "DAYLIGHT OK");
        }
        y += 21;

        var checkin = value(state, :safetyCheckin, null);
        if (checkin != null) {
            line(dc, 4, y, shortText("CHECK-IN " + value(checkin, :status, "idle") +
                " " + formatTime(value(checkin, :remainingSec, 0)), 29));
        } else {
            line(dc, 4, y, "CHECK-IN NONE");
        }
        y += 21;

        var narration = value(state, :narrationText, "");
        if (narration != "") {
            line(dc, 4, y, shortText("NARRATION " + narration, 29));
        } else {
            line(dc, 4, y, "NARRATION --");
        }
        y += 21;

        var upcoming = value(state, :upcomingNavigations, []);
        if (upcoming.size() > 1) {
            var next = upcoming[1];
            line(dc, 4, y, shortText("THEN " + value(next, :direction, "") + " " +
                formatDistance(value(next, :distanceM, 0)), 29));
        } else {
            line(dc, 4, y, "THEN --");
        }
    }

    function value(state, key, fallback) {
        var candidate = state[key];
        return candidate == null ? fallback : candidate;
    }

    function getLocalHeartRate() {
        if ((Toybox has :SensorHistory) && (Toybox.SensorHistory has :getHeartRateHistory)) {
            var history = SensorHistory.getHeartRateHistory({});
            var sample = history == null ? null : history.next();
            return sample == null ? null : sample.data;
        }
        return null;
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

    function title(dc, width, y, text) {
        dc.drawText(width / 2, y, Graphics.FONT_TINY, shortText(text, 20),
            Graphics.TEXT_JUSTIFY_CENTER);
    }

    function line(dc, x, y, text) {
        dc.drawText(dc.getWidth() / 2, y, Graphics.FONT_TINY, shortText(text, 24),
            Graphics.TEXT_JUSTIFY_CENTER);
    }

    function large(dc, x, y, text) {
        dc.drawText(dc.getWidth() / 2, y, Graphics.FONT_MEDIUM, text,
            Graphics.TEXT_JUSTIFY_CENTER);
    }

    function inverse(dc, x, y, width, text) {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.fillRectangle(x, y, width, 20);
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_WHITE);
        dc.drawText(x + width / 2, y + 3, Graphics.FONT_TINY, shortText(text, 24),
            Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
    }
}