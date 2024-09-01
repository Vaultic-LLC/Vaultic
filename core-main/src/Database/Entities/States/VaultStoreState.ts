import { Entity, OneToOne, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "vaultStoreStates" })
export class VaultStoreState extends StoreState
{
    // Matches Server
    @Column("integer")
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

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<VaultStoreState>("vaultStoreStateID"));

        return properties;
    }
}