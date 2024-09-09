import { Entity, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "filterStoreStates" })
export class FilterStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    filterStoreStateID: number

    @OneToOne(() => Vault, (vault) => vault.filterStoreState)
    @JoinColumn({ name: "filterStoreStateID" })
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
        properties.push(nameof<FilterStoreState>("filterStoreStateID"));

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<FilterStoreState>("filterStoreStateID"));

        return properties;
    }
}