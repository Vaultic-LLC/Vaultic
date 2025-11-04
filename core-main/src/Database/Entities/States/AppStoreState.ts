import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { User } from "../User";
import { IAppStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, hasValue, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "appStoreStates" })
export class AppStoreState extends StoreState implements IAppStoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    appStoreStateID: number

    // Matches Server
    @Column("integer")
    userID: number

    @OneToOne(() => User, (user: User) => user.appStoreState)
    @JoinColumn({ name: "userID" })
    user: User;

    identifier(): number 
    {
        return this.appStoreStateID;
    }

    entityName(): string 
    {
        return "appStoreState";
    }

    protected createNew(): AppStoreState 
    {
        return new AppStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<AppStoreState>("appStoreStateID"),
            nameof<AppStoreState>("userID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<AppStoreState>("appStoreStateID"));
        properties.push(nameof<AppStoreState>("userID"));

        return properties;
    }

    public static isValid(appStoreState: DeepPartial<AppStoreState>): boolean
    {
        return hasValue(appStoreState.currentSignature) &&
            hasValue(appStoreState.previousSignature) &&
            hasValue(appStoreState.state) &&
            hasValue(appStoreState.appStoreStateID) &&
            hasValue(appStoreState.userID);
    }
}