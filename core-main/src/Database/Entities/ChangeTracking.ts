import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreType } from "@vaultic/shared/Types/Stores";
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
    vaultID?: number;

    @Column('integer')
    clientTrackingType: ClientChangeTrackingType;

    @Column("text")
    changes: string;

    @Column('integer')
    changeTime: number;

    identifier(): number 
    {
        throw this.changeTrackingID;
    }

    entityName(): string 
    {
        return "ledger";
    }

    protected createNew(): VaulticEntity
    {
        return new ChangeTracking();
    }

    protected internalGetSignableProperties(): string[]
    {
        return [];
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
            nameof<ChangeTracking>("userID"),
            nameof<ChangeTracking>("vaultID"),
            nameof<ChangeTracking>("clientTrackingType"),
            nameof<ChangeTracking>("changeTime"),
            nameof<ChangeTracking>("changes"),
        ];
    }

    public static creteAndInsert(key: string, clientTrackingType: ClientChangeTrackingType, changes: string, transaction: Transaction, userID: number, vaultID?: number)
    {
        const changeTracking = new ChangeTracking();
        changeTracking.clientTrackingType = clientTrackingType;
        changeTracking.changes = changes;
        changeTracking.userID = userID;
        changeTracking.vaultID = vaultID;
        changeTracking.changeTime = Date.now();

        transaction.insertEntity(changeTracking, key, () => environment.repositories.changeTrackings);
    }
}