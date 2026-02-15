package com.vaulticmobile.vaultic.autofill

/**
 * In-memory cache for a decrypted master key, shared across app components
 * (same process). This should be short-lived and cleared on logout/timeout.
 */
data class CachedAuth(val masterKey: String, val email: String?)

object AutofillKeyCache {
    @Volatile
    private var cached: CachedAuth? = null

    @Volatile
    private var cachedAt: Long = 0L

    // TTL in ms (5 minutes default)
    private const val TTL_MS = 5 * 60 * 1000L

    fun set(masterKey: String, email: String?) {
        cached = CachedAuth(masterKey, email)
        cachedAt = System.currentTimeMillis()
    }

    fun get(): CachedAuth? {
        val current = cached ?: return null
        val age = System.currentTimeMillis() - cachedAt
        return if (age <= TTL_MS) current else null
    }

    fun clear() {
        cached = null
        cachedAt = 0L
    }
}

