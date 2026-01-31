import UIKit
import AuthenticationServices

final class CredentialProviderViewController: ASCredentialProviderViewController {
    private let indexStore = SharedIndexStore()
    private var matches: [CredentialIndexEntry] = []

    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        // Map service identifiers (usually domains) to your index.
        let domains = serviceIdentifiers.map { $0.identifier }
        matches = indexStore.loadIndex(matching: domains)

        // TODO: update your UI (e.g., table/list) with `matches`.
        // If exactly one strong match and you want auto-fill, you can call userDidSelect(entry:)
        // directly after confirming the user’s intent policy.
    }

    override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
        guard
            let recordId = credentialIdentity.recordIdentifier,
            let credential = indexStore.loadCredential(for: recordId)
        else {
            let error = NSError(domain: ASExtensionErrorDomain,
                                code: ASExtensionError.failed.rawValue,
                                userInfo: [NSLocalizedDescriptionKey: "No matching credential found (placeholder)."])
            extensionContext.cancelRequest(withError: error)
            return
        }

        extensionContext.completeRequest(withSelectedCredential: credential, completionHandler: nil)
    }

    // Call this from your list UI when the user taps a credential row.
    func userDidSelect(entry: CredentialIndexEntry) {
        guard let credential = indexStore.loadCredential(for: entry.id) else {
            let error = NSError(domain: ASExtensionErrorDomain,
                                code: ASExtensionError.failed.rawValue,
                                userInfo: [NSLocalizedDescriptionKey: "Unable to load credential (placeholder)."])
            extensionContext.cancelRequest(withError: error)
            return
        }

        extensionContext.completeRequest(withSelectedCredential: credential, completionHandler: nil)
    }

    // Hook this up to a Cancel button if you present custom UI.
    @IBAction func cancel() {
        let error = NSError(domain: ASExtensionErrorDomain,
                            code: ASExtensionError.userCanceled.rawValue,
                            userInfo: nil)
        extensionContext.cancelRequest(withError: error)
    }
}

