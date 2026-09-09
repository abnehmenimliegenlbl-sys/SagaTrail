using Toybox.Application as Application;
using Toybox.Application.Storage as Storage;
using Toybox.Attention as Attention;
using Toybox.Communications as Communications;
using Toybox.Lang;
using Toybox.SensorHistory as SensorHistory;
using Toybox.System;
using Toybox.Time;

class SagaTrailTransmitListener extends Communications.ConnectionListener {
    var app;

    function initialize(appRef) {
        Communications.ConnectionListener.initialize();
        app = appRef;
    }

    function onError() {
        app.onSosTransport(false);
    }

    function onComplete() {
        app.onSosTransport(true);
    }
}

class SagaTrailApp extends Application.AppBase {
    var liveState;
    var sosState = "idle";
    var sosMessage = "";
    var sosConfirmationArmed = false;
    var view;
    var phoneCompanionReady = false;

    function initialize() {
        AppBase.initialize();
        liveState = Storage.getValue("hikeLiveState");
        if (liveState == null) {
            liveState = {};
        }
    }

    function onStart(state) {
        Communications.registerForPhoneAppMessages(method(:onPhoneMessage));
    }

    function getInitialView() {
        view = new SagaTrailView(self);
        return [view, new SagaTrailDelegate(self)];
    }

    function onPhoneMessage(message as Communications.PhoneAppMessage) as Void {
        var payload = message.data;
        if (!(payload instanceof Dictionary) || payload["protocolVersion"] != 1 ||
            payload["type"] != "hikeLiveState") {
            return;
        }

        var previousSafety = liveState[:safetyText];
        var previousNarration = liveState[:narrationText];
        var previousAlert = liveState[:alertText];
        var previousPoi = liveState[:poiStory];
        var previousGpsFresh = valueOrDefault(liveState, :hasFreshGps, true);
        var previousDirection = valueOrDefault(liveState, :direction, "none");
        // This is the coordinate-free adapter for the canonical JS HikeLiveState.
        var next = {};
        next[:protocolVersion] = 1;
        next[:updatedAtMs] = payload["updatedAtMs"];
        next[:direction] = payload["direction"];
        next[:sessionStatus] = payload["sessionStatus"];
        next[:nextInstruction] = payload["nextInstruction"];
        next[:heading] = payload["heading"];
        next[:remainingKm] = payload["remainingKm"];
        next[:heartRateBpm] = payload["heartRateBpm"];
        next[:hasFreshGps] = payload["hasFreshGps"];
        next[:elapsedS] = payload["elapsedS"];
        next[:totalDistanceM] = payload["totalDistanceM"];
        next[:ascentM] = payload["ascentM"];
        next[:steps] = payload["steps"];
        next[:freshnessS] = payload["freshnessS"];
        next[:safetyText] = payload["safetyText"];
        next[:narrationText] = payload["narrationText"];
        next[:alertKind] = payload["alertKind"];
        next[:alertText] = payload["alertText"];
        next[:sosAcknowledgement] = payload["sosAcknowledgement"];
        next[:remainingDistanceM] = payload["remainingDistanceM"];
        next[:remainingSeconds] = payload["remainingSeconds"];
        next[:arrivalAtEpochMs] = payload["arrivalAtEpochMs"];
        next[:plannedAscentM] = payload["plannedAscentM"];
        next[:remainingAscentM] = payload["remainingAscentM"];
        next[:upcomingNavigations] = payload["upcomingNavigations"];
        next[:terrainSection] = payload["terrainSection"];
        next[:safetyCheckin] = payload["safetyCheckin"];
        next[:offRoute] = payload["offRoute"];
        next[:weather] = payload["weather"];
        next[:daylight] = payload["daylight"];
        next[:poiStory] = payload["poiStory"];
        next[:language] = payload["language"];
        // A cache alone must never claim that a phone bridge is connected.
        phoneCompanionReady = payload["bridge"] == "connectIqMobile" &&
            payload["companionStatus"] == "connected";
        liveState = next;
        transmitLocalHeartRate();

        var poiChanged = next[:poiStory] != null &&
            (previousPoi == null || next[:poiStory][:id] != previousPoi[:id]);
        var gpsWentStale = previousGpsFresh == true && next[:hasFreshGps] != true;
        var turnChanged = next[:direction] != null &&
            next[:direction] != "none" && next[:direction] != previousDirection;
        if ((next[:safetyText] != null && next[:safetyText] != "" &&
            next[:safetyText] != previousSafety) ||
            (next[:narrationText] != null && next[:narrationText] != "" &&
            next[:narrationText] != previousNarration) ||
            (next[:alertText] != null && next[:alertText] != "" &&
            next[:alertText] != previousAlert) || poiChanged || gpsWentStale || turnChanged) {
            Attention.vibrate([new Attention.VibeProfile(60, 90)]);
        }

        if (next[:sosAcknowledgement] == "acknowledged") {
            sosState = "acknowledged";
            sosMessage = "Phone acknowledged SOS";
        } else if (next[:sosAcknowledgement] == "failed") {
            sosState = "failed";
            sosMessage = "Phone could not send SOS";
        }
        refresh();
    }

    function requestSos() {
        if (!phoneCompanionReady) {
            sosState = "failed";
            sosMessage = "No CIQ Mobile companion";
            refresh();
            return;
        }
        sosState = "pending";
        sosMessage = "Waiting for phone acknowledgement";
        var request = {
            "protocolVersion" => 1,
            "type" => "sosRequest",
            "requestId" => System.getTimer()
        };
        Communications.transmit(request, null, new SagaTrailTransmitListener(self));
        refresh();
    }

    function sendHikeCommand(command) {
        var request = {
            "protocolVersion" => 1,
            "type" => "hikeCommand",
            "command" => command,
            "requestedAt" => System.getTimer()
        };
        Communications.transmit(request, null, new SagaTrailCommandTransmitListener());
    }

    function toggleHike() {
        var status = liveState[:sessionStatus];
        if (status == "active") {
            sendHikeCommand("pause");
        } else if (status == "paused") {
            sendHikeCommand("resume");
        } else if (status == "preparing") {
            sendHikeCommand("start");
        }
    }

    function startSafetyCheckin(durationMinutes) {
        if (durationMinutes != 30 && durationMinutes != 60 && durationMinutes != 120) {
            return;
        }
        sendHikeCommandWithDuration("safetyStart", durationMinutes);
    }

    function confirmSafetyCheckin() {
        sendHikeCommand("safetyConfirm");
    }

    function sendHikeCommandWithDuration(command, durationMinutes) {
        var request = {
            "protocolVersion" => 1,
            "type" => "hikeCommand",
            "command" => command,
            "durationMinutes" => durationMinutes,
            "requestedAt" => System.getTimer()
        };
        Communications.transmit(request, null, new SagaTrailCommandTransmitListener());
    }

    function transmitLocalHeartRate() {
        if (!(Toybox has :SensorHistory) || !(Toybox.SensorHistory has :getHeartRateHistory)) {
            return;
        }
        var history = SensorHistory.getHeartRateHistory({});
        var sample = history == null ? null : history.next();
        if (sample == null || sample.data == null) {
            return;
        }
        var bpm = sample.data;
        if (bpm <= 0) {
            return;
        }
        var lastSent = Storage.getValue("lastHeartRateBpm");
        var lastAt = Storage.getValue("lastHeartRateAt");
        var now = System.getTimer();
        if (lastSent != null && lastAt != null &&
            lastSent == bpm && now - lastAt < 15000) {
            return;
        }
        Storage.setValue("lastHeartRateBpm", bpm);
        Storage.setValue("lastHeartRateAt", now);
        Communications.transmit({
            "protocolVersion" => 1,
            "type" => "heartRate",
            "bpm" => bpm,
            "measuredAt" => Time.now().value() * 1000
        }, null, new SagaTrailCommandTransmitListener());
    }

    function onSosTransport(success) {
        // Delivery to Connect does not mean that the phone sent an SOS.
        if (!success && sosState == "pending") {
            sosState = "failed";
            sosMessage = "Could not reach phone";
            refresh();
        }
    }

    function getLiveState() {
        return liveState;
    }

    function valueOrDefault(state, key, fallback) {
        var candidate = state[key];
        return candidate == null ? fallback : candidate;
    }

    function getSosState() {
        return sosState;
    }

    function getSosMessage() {
        return sosMessage;
    }

    function isPhoneCompanionReady() {
        return phoneCompanionReady;
    }

    function setSosConfirmation(value) {
        sosConfirmationArmed = value;
        if (view != null) {
            view.setSosConfirmation(value);
        }
    }

    function isSosConfirmationArmed() {
        return sosConfirmationArmed;
    }

    function changeInfoPage(delta) {
        if (view != null) {
            view.changePage(delta);
        }
    }

    function refresh() {
        if (view != null) {
            view.requestUpdate();
        }
    }
}