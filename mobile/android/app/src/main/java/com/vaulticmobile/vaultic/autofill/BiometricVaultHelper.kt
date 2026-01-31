package com.vaulticmobile.vaultic.autofill

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import java.security.KeyStore
import org.json.JSONObject
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.app.KeyguardManager

private const val KEY_ALIAS = "VaulticBiometricKey"
private const val ANDROID_KEYSTORE = "AndroidKeyStore"
private const val PREFS_NAME = "vaultic_biometric_prefs"
private const val PREF_CIPHER = "ciphertext"
private const val PREF_IV = "iv"
private const val PREF_EMAIL = "email"
private const val TAG = "BiometricVaultHelper"

/** Error code returned when device has no secure lock screen (PIN/pattern/password). */
const val ERROR_SECURE_LOCK_SCREEN_REQUIRED = "SECURE_LOCK_SCREEN_REQUIRED"

class BiometricVaultHelper(private val context: Context) {

    private val executor = ContextCompat.getMainExecutor(context)

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val keyguardManager: KeyguardManager by lazy {
        context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    }

    /** Returns true if the device has a secure lock screen (PIN, pattern, or password). Required for KeyStore keys with user authentication. */
    fun isDeviceSecure(): Boolean = keyguardManager.isDeviceSecure

    fun isBiometricAvailable(): Boolean {
        val bm = BiometricManager.from(context)
        return bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
            BiometricManager.BIOMETRIC_SUCCESS
    }

    fun hasStoredKey(): Boolean {
        return prefs.contains(PREF_CIPHER) && prefs.contains(PREF_IV)
    }

    fun clearStoredKey() {
        prefs.edit().clear().apply()
        AutofillKeyCache.clear()
    }

    fun promptToStore(masterKey: String, email: String?, onResult: (Boolean, String?) -> Unit) {
        if (!isDeviceSecure()) {
            onResult(false, ERROR_SECURE_LOCK_SCREEN_REQUIRED)
            return
        }
        val cipher = getCipher(true) ?: run {
            onResult(false, null)
            return
        }
        val prompt = buildPrompt("Enable biometric unlock", "Use biometrics to enable autofill unlock")
        val biometricPrompt = BiometricPrompt(context as androidx.fragment.app.FragmentActivity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val payload = JSONObject().apply {
                            put("masterKey", masterKey)
                            if (!email.isNullOrBlank()) put("email", email)
                        }.toString()
                        val encrypted = result.cryptoObject?.cipher?.doFinal(payload.toByteArray(Charsets.UTF_8))
                        val iv = result.cryptoObject?.cipher?.iv
                        if (encrypted != null && iv != null) {
                            prefs.edit()
                                .putString(PREF_CIPHER, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                                .putString(PREF_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
                                .putString(PREF_EMAIL, email)
                                .apply()
                            onResult(true, null)
                        } else {
                            onResult(false, null)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Encrypt failed", e)
                        onResult(false, null)
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onResult(false, null)
                }

                override fun onAuthenticationFailed() {
                    onResult(false, null)
                }
            })
        biometricPrompt.authenticate(prompt, BiometricPrompt.CryptoObject(cipher))
    }

    fun promptToDecrypt(onResult: (String?, String?) -> Unit) {
        val cipherText = prefs.getString(PREF_CIPHER, null)
        val iv = prefs.getString(PREF_IV, null)
        if (cipherText.isNullOrEmpty() || iv.isNullOrEmpty()) {
            onResult(null, null); return
        }
        val cipher = getCipher(false, Base64.decode(iv, Base64.NO_WRAP)) ?: run {
            onResult(null, null); return
        }
        val prompt = buildPrompt("Unlock Vaultic", "Use biometrics to unlock autofill")
        val biometricPrompt = BiometricPrompt(context as androidx.fragment.app.FragmentActivity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val decrypted = result.cryptoObject?.cipher?.doFinal(Base64.decode(cipherText, Base64.NO_WRAP))
                        // Decode bytes to UTF-8 string (ByteArray.toString() returns "[B@...", not decoded content)
                        val payloadStr = decrypted?.decodeToString()
                        val payload = if (!payloadStr.isNullOrBlank()) JSONObject(payloadStr) else null
                        val masterKey = payload?.optString("masterKey")
                        val email = payload?.optString("email", null) ?: prefs.getString(PREF_EMAIL, null)

                        if (!masterKey.isNullOrBlank()) {
                            AutofillKeyCache.set(masterKey, email)
                        }
                        onResult(masterKey, email)
                    } catch (e: Exception) {
                        Log.e(TAG, "Decrypt failed", e)
                        onResult(null, null)
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onResult(null, null)
                }

                override fun onAuthenticationFailed() {
                    onResult(null, null)
                }
            })
        biometricPrompt.authenticate(prompt, BiometricPrompt.CryptoObject(cipher))
    }

    private fun buildPrompt(title: String, subtitle: String) =
        BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setConfirmationRequired(false)
            .build()

    private fun getCipher(forEncrypt: Boolean, iv: ByteArray? = null): Cipher? {
        return try {
            val key = getOrCreateKey()
            val cipher = Cipher.getInstance("${KeyProperties.KEY_ALGORITHM_AES}/${KeyProperties.BLOCK_MODE_GCM}/${KeyProperties.ENCRYPTION_PADDING_NONE}")
            if (forEncrypt) {
                cipher.init(Cipher.ENCRYPT_MODE, key)
            } else {
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
            }
            cipher
        } catch (e: Exception) {
            Log.e(TAG, "getCipher failed", e)
            null
        }
    }

    private fun getOrCreateKey(): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        ks.getKey(KEY_ALIAS, null)?.let { return it as SecretKey }

        val builder = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(0) // prompt every time
            .setInvalidatedByBiometricEnrollment(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            builder.setUnlockedDeviceRequired(true)
        }

        val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        keyGen.init(builder.build())
        return keyGen.generateKey()
    }
}

