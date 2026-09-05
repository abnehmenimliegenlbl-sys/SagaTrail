package ch.sagatrail.wear

import android.content.Context
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseUpdate

/**
 * Starts a local walking exercise only after the wearer grants BODY_SENSORS.
 * The displayed heart rate is watch-measured; it is deliberately never sent
 * back as an authoritative phone navigation state.
 */
class HeartRatePublisher(context: Context, private val publish: (Double?) -> Unit) {
    private val exerciseClient = HealthServices.getClient(context).exerciseClient
    private val callback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            publish(update.latestMetrics.getData(DataType.HEART_RATE_BPM).lastOrNull()?.value)
        }
        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) = Unit
        override fun onRegistered() = Unit
        override fun onRegistrationFailed(throwable: Throwable) = publish(null)
    }

    suspend fun start() {
        exerciseClient.setUpdateCallback(callback)
        exerciseClient.startExercise(
            ExerciseConfig.Builder(ExerciseType.EXERCISE_TYPE_WALKING)
                .setDataTypes(setOf(DataType.HEART_RATE_BPM))
                .setIsAutoPauseAndResumeEnabled(false)
                .build()
        )
    }
    suspend fun stop() {
        exerciseClient.clearUpdateCallback(callback)
        exerciseClient.endExercise()
    }
}