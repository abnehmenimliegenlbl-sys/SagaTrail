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
        if (key == WatchUi.KEY_ENTER) {
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

    function onMenu() {
        var menu = new WatchUi.Menu();
        menu.setTitle("SagaTrail");
        menu.addItem("Start / Pause / Resume", :hike);
        menu.addItem("Check-in 30 min", :safety30);
        menu.addItem("Check-in 60 min", :safety60);
        menu.addItem("Check-in 120 min", :safety120);
        menu.addItem("Check-in bestätigen", :safetyConfirm);
        menu.addItem("SOS", :sos);
        WatchUi.pushView(menu, new SagaTrailMenuDelegate(app), WatchUi.SLIDE_IMMEDIATE);
        return true;
    }
}