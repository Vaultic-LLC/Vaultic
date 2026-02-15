package com.vaulticmobile.vaultic

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.vaulticmobile.vaultic.autofill.AutofillKeyCache
import com.vaulticmobile.vaultic.autofill.BiometricVaultHelper

@CapacitorPlugin(name = "BiometricAuthPlugin")
class BiometricAuthPlugin : Plugin() {

    private val helper by lazy { BiometricVaultHelper(activity ?: bridge.activity) }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject().apply { put("available", helper.isBiometricAvailable()) }
        call.resolve(result)
    }

    @PluginMethod
    fun isDeviceSecure(call: PluginCall) {
        val result = JSObject().apply { put("secure", helper.isDeviceSecure()) }
        call.resolve(result)
    }

    @PluginMethod
    fun hasStoredCredentials(call: PluginCall) {
        val result = JSObject().apply { put("stored", helper.hasStoredKey()) }
        call.resolve(result)
    }

    @PluginMethod
    fun enable(call: PluginCall) {
        val masterKey = call.getString("masterKey")
        val email = call.getString("email")
        if (masterKey.isNullOrBlank()) {
            call.reject("masterKey is required")
            return
        }
        val act = activity ?: bridge.activity
        act?.runOnUiThread {
            helper.promptToStore(masterKey, email) { success, errorCode ->
                val result = JSObject().apply {
                    put("success", success)
                    if (errorCode != null) put("errorCode", errorCode)
                }
                call.resolve(result)
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun disable(call: PluginCall) {
        helper.clearStoredKey()
        call.resolve()
    }

    @PluginMethod
    fun unlock(call: PluginCall) {
        val act = activity ?: bridge.activity
        act?.runOnUiThread {
            helper.promptToDecrypt { key, email ->
                if (!key.isNullOrBlank()) {
                    val result = JSObject().apply {
                        put("success", true)
                        put("key", key)
                        put("email", email)
                    }
                    call.resolve(result)
                } else {
                    val result = JSObject().apply { put("success", false) }
                    call.resolve(result)
                }
            }
        } ?: call.reject("Activity not available")
    }
}

