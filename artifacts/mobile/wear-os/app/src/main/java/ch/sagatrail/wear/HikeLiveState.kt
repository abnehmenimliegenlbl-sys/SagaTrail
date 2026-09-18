package ch.sagatrail.wear

import org.json.JSONObject

/** Versioned, phone-authored snapshot. Add fields compatibly; do not infer authority on the watch. */
data class HikeLiveState(
    val contractVersion: Int,
    val snapshotId: String,
    val receivedAtEpochMs: Long,
    val hasFreshGps: Boolean,
    val routeName: String?,
    val navigation: Navigation?,
    val metrics: Metrics,
    val safetyAlert: SafetyAlert?,
    val sosAcknowledgement: SosAcknowledgement?
) {
    data class Navigation(val turn: String, val bearingDegrees: Float?, val distanceMeters: Int?)
    data class Metrics(val elapsedSeconds: Long?, val elevationGainMeters: Int?, val phoneHeartRateBpm: Double?)
    data class SafetyAlert(val id: String, val text: String, val severity: String)
    data class SosAcknowledgement(val commandId: String, val accepted: Boolean, val detail: String?)

    fun isCompatible() = contractVersion == CONTRACT_VERSION
    fun isStale(now: Long, maxAgeMs: Long = SNAPSHOT_MAX_AGE_MS) = now - receivedAtEpochMs > maxAgeMs

    companion object {
        const val CONTRACT_VERSION = 1
        const val SNAPSHOT_MAX_AGE_MS = 90_000L

        fun fromJson(raw: String): HikeLiveState {
            val o = JSONObject(raw)
            require(o.getInt("contractVersion") == CONTRACT_VERSION) { "Unsupported HikeLiveState contract" }
            fun JSONObject.stringOrNull(key: String) = if (isNull(key)) null else getString(key)
            val nav = o.optJSONObject("navigation")?.let {
                Navigation(it.getString("turn"), it.optDouble("bearingDegrees").takeUnless { n -> n.isNaN() }?.toFloat(), it.optInt("distanceMeters").takeUnless { n -> n == 0 && !it.has("distanceMeters") })
            }
            val m = o.optJSONObject("metrics") ?: JSONObject()
            val alert = o.optJSONObject("safetyAlert")?.let { SafetyAlert(it.getString("id"), it.getString("text"), it.optString("severity", "warning")) }
            val ack = o.optJSONObject("sosAcknowledgement")?.let { SosAcknowledgement(it.getString("commandId"), it.getBoolean("accepted"), it.stringOrNull("detail")) }
            return HikeLiveState(o.getInt("contractVersion"), o.getString("snapshotId"), o.getLong("receivedAtEpochMs"), o.optBoolean("hasFreshGps", true),
                o.stringOrNull("routeName"), nav,
                Metrics(m.optLong("elapsedSeconds").takeUnless { !m.has("elapsedSeconds") }, m.optInt("elevationGainMeters").takeUnless { !m.has("elevationGainMeters") }, m.optDouble("phoneHeartRateBpm").takeUnless { !m.has("phoneHeartRateBpm") }),
                alert, ack)
        }
    }
}