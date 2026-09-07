using Toybox.ActivityMonitor as ActivityMonitor;
using Toybox.Graphics as Graphics;
using Toybox.SensorHistory as SensorHistory;
using Toybox.System as System;
using Toybox.WatchUi as WatchUi;

class SagaTrailView extends WatchUi.View {
    var app;
    var confirmSos = false;

    function initialize(appRef) {
        View.initialize();
        app = appRef;
    }

    function setSosConfirmation(value) {
        confirmSos = value;
        requestUpdate();
    }

    function onUpdate(dc) {
        var state = app.getLiveState();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var width = dc.getWidth();
        var y = 4;
        title(dc, width, y, "SAGATRAIL"); y += 18;

        var companionReady = app.isPhoneCompanionReady();
        var fresh = value(state, :freshnessS, null);
        var status = companionReady ? "CIQ MOBILE CONNECTED" : "CIQ MOBILE COMPANION REQUIRED";
        if (fresh != null) {
            status += "  " + fresh.format("%d") + "s old";
        }
        line(dc, 4, y, status); y += 17;
        if (companionReady && value(state, :hasFreshGps, false) != true) {
            line(dc, 4, y, "GPS STATE STALE"); y += 16;
        }

        var direction = companionReady ? value(state, :direction, "Awaiting next direction") :
            "Awaiting real phone companion";
        line(dc, 4, y, direction); y += 18;
        line(dc, 4, y, value(state, :nextInstruction, "Continue on route")); y += 16;
        var remainingKm = value(state, :remainingKm, null);
        var distanceText = remainingKm == null ? "--" : remainingKm.format("%.1f") + " km";
        large(dc, 4, y, distanceText); y += 31;

        line(dc, 4, y, "Elapsed " + formatTime(value(state, :elapsedS, 0)) +
            "  Distance " + formatDistance(value(state, :totalDistanceM, 0))); y += 16;
        line(dc, 4, y, "Rest " + formatDistance(value(state, :remainingDistanceM, 0)) +
            "  ETA " + formatTime(value(state, :remainingSeconds, 0))); y += 16;
        line(dc, 4, y, "Ascent " + value(state, :ascentM, 0).format("%d") +
            "m  Steps " + value(state, :steps, 0).format("%d")); y += 17;
        line(dc, 4, y, "Climb left " + value(state, :remainingAscentM, 0).format("%d") + "m"); y += 16;

        var hr = getLocalHeartRate();
        line(dc, 4, y, hr == null ? "HR local: unavailable" : "HR local: " + hr.format("%d") + " bpm"); y += 17;
        var upcoming = value(state, :upcomingNavigations, []);
        if (upcoming.size() > 1) {
            var next = upcoming[1];
            line(dc, 4, y, "Then " + value(next, :direction, "") + " " +
                formatDistance(value(next, :distanceM, 0))); y += 16;
        }
        var terrain = value(state, :terrainSection, null);
        if (terrain != null) {
            line(dc, 4, y, value(terrain, :direction, "Terrain") + " " +
                value(terrain, :gradePct, 0).format("%d") + "% " +
                formatDistance(value(terrain, :remainingM, 0))); y += 16;
        }
        var offRoute = value(state, :offRoute, null);
        if (offRoute != null) {
            line(dc, 4, y, "OFF ROUTE " + formatDistance(value(offRoute, :distanceM, 0))); y += 16;
        }
        var weather = value(state, :weather, null);
        if (weather != null) {
            line(dc, 4, y, "Weather " + value(weather, :temperatureC, 0).format("%d") +
                "C  Wind " + value(weather, :windKmh, 0).format("%d") + " km/h"); y += 16;
        }
        var daylight = value(state, :daylight, null);
        if (daylight != null && value(daylight, :arrivalAfterSunset, false) == true) {
            line(dc, 4, y, "ARRIVAL AFTER SUNSET"); y += 16;
        }
        var safety = value(state, :safetyText, "");
        var narration = value(state, :narrationText, "");
        var checkin = value(state, :safetyCheckin, null);
        if (checkin != null) {
            line(dc, 4, y, "Check-in " + value(checkin, :status, "idle") +
                " " + formatTime(value(checkin, :remainingSec, 0))); y += 16;
        }
        if (safety != "") {
            line(dc, 4, y, "Safety: " + safety); y += 16;
        }
        if (narration != "") {
            line(dc, 4, y, "Narration: " + narration); y += 16;
        }
        var alertText = value(state, :alertText, "");
        if (alertText != "" && alertText != safety && alertText != narration) {
            line(dc, 4, y, "Alert: " + alertText); y += 16;
        }

        var sos = app.getSosState();
        if (confirmSos) {
            inverse(dc, 2, dc.getHeight() - 38, width - 4, "PRESS ENTER: CONFIRM SOS");
        } else if (sos == "pending") {
            inverse(dc, 2, dc.getHeight() - 38, width - 4, "SOS PENDING PHONE ACK");
        } else if (sos == "failed") {
            inverse(dc, 2, dc.getHeight() - 38, width - 4, "SOS FAILED - RETRY ENTER");
        } else if (sos == "acknowledged") {
            inverse(dc, 2, dc.getHeight() - 38, width - 4, "SOS ACKNOWLEDGED");
        } else {
            inverse(dc, 2, dc.getHeight() - 38, width - 4, "MENU: CONTROLS  ENTER: SOS");
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

    function title(dc, width, y, text) {
        dc.drawText(width / 2, y, Graphics.FONT_SMALL, text, Graphics.TEXT_JUSTIFY_CENTER);
    }

    function line(dc, x, y, text) {
        dc.drawText(x, y, Graphics.FONT_SMALL, text, Graphics.TEXT_JUSTIFY_LEFT);
    }

    function large(dc, x, y, text) {
        dc.drawText(x, y, Graphics.FONT_MEDIUM, text, Graphics.TEXT_JUSTIFY_LEFT);
    }

    function inverse(dc, x, y, width, text) {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.fillRectangle(x, y, width, 20);
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_WHITE);
        dc.drawText(x + 3, y + 3, Graphics.FONT_SMALL, text, Graphics.TEXT_JUSTIFY_LEFT);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
    }
}