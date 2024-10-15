import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { DeepPartial, nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "groupStoreStates" })
export class GroupStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    groupStoreStateID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @OneToOne(() => Vault, (vault) => vault.groupStoreState)
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    identifier(): number 
    {
        return this.groupStoreStateID;
    }

    entityName(): string 
    {
        return "groupStoreState";
    }

    protected createNew(): GroupStoreState 
    {
        return new GroupStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<GroupStoreState>("groupStoreStateID"),
            nameof<GroupStoreState>("vaultID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<GroupStoreState>("groupStoreStateID"));

        return properties;
    }

    public static isValid(groupStoreState: DeepPartial<GroupStoreState>): boolean
    {
        return !!groupStoreState.signatureSecret &&
            !!groupStoreState.currentSignature &&
            !!groupStoreState.previousSignature &&
            !!groupStoreState.state &&
            !!groupStoreState.groupStoreStateID &&
            !!groupStoreState.vaultID;
    }
}