import { Entity, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "vaultStoreStates" })
export class VaultStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    vaultStoreStateID: number

    @OneToOne(() => Vault, (vault) => vault.vaultStoreState)
    @JoinColumn({ name: "vaultStoreStateID" })
    vault: Vault;

    identifier(): number 
    {
        return this.vaultStoreStateID;
    }

    protected createNew(): VaultStoreState 
    {
        return new VaultStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<VaultStoreState>("vaultStoreStateID"));

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<VaultStoreState>("vaultStoreStateID"));

        return properties;
    }
}