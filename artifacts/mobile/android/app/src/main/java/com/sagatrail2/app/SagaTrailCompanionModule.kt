package com.sagatrail2.app

import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

/**
 * Android phone endpoint for the native Wear companion. JS remains the source
 * of truth: this module only transports its snapshots and surfaces requests.
 */
class SagaTrailCompanionModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), MessageClient.OnMessageReceivedListener {

  private val dataClient = Wearable.getDataClient(context)
  private val messageClient = Wearable.getMessageClient(context)

  override fun getName() = MODULE_NAME

  override fun initialize() {
    super.initialize()
    messageClient.addListener(this)
  }

  override fun invalidate() {
    messageClient.removeListener(this)
    super.invalidate()
  }

  /** Receives the canonical WatchLiveSnapshot fields from JS and writes v1 Wear JSON. */
  @ReactMethod
  fun publishLiveState(snapshot: ReadableMap, promise: Promise) {
    try {
      val hasFreshGps = snapshot.requiredBoolean("hasFreshGps")
      val remainingKm = snapshot.requiredDouble("remainingKm")
      val navigation = JSONObject()
        .put("turn", snapshot.requiredString("direction"))
        .putIfPresent("bearingDegrees", snapshot.optionalDouble("heading"))
        .put("distanceMeters", (remainingKm * 1000).toInt())
      val metrics = JSONObject()
        .putIfPresent("phoneHeartRateBpm", snapshot.optionalDouble("heartRateBpm"))
        .putIfPresent("elapsedSeconds", snapshot.optionalDouble("elapsedSeconds")?.toLong())
        .putIfPresent("elevationGainMeters", snapshot.optionalDouble("elevationGainMeters")?.toInt())
      val body = JSONObject()
        .put("contractVersion", 1)
        .put("snapshotId", "phone-${System.currentTimeMillis()}")
        .put("receivedAtEpochMs", System.currentTimeMillis())
        .put("metrics", metrics)
        // A no-GPS snapshot is deliberately transmitted; the watch can explain
        // stale/unavailable navigation rather than silently showing old guidance.
        .put("hasFreshGps", hasFreshGps)
        .putIfPresent("routeName", snapshot.optionalString("routeName"))
        .put("navigation", navigation)
      snapshot.optionalMap("sosAcknowledgement")?.let { acknowledgement ->
        body.put("sosAcknowledgement", JSONObject()
          .put("commandId", acknowledgement.requiredString("commandId"))
          .put("accepted", acknowledgement.requiredBoolean("accepted"))
          .putIfPresent("detail", acknowledgement.optionalString("detail")))
      }
      val request = PutDataMapRequest.create(SNAPSHOT_PATH)
      request.dataMap.putByteArray("payload", body.toString().toByteArray(Charsets.UTF_8))
      dataClient.putDataItem(request.asPutDataRequest())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("WEAR_PUBLISH_FAILED", "Unable to publish Wear snapshot", it) }
    } catch (error: Exception) {
      promise.reject("INVALID_LIVE_STATE", error.message, error)
    }
  }

  override fun onMessageReceived(event: com.google.android.gms.wearable.MessageEvent) {
    if (event.path != COMMAND_PATH) return
    runCatching { JSONObject(event.data.toString(Charsets.UTF_8)) }.onSuccess { command ->
      when (command.optString("type")) {
        "HEART_RATE" -> emit(HEART_RATE_EVENT, Arguments.createMap().apply {
          putDouble("bpm", command.optDouble("bpm"))
          putString("source", "wear_health_services")
          putString("id", command.optString("id"))
        })
        "SOS_REQUEST" -> emit(SOS_REQUEST_EVENT, Arguments.createMap().apply {
          putString("id", command.optString("id"))
          putString("sourceNodeId", event.sourceNodeId)
        })
      }
    }
  }

  private fun emit(event: String, data: WritableMap) {
    if (context.hasActiveReactInstance()) {
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, data)
    }
  }

  @ReactMethod fun addListener(eventName: String) = Unit
  @ReactMethod fun removeListeners(count: Double) = Unit

  private fun ReadableMap.requiredString(key: String): String =
    optionalString(key) ?: throw IllegalArgumentException("$key is required")
  private fun ReadableMap.requiredBoolean(key: String): Boolean {
    if (!hasKey(key) || isNull(key) || getType(key) != ReadableType.Boolean) throw IllegalArgumentException("$key is required")
    return getBoolean(key)
  }
  private fun ReadableMap.requiredDouble(key: String): Double =
    optionalDouble(key) ?: throw IllegalArgumentException("$key is required")
  private fun ReadableMap.optionalString(key: String): String? =
    if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.String) getString(key) else null
  private fun ReadableMap.optionalDouble(key: String): Double? =
    if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Number) getDouble(key) else null
  private fun ReadableMap.optionalMap(key: String): ReadableMap? =
    if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Map) getMap(key) else null
  private fun JSONObject.putIfPresent(key: String, value: Any?): JSONObject = apply { if (value != null) put(key, value) }

  companion object {
    const val MODULE_NAME = "SagaTrailCompanion"
    const val SNAPSHOT_PATH = "/sagatrail/live_state/v1"
    const val COMMAND_PATH = "/sagatrail/command/v1"
    const val HEART_RATE_EVENT = "SagaTrailCompanion.heartRate"
    const val SOS_REQUEST_EVENT = "SagaTrailCompanion.sosRequest"
  }
}

class SagaTrailCompanionPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(SagaTrailCompanionModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}