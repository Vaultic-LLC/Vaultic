import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { UserVault } from "../UserVault";
import { IVaultPreferencesStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "vaultPreferencesStoreStates" })
export class VaultPreferencesStoreState extends StoreState implements IVaultPreferencesStoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    vaultPreferencesStoreStateID: number

    // Matches Server
    @Column("integer")
    userVaultID: number

    @OneToOne(() => UserVault, (userVault) => userVault.vaultPreferencesStoreState)
    @JoinColumn({ name: "userVaultID" })
    userVault: UserVault;

    identifier(): number 
    {
        return this.vaultPreferencesStoreStateID;
    }

    entityName(): string 
    {
        return "vaultPreferencesStoreState";
    }

    // vaultPreferences isn't encrypted
    getEncryptableProperties(): string[]
    {
        return [];
    }

    protected createNew(): VaultPreferencesStoreState 
    {
        return new VaultPreferencesStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<VaultPreferencesStoreState>("vaultPreferencesStoreStateID"));
        properties.push(nameof<VaultPreferencesStoreState>("userVaultID"));

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<VaultPreferencesStoreState>("vaultPreferencesStoreStateID"));

        return properties;
    }

    public static isValid(vaultPreferncesStoreState: DeepPartial<VaultPreferencesStoreState>): boolean
    {
        return !!vaultPreferncesStoreState.currentSignature &&
            !!vaultPreferncesStoreState.previousSignature &&
            !!vaultPreferncesStoreState.state &&
            !!vaultPreferncesStoreState.vaultPreferencesStoreStateID &&
            !!vaultPreferncesStoreState.userVaultID;
    }
}