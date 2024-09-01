import { Entity, OneToOne, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { UserVault } from "../UserVault";

@Entity({ name: "vaultPreferencesStoreStates" })
export class VaultPreferencesStoreState extends StoreState
{
    // Matches Server
    @Column("integer")
    vaultPreferencesStoreStateID: number

    @OneToOne(() => UserVault, (userVault) => userVault.vaultPreferencesStoreState)
    @JoinColumn({ name: "vaultPreferencesStoreStateID" })
    userVault: UserVault;

    identifier(): number 
    {
        return this.vaultPreferencesStoreStateID;
    }

    protected createNew(): VaultPreferencesStoreState 
    {
        return new VaultPreferencesStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<VaultPreferencesStoreState>("vaultPreferencesStoreStateID"));

        return properties;
    }

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<VaultPreferencesStoreState>("vaultPreferencesStoreStateID"));

        return properties;
    }
}