using Toybox.Application as Application;
using Toybox.Application.Storage as Storage;
using Toybox.Attention as Attention;
using Toybox.Communications as Communications;
using Toybox.Lang;
using Toybox.System;

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

    function onPhoneMessage(message) {
        if (!(message instanceof Dictionary) || message[:protocolVersion] != 1 ||
            message[:type] != "hikeLiveState") {
            return;
        }

        var previousSafety = liveState[:safetyText];
        var previousNarration = liveState[:narrationText];
        // This is the coordinate-free adapter for the canonical JS HikeLiveState.
        var next = {};
        next[:protocolVersion] = 1;
        next[:updatedAtMs] = message[:updatedAtMs];
        next[:direction] = message[:direction];
        next[:heading] = message[:heading];
        next[:remainingKm] = message[:remainingKm];
        next[:heartRateBpm] = message[:heartRateBpm];
        next[:hasFreshGps] = message[:hasFreshGps];
        next[:elapsedS] = message[:elapsedS];
        next[:totalDistanceM] = message[:totalDistanceM];
        next[:ascentM] = message[:ascentM];
        next[:steps] = message[:steps];
        next[:freshnessS] = message[:freshnessS];
        next[:safetyText] = message[:safetyText];
        next[:narrationText] = message[:narrationText];
        next[:sosAcknowledgement] = message[:sosAcknowledgement];
        // A cache alone must never claim that a phone bridge is connected.
        phoneCompanionReady = message[:bridge] == "connectIqMobile" &&
            message[:companionStatus] == "connected";
        liveState = next;
        Storage.setValue("hikeLiveState", liveState);

        if ((next[:safetyText] != "" && next[:safetyText] != previousSafety) ||
            (next[:narrationText] != "" && next[:narrationText] != previousNarration)) {
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
            :protocolVersion => 1,
            :type => "sosRequest",
            :requestId => System.getTimer()
        };
        Communications.transmit(request, null, method(:onSosTransport));
        refresh();
    }

    function onSosTransport(responseCode) {
        // Delivery to Connect does not mean that the phone sent an SOS.
        if (responseCode != Communications.TRANSMIT_SUCCESS && sosState == "pending") {
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