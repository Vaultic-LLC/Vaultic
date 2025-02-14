import { Entity, OneToOne, Column, PrimaryColumn, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";
import { IValueStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "valueStoreStates" })
export class ValueStoreState extends StoreState implements IValueStoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    valueStoreStateID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @OneToOne(() => Vault, (vault) => vault.valueStoreState)
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    identifier(): number 
    {
        return this.valueStoreStateID;
    }

    entityName(): string 
    {
        return "valueStoreState";
    }

    protected createNew(): ValueStoreState 
    {
        return new ValueStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<ValueStoreState>("valueStoreStateID"),
            nameof<ValueStoreState>("vaultID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<ValueStoreState>("valueStoreStateID"));

        return properties;
    }

    public static isValid(valueStoreState: DeepPartial<ValueStoreState>): boolean
    {
        return !!valueStoreState.currentSignature &&
            !!valueStoreState.previousSignature &&
            !!valueStoreState.state &&
            !!valueStoreState.valueStoreStateID &&
            !!valueStoreState.vaultID;
    }
}