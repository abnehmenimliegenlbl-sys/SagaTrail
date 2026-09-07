using Toybox.Application as Application;
using Toybox.Application.Storage as Storage;
using Toybox.Attention as Attention;
using Toybox.Communications as Communications;
using Toybox.Lang;
using Toybox.System;

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
        // This is the coordinate-free adapter for the canonical JS HikeLiveState.
        var next = {};
        next[:protocolVersion] = 1;
        next[:updatedAtMs] = payload["updatedAtMs"];
        next[:direction] = payload["direction"];
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
        next[:sosAcknowledgement] = payload["sosAcknowledgement"];
        // A cache alone must never claim that a phone bridge is connected.
        phoneCompanionReady = payload["bridge"] == "connectIqMobile" &&
            payload["companionStatus"] == "connected";
        liveState = next;

        if ((next[:safetyText] != null && next[:safetyText] != "" &&
            next[:safetyText] != previousSafety) ||
            (next[:narrationText] != null && next[:narrationText] != "" &&
            next[:narrationText] != previousNarration)) {
            Attention.vibrate([new Attention.VibeProfile(60, 90)]);
        }

        if (message[:sosAcknowledgement] == "acknowledged") {
            sosState = "acknowledged";
            sosMessage = "Phone acknowledged SOS";
        } else if (message[:sosAcknowledgement] == "failed") {
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
        if (view != null) {
            view.setSosConfirmation(value);
        }
    }

    function refresh() {
        if (view != null) {
            view.requestUpdate();
        }
    }
}