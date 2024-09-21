import { Entity, OneToOne, Column, PrimaryColumn, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "valueStoreStates" })
export class ValueStoreState extends StoreState
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

    public static isValid(valueStoreState: Partial<ValueStoreState>): boolean
    {
        return !!valueStoreState.signatureSecret &&
            !!valueStoreState.currentSignature &&
            !!valueStoreState.previousSignature &&
            !!valueStoreState.state &&
            !!valueStoreState.valueStoreStateID &&
            !!valueStoreState.vaultID;
    }
}