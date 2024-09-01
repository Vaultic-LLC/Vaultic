import { Entity, OneToOne, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "filterStoreStates" })
export class FilterStoreState extends StoreState
{
    // Matches Server
    @Column("integer")
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

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<FilterStoreState>("filterStoreStateID"));

        return properties;
    }
}