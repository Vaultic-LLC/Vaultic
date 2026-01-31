import Foundation
import AuthenticationServices

struct CredentialIndexEntry {
    let id: String          // Reference to the full credential in the vault
    let domain: String      // eTLD+1
    let username: String    // Display label
}

final class SharedIndexStore {
    // TODO: replace with your App Group identifier
    private let appGroupId = "group.com.example.vaultic.TODO_REPLACE_APP_GROUP"

    // TODO: wire up real storage (e.g., App Group container + Keychain access group).
    func loadIndex(matching domains: [String]) -> [CredentialIndexEntry] {
        // Placeholder: return empty until storage is connected.
        return []
    }

    // TODO: decrypt and return full credential using the vault keys from Keychain access group.
    func loadCredential(for id: String) -> ASPasswordCredential? {
        return nil
    }
}

