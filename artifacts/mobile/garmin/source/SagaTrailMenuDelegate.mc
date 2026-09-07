using Toybox.WatchUi;

class SagaTrailMenuDelegate extends WatchUi.MenuInputDelegate {
    var app;

    function initialize(appRef) {
        MenuInputDelegate.initialize();
        app = appRef;
    }

    function onMenuItem(item) {
        if (item == :hike) {
            app.toggleHike();
        } else if (item == :safety30) {
            app.startSafetyCheckin(30);
        } else if (item == :safety60) {
            app.startSafetyCheckin(60);
        } else if (item == :safety120) {
            app.startSafetyCheckin(120);
        } else if (item == :safetyConfirm) {
            app.confirmSafetyCheckin();
        } else if (item == :sos) {
            app.requestSos();
        }
    }
}