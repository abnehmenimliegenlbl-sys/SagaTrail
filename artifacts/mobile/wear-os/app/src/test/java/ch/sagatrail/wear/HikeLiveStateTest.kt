package ch.sagatrail.wear

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HikeLiveStateTest {
    @Test fun `snapshot parsing rejects unknown contract`() {
        val json = """{"contractVersion":2,"snapshotId":"a","receivedAtEpochMs":1,"metrics":{}}"""
        assertTrue(runCatching { HikeLiveState.fromJson(json) }.isFailure)
    }
    @Test fun `staleness is based on phone snapshot timestamp`() {
        val state = HikeLiveState(1, "a", 1_000, true, null, null, HikeLiveState.Metrics(null, null, null), null, null)
        assertTrue(state.isStale(91_001))
        assertFalse(state.isStale(90_000))
    }
}