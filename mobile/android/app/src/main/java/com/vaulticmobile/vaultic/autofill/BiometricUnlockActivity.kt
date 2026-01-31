package com.vaulticmobile.vaultic.autofill

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Transparent activity used to prompt biometrics and cache the master key for autofill use.
 * Launched from an authentication dataset.
 */
class BiometricUnlockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val helper = BiometricVaultHelper(this)
        helper.promptToDecrypt { key, _ ->
            if (!key.isNullOrBlank()) {
                // Key cached in AutofillKeyCache by helper; just finish.
                setResult(Activity.RESULT_OK, Intent().putExtra("unlocked", true))
            } else {
                setResult(Activity.RESULT_CANCELED)
            }
            finish()
        }
    }
}

