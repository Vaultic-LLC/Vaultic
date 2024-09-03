import { Entity, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "valueStoreStates" })
export class ValueStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    valueStoreStateID: number

    @OneToOne(() => Vault, (vault) => vault.valueStoreState)
    @JoinColumn({ name: "valueStoreStateID" })
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
        properties.push(nameof<ValueStoreState>("valueStoreStateID"));

        return properties;
    }

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<ValueStoreState>("valueStoreStateID"));

        return properties;
    }
}