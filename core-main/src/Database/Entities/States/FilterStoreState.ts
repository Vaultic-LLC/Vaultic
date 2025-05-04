import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";
import { IFilterStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, hasValue, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "filterStoreStates" })
export class FilterStoreState extends StoreState implements IFilterStoreState
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

    entityName(): string 
    {
        return "filterStoreState";
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
        return hasValue(filterStoreState.currentSignature) &&
            hasValue(filterStoreState.previousSignature) &&
            hasValue(filterStoreState.state) &&
            hasValue(filterStoreState.filterStoreStateID) &&
            hasValue(filterStoreState.vaultID);
    }
}