package ch.sagatrail.wear

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class HikeViewModel(private val context: Context) : ViewModel() {
    private val layer = WearDataLayer(context)
    var snapshot by mutableStateOf<HikeLiveState?>(null); private set
    var lastError by mutableStateOf<String?>(null); private set
    var localHeartRate by mutableStateOf<Double?>(null); private set
    var now by mutableLongStateOf(System.currentTimeMillis()); private set
    var sosPendingId by mutableStateOf<String?>(null); private set
    private val hr = HeartRatePublisher(context) { bpm ->
        localHeartRate = bpm
        // This is a measurement event, not a phone-state update. The phone
        // decides whether/how it persists or republishes the measurement.
        if (bpm != null) viewModelScope.launch {
            runCatching { layer.send(WearCommand.HeartRate("hr-${System.currentTimeMillis()}", bpm)) }
        }
    }

    init {
        layer.onSnapshot = { received ->
            snapshot = received
            if (received.sosAcknowledgement?.commandId == sosPendingId) sosPendingId = null
            received.safetyAlert?.let { vibrate() }
        }
        layer.start()
        viewModelScope.launch { while (true) { now = System.currentTimeMillis(); delay(5_000) } }
    }
    fun startHeartRate() = viewModelScope.launch {
        runCatching { hr.start() }.onFailure { lastError = "Heart rate unavailable: ${it.message}" }
    }
    fun requestSos() {
        val id = "sos-${System.currentTimeMillis()}"
        sosPendingId = id
        viewModelScope.launch {
            runCatching { layer.send(WearCommand.Sos(id)) }
                .onFailure { sosPendingId = null; lastError = it.message ?: "SOS request was not sent." }
        }
    }
    private fun vibrate() {
        (context.getSystemService(Vibrator::class.java))?.vibrate(
            VibrationEffect.createWaveform(longArrayOf(0, 150, 100, 300), -1)
        )
    }
    fun close() = layer.stop()
    override fun onCleared() { layer.stop(); super.onCleared() }
}

@Composable
fun HikeApp(context: Context) {
    val model = remember { HikeViewModel(context) }
    DisposableEffect(model) { onDispose { model.close() } }
    val sensorPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        if (it) model.startHeartRate()
    }
    val state = model.snapshot
    val stale = state == null || state.isStale(model.now)
    MaterialTheme {
        Column(
            Modifier.fillMaxSize().padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(5.dp, Alignment.CenterVertically)
        ) {
            if (stale) Text("PHONE DISCONNECTED", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
            else if (!state!!.hasFreshGps) Text("PHONE GPS UNAVAILABLE", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
            else {
                Text(state?.routeName ?: "Hike live", fontWeight = FontWeight.Bold)
                NavigationCue(state!!.navigation)
                Text("↑ ${state.metrics.elevationGainMeters ?: "—"} m   ${formatDuration(state.metrics.elapsedSeconds)}")
            }
            Text("HR ${model.localHeartRate?.toInt() ?: state?.metrics?.phoneHeartRateBpm?.toInt() ?: "—"} bpm")
            if (model.localHeartRate == null) Button(onClick = {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED) model.startHeartRate()
                else sensorPermission.launch(Manifest.permission.BODY_SENSORS)
            }) { Text("Start HR") }
            state?.safetyAlert?.let { Text("SAFETY: ${it.text}", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) }
            SosControl(model, state?.sosAcknowledgement)
            model.lastError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable private fun NavigationCue(navigation: HikeLiveState.Navigation?) {
    if (navigation == null) Text("Waiting for navigation")
    else {
        Text("➤", fontWeight = FontWeight.Bold, modifier = Modifier.graphicsLayer { rotationZ = navigation.bearingDegrees ?: 0f })
        Text("${navigation.turn} · ${navigation.distanceMeters ?: "—"} m")
    }
}
@Composable private fun SosControl(model: HikeViewModel, acknowledgement: HikeLiveState.SosAcknowledgement?) {
    var confirm by remember { mutableStateOf(false) }
    when {
        acknowledgement != null -> Text(if (acknowledgement.accepted) "SOS acknowledged by phone" else "SOS declined: ${acknowledgement.detail ?: "unknown"}")
        model.sosPendingId != null -> Text("SOS request sent — waiting for phone acknowledgement")
        confirm -> Button(onClick = { model.requestSos(); confirm = false }) { Text("CONFIRM SOS") }
        else -> Button(onClick = { confirm = true }) { Text("SOS") }
    }
}
private fun formatDuration(seconds: Long?) = seconds?.let { "%d:%02d".format(it / 60, it % 60) } ?: "—"