package com.vaulticmobile.vaultic.autofill

import android.content.ContentValues
import android.content.Context
import android.util.Log
import org.json.JSONObject

/**
 * Persists passwordStoreState per vaultID for Autofill consumption.
 * Expects the JS layer to pass the entire PasswordStoreState JSON; extracts vaultID and state.
 */
class AutofillSyncHandler(context: Context) {
    private val dbHelper = AutofillSyncDbHelper(context.applicationContext)

    fun upsertPasswordStoreState(entityJson: String) {
        try {
            val json = JSONObject(entityJson)
            val vaultId = json.optInt("vaultID", -1)
            val passwordStoreState = json.optJSONObject("state")

            if (vaultId <= 0 || passwordStoreState == null) {
                Log.w(TAG, "Missing vaultID or passwordStoreState; skipping upsert")
                return
            }

            val values = ContentValues().apply {
                put("vault_id", vaultId)
                put("password_store_state", passwordStoreState.toString())
            }

            dbHelper.writableDatabase.insertWithOnConflict(
                "password_store_states",
                null,
                values,
                android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upsert passwordStoreState", e)
        }
    }

    fun upsertUserVault(entityJson: String) {
        try {
            val json = JSONObject(entityJson)
            val userVaultId = json.optInt("userVaultID", -1)
            val vaultId = json.optInt("vaultID", -1)
            val vaultKey = json.optString("vaultKey", "")

            if (userVaultId <= 0 || vaultId <= 0 || vaultKey.isBlank()) {
                Log.w(TAG, "Missing userVaultID/vaultID/vaultKey; skipping upsert")
                return
            }

            val values = ContentValues().apply {
                put("user_vault_id", userVaultId)
                put("vault_id", vaultId)
                put("vault_key", vaultKey)
            }

            dbHelper.writableDatabase.insertWithOnConflict(
                "user_vaults",
                null,
                values,
                android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upsert userVault", e)
        }
    }

    fun deletePasswordStoreState(vaultId: Int) {
        try {
            dbHelper.writableDatabase.delete(
                "password_store_states",
                "vault_id = ?",
                arrayOf(vaultId.toString())
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete passwordStoreState", e)
        }
    }

    fun deleteUserVault(userVaultId: Int) {
        try {
            dbHelper.writableDatabase.delete(
                "user_vaults",
                "user_vault_id = ?",
                arrayOf(userVaultId.toString())
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete userVault", e)
        }
    }

    companion object {
        private const val TAG = "AutofillSyncHandler"
    }
}

