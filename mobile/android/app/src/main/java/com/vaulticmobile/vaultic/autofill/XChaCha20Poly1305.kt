package com.vaulticmobile.vaultic.autofill

import android.util.Log
import org.bouncycastle.crypto.InvalidCipherTextException
import org.bouncycastle.crypto.modes.ChaCha20Poly1305
import org.bouncycastle.crypto.params.AEADParameters
import org.bouncycastle.crypto.params.KeyParameter

/**
 * Minimal XChaCha20-Poly1305-IETF decrypt for hex payloads (nonce||ciphertext||tag).
 * Note: Expects 24-byte nonce prefixed to ciphertext+tag, matching libsodium output.
 */
object XChaCha20Poly1305 {
    fun decrypt(keyHex: String, cipherHex: String): ByteArray? {
        return try {
            val key = hexToBytes(keyHex)
            val cipherBytes = hexToBytes(cipherHex)
            if (cipherBytes.size < 24 + 16) return null
            val nonce = cipherBytes.copyOfRange(0, 24)
            val ct = cipherBytes.copyOfRange(24, cipherBytes.size)

            // Derive subkey and 12-byte nonce via HChaCha20, then use standard ChaCha20-Poly1305
            val subKey = hChaCha20(key, nonce.copyOfRange(0, 16))
            val derivedNonce = ByteArray(12).apply {
                // per XChaCha20 spec: first 4 bytes zero, last 8 from nonce tail
                System.arraycopy(nonce, 16, this, 4, 8)
            }

            if (ct.size < 16) return null

            val cipher = ChaCha20Poly1305()
            val params = AEADParameters(KeyParameter(subKey), 128, derivedNonce, null)
            cipher.init(false, params)

            val out = ByteArray(ct.size - 16)
            val written = cipher.processBytes(ct, 0, ct.size, out, 0)
            val finalLen = cipher.doFinal(out, written)
            out.copyOf(written + finalLen)
        } catch (e: InvalidCipherTextException) {
            Log.e("XChaCha20Poly1305", "Decrypt failed: auth/tag", e)
            null
        } catch (e: Exception) {
            Log.e("XChaCha20Poly1305", "Decrypt failed", e)
            null
        }
    }

    private fun hexToBytes(hex: String): ByteArray {
        val clean = if (hex.length % 2 == 0) hex else "0$hex"
        val out = ByteArray(clean.length / 2)
        var i = 0
        var j = 0
        while (i < clean.length) {
            val hi = Character.digit(clean[i], 16)
            val lo = Character.digit(clean[i + 1], 16)
            out[j++] = ((hi shl 4) + lo).toByte()
            i += 2
        }
        return out
    }

    // Minimal HChaCha20 implementation to derive subkey for XChaCha20
    private fun hChaCha20(key: ByteArray, nonce16: ByteArray): ByteArray {
        require(key.size == 32) { "Key must be 32 bytes" }
        require(nonce16.size == 16) { "Nonce16 must be 16 bytes" }

        val state = IntArray(16)
        // Constants
        state[0] = 0x61707865
        state[1] = 0x3320646e
        state[2] = 0x79622d32
        state[3] = 0x6b206574
        // Key
        for (i in 0 until 8) {
            state[4 + i] = littleEndianToInt(key, i * 4)
        }
        // Nonce
        state[12] = littleEndianToInt(nonce16, 0)
        state[13] = littleEndianToInt(nonce16, 4)
        state[14] = littleEndianToInt(nonce16, 8)
        state[15] = littleEndianToInt(nonce16, 12)

        repeat(10) { // 20 rounds; 2 rounds per loop
            quarterRound(state, 0, 4, 8, 12)
            quarterRound(state, 1, 5, 9, 13)
            quarterRound(state, 2, 6, 10, 14)
            quarterRound(state, 3, 7, 11, 15)
            quarterRound(state, 0, 5, 10, 15)
            quarterRound(state, 1, 6, 11, 12)
            quarterRound(state, 2, 7, 8, 13)
            quarterRound(state, 3, 4, 9, 14)
        }

        val out = ByteArray(32)
        intToLittleEndian(state[0], out, 0)
        intToLittleEndian(state[1], out, 4)
        intToLittleEndian(state[2], out, 8)
        intToLittleEndian(state[3], out, 12)
        intToLittleEndian(state[12], out, 16)
        intToLittleEndian(state[13], out, 20)
        intToLittleEndian(state[14], out, 24)
        intToLittleEndian(state[15], out, 28)
        return out
    }

    private fun quarterRound(state: IntArray, a: Int, b: Int, c: Int, d: Int) {
        state[a] = state[a] + state[b]; state[d] = rotateLeft(state[d] xor state[a], 16)
        state[c] = state[c] + state[d]; state[b] = rotateLeft(state[b] xor state[c], 12)
        state[a] = state[a] + state[b]; state[d] = rotateLeft(state[d] xor state[a], 8)
        state[c] = state[c] + state[d]; state[b] = rotateLeft(state[b] xor state[c], 7)
    }

    private fun rotateLeft(v: Int, bits: Int): Int = (v shl bits) or (v ushr (32 - bits))

    private fun littleEndianToInt(bs: ByteArray, off: Int): Int {
        return (bs[off].toInt() and 0xff) or
            ((bs[off + 1].toInt() and 0xff) shl 8) or
            ((bs[off + 2].toInt() and 0xff) shl 16) or
            ((bs[off + 3].toInt() and 0xff) shl 24)
    }

    private fun intToLittleEndian(v: Int, out: ByteArray, off: Int) {
        out[off] = (v and 0xff).toByte()
        out[off + 1] = (v ushr 8 and 0xff).toByte()
        out[off + 2] = (v ushr 16 and 0xff).toByte()
        out[off + 3] = (v ushr 24 and 0xff).toByte()
    }
}



