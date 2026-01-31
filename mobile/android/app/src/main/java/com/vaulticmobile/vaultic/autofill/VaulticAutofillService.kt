package com.vaulticmobile.vaultic.autofill

import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.net.Uri
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveRequest
import android.text.InputType
import android.util.Log
import android.view.View
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import com.vaulticmobile.vaultic.R
import com.vaulticmobile.vaultic.autofill.AutofillKeyCache
import com.vaulticmobile.vaultic.autofill.XChaCha20Poly1305
import org.json.JSONObject
import java.util.Locale

private const val TAG = "VaulticAutofillService"

data class CredentialCandidate(
    val username: String,
    val password: String,
    val domain: String?,
    val vaultId: Int
)

class VaulticAutofillService : AutofillService() {

    private val dbHelper by lazy { AutofillSyncDbHelper(applicationContext) }

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts.lastOrNull()?.structure
        val response = buildResponse(structure)
        callback.onSuccess(response)
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        // TODO: capture newly entered credentials and store into the vault/index.
        callback.onSuccess()
    }

    private fun buildResponse(structure: AssistStructure?): FillResponse? {
        if (structure == null) return null

        val (usernameId, passwordId, webDomainOrPackage) = findFields(structure)
        if (usernameId == null || passwordId == null) {
            Log.d(TAG, "No username/password fields detected.")
            return null
        }

        // Require biometric unlock first if no cached key; use an existing autofillId as placeholder.
        val cachedAuth = AutofillKeyCache.get()
        if (cachedAuth == null) {
            val placeholderId = usernameId ?: passwordId
            return placeholderId?.let { buildUnlockResponse(it) }
        }

        val candidates = loadCandidates(cachedAuth)
        val filtered = filterByDomain(candidates, webDomainOrPackage)
        if (filtered.isEmpty()) {
            Log.d(TAG, "No matching credentials for domain/package: $webDomainOrPackage")
            return null
        }

        val builder = FillResponse.Builder()
        filtered.take(5).forEach { cred ->
            builder.addDataset(
                buildDataset(
                    usernameId,
                    passwordId,
                    cred.username,
                    cred.password,
                    cred.username
                )
            )
        }
        return builder.build()
    }

    private fun buildUnlockResponse(fieldId: AutofillId): FillResponse {
        val intent = PendingIntent.getActivity(
            this,
            0,
            android.content.Intent(this, BiometricUnlockActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val presentation = RemoteViews(packageName, R.layout.autofill_dataset_item).apply {
            setTextViewText(R.id.autofill_username, "Unlock with biometrics")
            setImageViewResource(R.id.autofill_logo, R.drawable.ic_autofill_logo)
        }

        val dataset = Dataset.Builder()
            .setAuthentication(intent.intentSender)
            // Use a real field id; value is not autofilled, just required for auth dataset.
            .setValue(fieldId, null, presentation)
            .build()

        return FillResponse.Builder()
            .setAuthentication(arrayOf(fieldId), intent.intentSender, presentation)
            .addDataset(dataset)
            .build()
    }

    private fun loadCandidates(cachedAuth: CachedAuth): List<CredentialCandidate> {
        val db = dbHelper.readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT p.vault_id, p.password_store_state, u.vault_key
            FROM password_store_states p
            LEFT JOIN user_vaults u ON u.vault_id = p.vault_id
            """.trimIndent(),
            emptyArray()
        )

        val results = mutableListOf<CredentialCandidate>()
        cursor.use { c ->
            val vaultIdx = c.getColumnIndex("vault_id")
            val stateIdx = c.getColumnIndex("password_store_state")
            val keyIdx = c.getColumnIndex("vault_key")
            while (c.moveToNext()) {
                val vaultId = c.getInt(vaultIdx)
                val stateJson = c.getString(stateIdx) ?: continue
                val vaultKeyEnc = c.getString(keyIdx)
                if (vaultKeyEnc.isNullOrBlank()) continue
                results += extractCredentialsFromPasswordStoreState(
                    vaultId,
                    stateJson,
                    vaultKeyEnc,
                    cachedAuth.masterKey
                )
            }
        }
        return results
    }

    private fun extractCredentialsFromPasswordStoreState(
        vaultId: Int,
        stateJson: String,
        vaultKeyEncryptedHex: String,
        masterKeyHex: String
    ): List<CredentialCandidate> {
        return try {
            val vaultKeyBytes = XChaCha20Poly1305.decrypt(masterKeyHex, vaultKeyEncryptedHex)
                ?: return emptyList()
            val vaultKeyHex = bytesToHex(vaultKeyBytes)

            val decryptedStateBytes = XChaCha20Poly1305.decrypt(vaultKeyHex, stateJson)
                ?: return emptyList()
            val root = JSONObject(String(decryptedStateBytes, Charsets.UTF_8))
            val passwordsByDomain = root.optJSONObject("o") ?: return emptyList()
            val passwordsById = root.optJSONObject("p") ?: return emptyList()

            val results = mutableListOf<CredentialCandidate>()
            passwordsByDomain.keys().forEach { domainKey ->
                val idsForDomain = passwordsByDomain.optJSONObject(domainKey) ?: return@forEach
                idsForDomain.keys().forEach { passwordId ->
                    val pwdObj = passwordsById.optJSONObject(passwordId) ?: return@forEach
                    val username = pwdObj.optString("l", pwdObj.optString("e", ""))
                    val passwordEnc = pwdObj.optString("p", "")
                    if (username.isBlank() || passwordEnc.isBlank()) return@forEach

                    val passwordBytes = XChaCha20Poly1305.decrypt(vaultKeyHex, passwordEnc) ?: return@forEach
                    val password = String(passwordBytes, Charsets.UTF_8)
                    if (password.isBlank()) return@forEach

                    results.add(
                        CredentialCandidate(
                            username = username,
                            password = password,
                            domain = domainKey,
                            vaultId = vaultId
                        )
                    )
                }
            }
            results
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse password_store_state JSON", e)
            emptyList()
        }
    }

    private fun filterByDomain(
        candidates: List<CredentialCandidate>,
        domainOrPackage: String?
    ): List<CredentialCandidate> {
        if (domainOrPackage.isNullOrBlank()) return candidates
        val target = normalizeHost(domainOrPackage)
        if (target.isNullOrBlank()) return candidates

        val matched = candidates.filter { cand ->
            val candHost = normalizeHost(cand.domain)
            candHost != null && (candHost.contains(target) || target.contains(candHost))
        }
        return if (matched.isNotEmpty()) matched else candidates
    }

    private data class FieldResult(
        val usernameId: AutofillId?,
        val passwordId: AutofillId?,
        val domainOrPackage: String?
    )

    private fun findFields(structure: AssistStructure): FieldResult {
        var usernameId: AutofillId? = null
        var passwordId: AutofillId? = null
        var domainOrPackage: String? = structure.activityComponent?.packageName

        val nodes = mutableListOf<AssistStructure.ViewNode>()
        for (i in 0 until structure.windowNodeCount) {
            val root = structure.getWindowNodeAt(i).rootViewNode
            collectNodes(root, nodes)
        }

        nodes.forEach { node ->
            val hints = node.autofillHints?.map { it.lowercase(Locale.US) } ?: emptyList()
            val inputType = node.inputType

            if (usernameId == null && isUsernameField(hints, inputType)) {
                usernameId = node.autofillId
            }
            if (passwordId == null && isPasswordField(hints, inputType)) {
                passwordId = node.autofillId
            }

            // Try to glean domain from HTML info if present (browsers/WebViews)
            node.htmlInfo
                ?.takeIf { domainOrPackage == structure.activityComponent?.packageName }
                ?.attributes
                ?.let { attrs ->
                    for (attr in attrs) {
                        val name = attr.first.lowercase(Locale.US)
                        val value = attr.second
                        if (name == "action" || name == "href") {
                            domainOrPackage = extractHost(value) ?: domainOrPackage
                        }
                    }
                }
        }

        return FieldResult(usernameId, passwordId, domainOrPackage)
    }

    private fun collectNodes(node: AssistStructure.ViewNode, out: MutableList<AssistStructure.ViewNode>) {
        out.add(node)
        for (i in 0 until node.childCount) {
            node.getChildAt(i)?.let { collectNodes(it, out) }
        }
    }

    private fun isUsernameField(hints: List<String>, inputType: Int): Boolean {
        if (hints.any { it.contains("username") || it.contains("email") }) return true
        val klass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        return klass == InputType.TYPE_CLASS_TEXT &&
            (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
             variation == InputType.TYPE_TEXT_VARIATION_PERSON_NAME ||
             variation == InputType.TYPE_TEXT_VARIATION_NORMAL)
    }

    private fun isPasswordField(hints: List<String>, inputType: Int): Boolean {
        if (hints.any { it.contains("password") }) return true
        val klass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        return klass == InputType.TYPE_CLASS_TEXT &&
            (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
             variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
             variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD)
    }

    private fun extractHost(url: String?): String? {
        if (url.isNullOrBlank()) return null
        return try {
            Uri.parse(url).host
        } catch (e: Exception) {
            null
        }
    }

    private fun normalizeHost(hostOrPackage: String?): String? {
        if (hostOrPackage.isNullOrBlank()) return null
        var host = hostOrPackage.lowercase(Locale.US)
        if (host.startsWith("www.")) host = host.removePrefix("www.")
        return host
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }

    private fun buildDataset(
        usernameId: AutofillId,
        passwordId: AutofillId,
        username: String,
        password: String,
        displayLabel: String
    ): Dataset {
        val presentation = RemoteViews(packageName, R.layout.autofill_dataset_item).apply {
            setTextViewText(R.id.autofill_username, displayLabel)
            // TODO: replace ic_autofill_logo with branded asset.
            setImageViewResource(R.id.autofill_logo, R.drawable.ic_autofill_logo)
        }

        return Dataset.Builder()
            .setValue(usernameId, AutofillValue.forText(username), presentation)
            .setValue(passwordId, AutofillValue.forText(password), presentation)
            .build()
    }
}