import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import Transaction from "../Transaction";
import { environment } from "../../Environment";
import { ClientChangeTrackingType } from "@vaultic/shared/Types/ClientServerTypes";

@Entity({ name: "changeTrackings" })
export class ChangeTracking extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment")
    changeTrackingID: number;

    @Index()
    @Column("integer")
    userID: number;

    @Column("integer")
    userVaultID?: number;

    @Column("integer")
    vaultID?: number;

    @Column('integer')
    clientTrackingType: ClientChangeTrackingType;

    @Column("text")
    changes: string;

    @Column('integer')
    changeTime: number;

    /**
     * ID Used to identify what object caused this change. EX: it'll be the ID of the password that was deleted during a delete password change.
     * This is used to prevent related data objects being changed even when the main object (password in this case) wasn't. EX: deleting a password
     * locally, but then it's updated on another device after. Locally, all duplicates passwords, filters, groups, etc. will be updated as well even
     * when we keep the password. 
     */
    @Column('text')
    hintID: string;

    identifier(): number 
    {
        throw this.changeTrackingID;
    }

    entityName(): string 
    {
        return "changeTracking";
    }

    protected createNew(): VaulticEntity
    {
        return new ChangeTracking();
    }

    protected internalGetSignableProperties(): string[]
    {
        return [
            nameof<ChangeTracking>("userID"),
            nameof<ChangeTracking>("userVaultID"),
            nameof<ChangeTracking>("vaultID"),
            nameof<ChangeTracking>("clientTrackingType"),
            nameof<ChangeTracking>('changeTime'),
            nameof<ChangeTracking>('hintID')
        ];
    }

    public getCompressableProperties(): string[]
    {
        return [
            nameof<ChangeTracking>("changes"),
        ];
    }

    public getEncryptableProperties(): string[]
    {
        return [
            nameof<ChangeTracking>("changes"),
        ];
    }

    public static creteAndInsert(key: string, clientTrackingType: ClientChangeTrackingType, changes: string, 
        transaction: Transaction, userID: number, userVaultID?: number, vaultID?: number, hintID?: string)
    {
        const changeTracking = new ChangeTracking().makeReactive();
        changeTracking.clientTrackingType = clientTrackingType;
        changeTracking.changes = changes;
        changeTracking.userID = userID;
        changeTracking.userVaultID = userVaultID ?? -1;
        changeTracking.vaultID = vaultID ?? -1;
        changeTracking.changeTime = Date.now();
        changeTracking.hintID = hintID ?? "";

        transaction.insertEntity(changeTracking, key, () => environment.repositories.changeTrackings);
    }
}