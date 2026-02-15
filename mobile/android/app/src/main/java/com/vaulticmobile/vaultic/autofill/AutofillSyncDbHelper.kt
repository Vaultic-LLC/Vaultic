package com.vaulticmobile.vaultic.autofill

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

private const val DB_NAME = "autofill_index.db"
private const val DB_VERSION = 2
private const val TABLE = "password_store_states"
private const val USER_VAULTS = "user_vaults"

/**
 * Lightweight SQLite helper to store password store states keyed by vaultID.
 * Accessible by both the AutofillService and the Capacitor plugin (same app UID).
 */
internal class AutofillSyncDbHelper(context: Context) :
    SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE (
                vault_id INTEGER PRIMARY KEY,
                password_store_state TEXT NOT NULL
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $USER_VAULTS (
                user_vault_id INTEGER PRIMARY KEY,
                vault_id INTEGER NOT NULL,
                vault_key TEXT NOT NULL
            );
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS $USER_VAULTS (
                    user_vault_id INTEGER PRIMARY KEY,
                    vault_id INTEGER NOT NULL,
                    vault_key TEXT NOT NULL
                );
                """.trimIndent()
            )
        }
    }
}

