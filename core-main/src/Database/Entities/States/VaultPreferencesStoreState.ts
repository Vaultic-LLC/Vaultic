import { Entity, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { UserVault } from "../UserVault";

@Entity({ name: "vaultPreferencesStoreStates" })
export class VaultPreferencesStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
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

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<VaultPreferencesStoreState>("vaultPreferencesStoreStateID"));

        return properties;
    }
}