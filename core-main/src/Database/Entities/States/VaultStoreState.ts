import { Entity, OneToOne, Column, PrimaryColumn, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";
import { IVaultStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, hasValue, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "vaultStoreStates" })
export class VaultStoreState extends StoreState implements IVaultStoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    vaultStoreStateID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @OneToOne(() => Vault, (vault) => vault.vaultStoreState)
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    identifier(): number 
    {
        return this.vaultStoreStateID;
    }

    entityName(): string 
    {
        return "vaultStoreState";
    }

    protected createNew(): VaultStoreState 
    {
        return new VaultStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<VaultStoreState>("vaultStoreStateID"),
            nameof<VaultStoreState>("vaultID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<VaultStoreState>("vaultStoreStateID"));

        return properties;
    }

    public static isValid(vaultStoreState: DeepPartial<VaultStoreState>): boolean
    {
        return hasValue(vaultStoreState.currentSignature) &&
            hasValue(vaultStoreState.previousSignature) &&
            hasValue(vaultStoreState.state) &&
            hasValue(vaultStoreState.vaultStoreStateID) &&
            hasValue(vaultStoreState.vaultID);
    }
}