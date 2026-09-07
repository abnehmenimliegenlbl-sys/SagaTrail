package com.sagatrail2.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.garmin.android.connectiq.ConnectIQ
import com.garmin.android.connectiq.IQApp
import com.garmin.android.connectiq.IQDevice
import com.garmin.android.connectiq.exception.InvalidStateException
import com.garmin.android.connectiq.exception.ServiceUnavailableException
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Phone endpoint for the optional Wear OS and Garmin companions.
 *
 * JS remains the source of truth. The two transports are deliberately
 * independent: a missing Garmin watch must not disable Wear OS, and a
 * disconnected Garmin watch must never be reported as connected.
 */
class SagaTrailCompanionModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), MessageClient.OnMessageReceivedListener {

  private val dataClient = Wearable.getDataClient(context)
  private val messageClient = Wearable.getMessageClient(context)
  private val connectIQ = ConnectIQ.getInstance(context, ConnectIQ.IQConnectType.WIRELESS)
  private val garminApp = IQApp(GARMIN_APPLICATION_ID)
  private val knownGarminDevices = CopyOnWriteArrayList<IQDevice>()
  private val pendingGarminPublishes = CopyOnWriteArrayList<PendingGarminPublish>()
  private var garminInitialized = false
  private var garminSdkReady = false
  private var activeGarminDevice: IQDevice? = null

  private data class PendingGarminPublish(
    val payload: Map<String, Any>,
    val promise: Promise,
  )

  private val garminListener = object : ConnectIQ.ConnectIQListener {
    override fun onSdkReady() {
      garminSdkReady = true
      refreshGarminDevices()
      flushPendingGarminPublishes()
      emitStatus(GARMIN_STATUS_EVENT, garminStatus())
    }

    override fun onInitializeError(errStatus: ConnectIQ.IQSdkErrorStatus) {
      garminSdkReady = false
      rejectPendingGarminPublishes(
        "GARMIN_INITIALIZATION_FAILED",
        "Garmin Connect IQ is unavailable: ${errStatus.name}",
      )
      emitStatus(GARMIN_STATUS_EVENT, garminStatus(errStatus.name))
    }

    override fun onSdkShutDown() {
      garminSdkReady = false
      activeGarminDevice = null
      emitStatus(GARMIN_STATUS_EVENT, garminStatus())
    }
  }

  override fun getName(): String = MODULE_NAME

  override fun initialize() {
    super.initialize()
    messageClient.addListener(this)
  }

  override fun invalidate() {
    messageClient.removeListener(this)
    try {
      connectIQ.unregisterAllForEvents()
      connectIQ.shutdown(context)
    } catch (_: Exception) {
      // React may invalidate this module after the SDK has already stopped.
    }
    super.invalidate()
  }

  /** Starts the real Garmin Connect IQ Mobile SDK transport. */
  @com.facebook.react.bridge.ReactMethod
  fun activate() {
    if (garminInitialized) return
    garminInitialized = true
    try {
      // false avoids an SDK-owned dialog during a hike. The status event gives
      // JS enough information to show its own app-designed explanation.
      connectIQ.initialize(context, false, garminListener)
    } catch (error: Exception) {
      garminInitialized = false
      emitStatus(GARMIN_STATUS_EVENT, garminStatus(error.javaClass.simpleName))
    }
  }

  /**
   * Publishes to both transports. Garmin receives the constrained
   * coordinate-free Connect IQ protocol, while Wear keeps its existing JSON
   * envelope.
   */
  @com.facebook.react.bridge.ReactMethod
  fun publishLiveState(snapshot: ReadableMap, promise: Promise) {
    publishWearLiveState(snapshot)
    try {
      activate()
      val garminPayload = snapshot.toGarminPayload()
      if (!garminSdkReady) {
        pendingGarminPublishes.add(PendingGarminPublish(garminPayload, promise))
        return
      }
      sendGarminPayload(garminPayload, promise)
    } catch (error: Exception) {
      promise.reject("INVALID_LIVE_STATE", error.message, error)
    }
  }

  @com.facebook.react.bridge.ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(garminStatus())
  }

  private fun publishWearLiveState(snapshot: ReadableMap) {
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
        .addOnFailureListener { /* Wear is an optional second transport. */ }
    } catch (_: Exception) {
      // The canonical Garmin state does not always contain the compact Wear
      // fields. Garmin validation and delivery remain authoritative.
    }
  }

  private fun sendGarminPayload(payload: Map<String, Any>, promise: Promise) {
    val device = activeGarminDevice
    if (device == null || device.status != IQDevice.IQDeviceStatus.CONNECTED) {
      promise.reject("GARMIN_DEVICE_UNAVAILABLE", "No connected Garmin device has SagaTrail installed")
      emitStatus(GARMIN_STATUS_EVENT, garminStatus())
      return
    }
    try {
      connectIQ.sendMessage(device, garminApp, payload) { _, _, status ->
        if (status.name == "SUCCESS") {
          promise.resolve(null)
        } else {
          promise.reject("GARMIN_SEND_FAILED", "Garmin rejected the message: ${status.name}")
        }
      }
    } catch (error: InvalidStateException) {
      promise.reject("GARMIN_INVALID_STATE", error.message, error)
    } catch (error: ServiceUnavailableException) {
      promise.reject("GARMIN_SERVICE_UNAVAILABLE", error.message, error)
    }
  }

  private fun refreshGarminDevices() {
    if (!garminSdkReady) return
    try {
      val devices = connectIQ.knownDevices ?: emptyList()
      knownGarminDevices.clear()
      knownGarminDevices.addAll(devices)
      devices.forEach { device ->
        runCatching { connectIQ.unregisterForDeviceEvents(device) }
        connectIQ.registerForDeviceEvents(device) { changed, status ->
          changed.status = status
          if (status == IQDevice.IQDeviceStatus.CONNECTED) {
            activeGarminDevice = changed
            registerGarminAppEvents(changed)
            flushPendingGarminPublishes()
          } else if (activeGarminDevice?.deviceIdentifier == changed.deviceIdentifier) {
            activeGarminDevice = null
          }
          emitStatus(GARMIN_STATUS_EVENT, garminStatus())
        }
        val status = connectIQ.getDeviceStatus(device)
        device.status = status
        if (status == IQDevice.IQDeviceStatus.CONNECTED) {
          activeGarminDevice = device
          registerGarminAppEvents(device)
        }
      }
    } catch (error: Exception) {
      activeGarminDevice = null
      emitStatus(GARMIN_STATUS_EVENT, garminStatus(error.javaClass.simpleName))
    }
  }

  private fun registerGarminAppEvents(device: IQDevice) {
    runCatching {
      connectIQ.unregisterForApplicationEvents(device, garminApp)
      connectIQ.registerForAppEvents(device, garminApp) { _, _, messageData, _ ->
        val message = messageData.firstOrNull() as? Map<*, *>
        if (message == null || (message["protocolVersion"] as? Number)?.toInt() != 1) return@registerForAppEvents
        when (message["type"]) {
          "sosRequest" -> emit(SOS_REQUEST_EVENT, Arguments.createMap().apply {
            putDouble("requestedAt", System.currentTimeMillis().toDouble())
            putString("requestId", message["requestId"]?.toString())
            putString("source", "garmin_connect_iq")
          })
          "heartRate" -> {
            val bpm = (message["bpm"] as? Number)?.toDouble() ?: 0.0
            if (bpm > 0) emit(HEART_RATE_EVENT, Arguments.createMap().apply {
              putDouble("bpm", bpm)
              putDouble("measuredAt", (message["measuredAt"] as? Number)?.toDouble() ?: System.currentTimeMillis().toDouble())
              putString("source", "garmin")
            })
          }
          "hikeCommand" -> {
            val command = message["command"]?.toString()
            val duration = (message["durationMinutes"] as? Number)?.toInt()
            if (command != null && command in setOf("start", "pause", "resume", "safetyStart", "safetyConfirm")) {
              emit(HIKE_COMMAND_EVENT, Arguments.createMap().apply {
                putString("command", command)
                if (duration != null && duration in setOf(30, 60, 120)) putInt("durationMinutes", duration)
                putString("source", "garmin_connect_iq")
              })
            }
          }
        }
      }
    }
  }

  private fun garminStatus(error: String? = null): WritableMap =
    Arguments.createMap().apply {
      putString("platform", "android")
      putBoolean("sdkReady", garminSdkReady)
      putBoolean("connected", activeGarminDevice?.status == IQDevice.IQDeviceStatus.CONNECTED)
      putString("deviceName", activeGarminDevice?.friendlyName)
      putString("error", error)
      putString("bridge", "connectIqMobile")
    }

  override fun onMessageReceived(event: MessageEvent) {
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

  private fun emitStatus(event: String, data: WritableMap) {
    if (context.hasActiveReactInstance()) {
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, data)
    }
  }

  private fun emit(event: String, data: WritableMap) {
    if (context.hasActiveReactInstance()) {
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, data)
    }
  }

  @com.facebook.react.bridge.ReactMethod
  fun addListener(eventName: String) = Unit

  @com.facebook.react.bridge.ReactMethod
  fun removeListeners(count: Double) = Unit

  private fun ReadableMap.requiredString(key: String): String =
    optionalString(key) ?: throw IllegalArgumentException("$key is required")

  private fun ReadableMap.requiredBoolean(key: String): Boolean {
    if (!hasKey(key) || isNull(key) || getType(key) != ReadableType.Boolean) {
      throw IllegalArgumentException("$key is required")
    }
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

  private fun ReadableMap.optionalArray(key: String): ReadableArray? =
    if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Array) getArray(key) else null

  private fun ReadableMap.toGarminMap(): Map<String, Any> = linkedMapOf<String, Any>().apply {
    for (key in keySetIterator()) {
      if (!hasKey(key) || isNull(key)) continue
      when (getType(key)) {
        ReadableType.Boolean -> put(key, getBoolean(key))
        ReadableType.Number -> put(key, getDouble(key))
        ReadableType.String -> getString(key)?.let { put(key, it) }
        else -> Unit
      }
    }
  }

  private fun ReadableMap.toGarminPayload(): Map<String, Any> {
    val nextNavigation = optionalMap("nextNavigation")
    val payload = linkedMapOf<String, Any>(
      "protocolVersion" to 1,
      "type" to "hikeLiveState",
      "bridge" to "connectIqMobile",
      "companionStatus" to if (activeGarminDevice?.status == IQDevice.IQDeviceStatus.CONNECTED) "connected" else "disconnected",
      "updatedAtMs" to (optionalDouble("timestamp")?.toLong() ?: System.currentTimeMillis()),
      "direction" to (nextNavigation?.optionalString("direction") ?: "none"),
      "sessionStatus" to (optionalString("sessionStatus") ?: "preparing"),
      "nextInstruction" to (
        optionalMap("activeAlert")?.optionalString("text")
          ?: if (nextNavigation?.optionalString("direction") == null) "Continue on route"
          else "Turn ${nextNavigation.optionalString("direction")}"
        ),
      "remainingKm" to (
        nextNavigation?.optionalDouble("distanceM")?.div(1000.0)
          ?: optionalDouble("remainingDistanceM")?.div(1000.0)
          ?: 0.0
        ),
      "hasFreshGps" to (optionalString("gpsFreshness") == "fresh"),
      "sosAcknowledgement" to optionalString("sosAcknowledgement")
        ?.takeIf { it == "acknowledged" || it == "failed" }
        ?: "none",
    )
    nextNavigation?.optionalDouble("bearingDeg")?.let { payload["heading"] = it }
    optionalMap("heartRate")?.optionalDouble("bpm")?.let { payload["heartRateBpm"] = it }
    optionalDouble("elapsedSec")?.let { payload["elapsedS"] = it }
    optionalDouble("walkedDistanceM")?.let { payload["totalDistanceM"] = it }
    optionalDouble("ascentM")?.let { payload["ascentM"] = it }
    optionalDouble("steps")?.let { payload["steps"] = it }
    optionalDouble("remainingDistanceM")?.let { payload["remainingDistanceM"] = it }
    optionalDouble("remainingSeconds")?.let { payload["remainingSeconds"] = it }
    optionalDouble("arrivalAtEpochMs")?.let { payload["arrivalAtEpochMs"] = it }
    optionalDouble("plannedAscentM")?.let { payload["plannedAscentM"] = it }
    optionalDouble("remainingAscentM")?.let { payload["remainingAscentM"] = it }
    optionalArray("upcomingNavigations")?.let { array ->
      val navigations = buildList {
        for (index in 0 until array.size()) {
          val item = array.getMap(index) ?: continue
          val direction = item.optionalString("direction") ?: continue
          val navigation = linkedMapOf<String, Any>("direction" to direction)
          item.optionalDouble("bearingDeg")?.let { navigation["heading"] = it }
          item.optionalDouble("distanceM")?.let { navigation["distanceM"] = it }
          add(navigation)
        }
      }
      if (navigations.isNotEmpty()) payload["upcomingNavigations"] = navigations
    }
    optionalMap("terrainSection")?.let { payload["terrainSection"] = it.toGarminMap() }
    optionalMap("safetyCheckin")?.let { payload["safetyCheckin"] = it.toGarminMap() }
    optionalMap("offRoute")?.let { payload["offRoute"] = it.toGarminMap() }
    optionalMap("weather")?.let { payload["weather"] = it.toGarminMap() }
    optionalMap("daylight")?.let { payload["daylight"] = it.toGarminMap() }
    optionalString("language")?.let { payload["language"] = it }
    optionalDouble("timestamp")?.let {
      payload["freshnessS"] = ((System.currentTimeMillis() - it) / 1000.0).coerceAtLeast(0.0)
    }
    optionalMap("activeAlert")?.let { alert ->
      val kind = alert.optionalString("kind")
      val text = alert.optionalString("text") ?: ""
      if (kind == "safety") payload["safetyText"] = text
      if (kind == "narration") payload["narrationText"] = text
      if (kind != null) payload["alertKind"] = kind
      payload["alertText"] = text
    }
    return payload
  }

  companion object {
    const val MODULE_NAME = "SagaTrailCompanion"
    const val SNAPSHOT_PATH = "/sagatrail/live_state/v1"
    const val COMMAND_PATH = "/sagatrail/command/v1"
    const val HEART_RATE_EVENT = "SagaTrailCompanion.heartRate"
    const val SOS_REQUEST_EVENT = "SagaTrailCompanion.sosRequest"
    const val HIKE_COMMAND_EVENT = "SagaTrailCompanion.hikeCommand"
    const val GARMIN_STATUS_EVENT = "SagaTrailCompanion.garminStatus"
    const val GARMIN_APPLICATION_ID = "1f264eae-ef0d-45ad-9548-ee64460b7d7f"
  }
}

class SagaTrailCompanionPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(SagaTrailCompanionModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext) =
    emptyList<com.facebook.react.uimanager.ViewManager<*, *>>()
}