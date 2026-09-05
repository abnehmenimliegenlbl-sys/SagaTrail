package ch.sagatrail.wear

import android.content.Context
import com.google.android.gms.wearable.*
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

class WearDataLayer(context: Context) : DataClient.OnDataChangedListener {
    private val dataClient = Wearable.getDataClient(context)
    private val messageClient = Wearable.getMessageClient(context)
    private val nodeClient = Wearable.getNodeClient(context)
    var onSnapshot: (HikeLiveState) -> Unit = {}

    fun start() = dataClient.addListener(this)
    fun stop() = dataClient.removeListener(this)
    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == SNAPSHOT_PATH) {
                runCatching {
                    DataMapItem.fromDataItem(event.dataItem).dataMap.getByteArray("payload")!!
                        .toString(Charsets.UTF_8)
                }.mapCatching(HikeLiveState::fromJson).onSuccess(onSnapshot)
            }
        }
    }

    suspend fun send(command: WearCommand) {
        val payload = command.toJson().toByteArray(Charsets.UTF_8)
        val nodes = nodeClient.connectedNodes.await()
        check(nodes.isNotEmpty()) { "No connected phone; command was not sent." }
        nodes.forEach { messageClient.sendMessage(it.id, COMMAND_PATH, payload).await() }
    }

    companion object {
        const val SNAPSHOT_PATH = "/sagatrail/live_state/v1"
        const val COMMAND_PATH = "/sagatrail/command/v1"
    }
}

sealed interface WearCommand {
    val id: String
    fun toJson(): String
    data class Sos(override val id: String) : WearCommand {
        override fun toJson() = JSONObject(mapOf("contractVersion" to 1, "id" to id, "type" to "SOS_REQUEST")).toString()
    }
    data class HeartRate(override val id: String, val bpm: Double) : WearCommand {
        override fun toJson() = JSONObject(mapOf("contractVersion" to 1, "id" to id, "type" to "HEART_RATE", "bpm" to bpm)).toString()
    }
}