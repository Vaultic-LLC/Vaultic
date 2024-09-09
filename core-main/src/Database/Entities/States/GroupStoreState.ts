import { Entity, OneToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "groupStoreStates" })
export class GroupStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    groupStoreStateID: number

    @OneToOne(() => Vault, (vault) => vault.filterStoreState)
    @JoinColumn({ name: "groupStoreStateID" })
    vault: Vault;

    identifier(): number 
    {
        return this.groupStoreStateID;
    }

    protected createNew(): GroupStoreState 
    {
        return new GroupStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<GroupStoreState>("groupStoreStateID"));

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<GroupStoreState>("groupStoreStateID"));

        return properties;
    }
}