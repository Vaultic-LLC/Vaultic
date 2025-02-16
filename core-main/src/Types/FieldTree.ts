import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../Database/Entities/States/StoreState";
import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { SharedClientUserVault } from "@vaultic/shared/Types/Entities";

export interface FieldTree
{
    properties?: string[];
    nestedProperties?: { [key: string]: FieldTree };
    canCrypt?: (obj: any) => boolean;
}

const storeStateE2EEncryptableProperties = [
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
                    properties: [nameof<User>("masterKeyEncryptionAlgorithm"), nameof<User>("privateSigningKey"), nameof<User>("privateEncryptingKey")],
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
                    properties: [nameof<UserVault>("vaultKey")],
                    nestedProperties: {
                        vaultPreferencesStoreState: {
                            properties: storeStateE2EEncryptableProperties
                        }
                    }
                },
                sharedUserVaults: {
                    canCrypt: (uv: SharedClientUserVault) => uv.isSetup,
                    properties: [nameof<UserVault>("vaultKey")],
                    nestedProperties: {
                        vaultPreferencesStoreState: {
                            properties: storeStateE2EEncryptableProperties
                        }
                    }
                },
                // archivedVaults: {
                //     properties: [nameof<UserVault>("vaultKey")]
                // }
            }
        }
    }
};