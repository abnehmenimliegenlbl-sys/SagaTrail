using Toybox.Attention as Attention;
using Toybox.WatchUi as WatchUi;

class SagaTrailDelegate extends WatchUi.BehaviorDelegate {
    var app;
    var confirmSos = false;

    function initialize(appRef) {
        BehaviorDelegate.initialize();
        app = appRef;
    }

    function onKey(key) {
        if (key == WatchUi.KEY_SELECT) {
            if (confirmSos) {
                confirmSos = false;
                app.requestSos();
            } else {
                confirmSos = true;
                Attention.vibrate([new Attention.VibeProfile(50, 100)]);
                app.setSosConfirmation(true);
            }
            return true;
        }
        if (key == WatchUi.KEY_ESC && confirmSos) {
            confirmSos = false;
            app.setSosConfirmation(false);
            return true;
        }
        return false;
    }
}