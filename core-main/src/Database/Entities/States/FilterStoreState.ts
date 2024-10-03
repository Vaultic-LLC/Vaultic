import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { DeepPartial, nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "filterStoreStates" })
export class FilterStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    filterStoreStateID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @OneToOne(() => Vault, (vault) => vault.filterStoreState)
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    identifier(): number 
    {
        return this.filterStoreStateID;
    }

    protected createNew(): FilterStoreState 
    {
        return new FilterStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<FilterStoreState>("filterStoreStateID"),
            nameof<FilterStoreState>("vaultID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<FilterStoreState>("filterStoreStateID"));

        return properties;
    }

    public static isValid(filterStoreState: DeepPartial<FilterStoreState>): boolean
    {
        return !!filterStoreState.signatureSecret &&
            !!filterStoreState.currentSignature &&
            !!filterStoreState.previousSignature &&
            !!filterStoreState.state &&
            !!filterStoreState.filterStoreStateID &&
            !!filterStoreState.vaultID;
    }
}