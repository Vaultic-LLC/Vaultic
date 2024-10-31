import { EntityState } from "@vaultic/shared/Types/Entities";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

// TODO: this needs to be scoped per user otherwise differnt users changes will get co mingled
@Entity({ name: "changeTrackings" })
export class ChangeTracking extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment")
    changeTrackingID: number

    @Column("text")
    objectID: string

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
        return [nameof<ChangeTracking>("objectID"), nameof<ChangeTracking>("objectState")];
    }

    public getEncryptableProperties(): string[]
    {
        return [nameof<ChangeTracking>("objectID"), nameof<ChangeTracking>("objectState")];
    }

    public static inserted(id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.objectID = id;
        tracking.objectState = EntityState.Inserted;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }

    public static updated(id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.objectID = id;
        tracking.objectState = EntityState.Updated;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }

    public static deleted(id: string, lastModifiedTime: number): ChangeTracking
    {
        const tracking = new ChangeTracking();
        tracking.objectID = id;
        tracking.objectState = EntityState.Deleted;
        tracking.lastModifiedTime = lastModifiedTime;

        return tracking;
    }
}