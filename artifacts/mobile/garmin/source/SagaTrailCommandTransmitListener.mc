using Toybox.Communications;

class SagaTrailCommandTransmitListener extends Communications.ConnectionListener {
    function initialize() {
        Communications.ConnectionListener.initialize();
    }

    function onError() {
    }

    function onComplete() {
    }
}