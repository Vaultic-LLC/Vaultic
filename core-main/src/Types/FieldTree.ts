import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../Database/Entities/States/StoreState";
import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";

export interface FieldTree
{
    properties?: string[];
    nestedProperties?: { [key: string]: FieldTree };
}

const vaulticEntityE2EEncryptableProperties = [
    nameof<VaulticEntity>("signatureSecret")
];

const storeStateE2EEncryptableProperties = [
    ...vaulticEntityE2EEncryptableProperties,
    nameof<StoreState>("state")
];

export const userDataE2EEncryptedFieldTree: FieldTree =
{
    properties: [],
    nestedProperties: {
        userDataPayload: {
            properties: [],
            nestedProperties: {
                user: {
                    properties: [...vaulticEntityE2EEncryptableProperties, nameof<User>("privateKey")],
                    nestedProperties: {
                        appStoreState: {
                            properties: storeStateE2EEncryptableProperties,
                        },
                        userPreferencesStoreState: {
                            properties: storeStateE2EEncryptableProperties
                        }
                    }
                },
                userVaults: {
                    properties: [...vaulticEntityE2EEncryptableProperties, nameof<UserVault>("vaultKey")],
                    nestedProperties: {
                        vaultPreferencesStoreState: {
                            properties: storeStateE2EEncryptableProperties
                        }
                    }
                },
                archivedVaults: {
                    properties: [nameof<UserVault>("vaultKey")]
                }
            }
        }
    }
};