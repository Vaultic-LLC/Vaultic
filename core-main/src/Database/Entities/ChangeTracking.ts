import { EntityState } from "@vaultic/shared/Types/Entities";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "changeTrackings" })
export class ChangeTracking extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment")
    changeTrackingID: number;

    @Column("integer")
    userID: number;

    @Column("text")
    objectID: string;

    @Column("integer")
    objectState: EntityState;

    @Column("integer")
    lastModifiedTime: number;

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
            nameof<ChangeTracking>("objectID"),
            nameof<ChangeTracking>("objectState"),
            nameof<ChangeTracking>("userID")
        ];
    }

    public getEncryptableProperties(): string[]
    {
        return [
            nameof<ChangeTracking>("objectID"),
            nameof<ChangeTracking>("objectState"),
            nameof<ChangeTracking>("userID")
        ];
    }

    public static inserted(userID: number, id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.userID = userID;
        tracking.objectID = id;
        tracking.objectState = EntityState.Inserted;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }

    public static updated(userID: number, id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.userID = userID;
        tracking.objectID = id;
        tracking.objectState = EntityState.Updated;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }

    public static deleted(userID: number, id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.userID = userID;
        tracking.objectID = id;
        tracking.objectState = EntityState.Deleted;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }
}