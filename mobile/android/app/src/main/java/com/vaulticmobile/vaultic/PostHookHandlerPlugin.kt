package com.vaulticmobile.vaultic

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod
import com.vaulticmobile.vaultic.autofill.AutofillSyncHandler

@CapacitorPlugin(name = "PostHookHandler")
class PostHookHandlerPlugin : Plugin() {

    private val syncHandler by lazy { AutofillSyncHandler(context.applicationContext) }

    @PluginMethod
    fun postInsert(call: PluginCall) {
        handleUpsert(call)
    }

    @PluginMethod
    fun postUpdate(call: PluginCall) {
        handleUpsert(call)
    }

    @PluginMethod
    fun postOverride(call: PluginCall) {
        handleUpsert(call)
    }

    @PluginMethod
    fun postDelete(call: PluginCall) {
        val table = call.getString("table")
        val findBy = call.getInt("findBy")

        if (table == "passwordStoreStates" && findBy != null) {
            syncHandler.deletePasswordStoreState(findBy)
        } else if (table == "userVaults" && findBy != null) {
            syncHandler.deleteUserVault(findBy)
        }

        call.resolve()
    }

    private fun handleUpsert(call: PluginCall) {
        val table = call.getString("table")
        val entityJson = call.getString("entity")

        if (entityJson.isNullOrEmpty()) {
            call.resolve()
            return
        }

        when (table) {
            "passwordStoreStates" -> syncHandler.upsertPasswordStoreState(entityJson)
            "userVaults" -> syncHandler.upsertUserVault(entityJson)
        }
        call.resolve()
    }
}