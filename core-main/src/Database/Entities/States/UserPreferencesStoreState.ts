import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { User } from "../User";
import { IUserPreferencesStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "userPreferencesStoreStates" })
export class UserPreferencesStoreState extends StoreState implements IUserPreferencesStoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    userPreferencesStoreStateID: number

    // Matches Server
    @Column("integer")
    userID: number

    @OneToOne(() => User, (user: User) => user.userPreferencesStoreState)
    @JoinColumn({ name: "userID" })
    user: User;

    identifier(): number 
    {
        return this.userPreferencesStoreStateID;
    }

    entityName(): string 
    {
        return "userPreferencesStoreState";
    }

    // userPreferences isn't encrypted
    getEncryptableProperties(): string[]
    {
        return [];
    }

    protected createNew(): UserPreferencesStoreState 
    {
        return new UserPreferencesStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(
            nameof<UserPreferencesStoreState>("userPreferencesStoreStateID"),
            nameof<UserPreferencesStoreState>("userID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<UserPreferencesStoreState>("userPreferencesStoreStateID"));
        properties.push(nameof<UserPreferencesStoreState>("userID"));

        return properties;
    }

    public static isValid(userPreferncesStoreState: DeepPartial<UserPreferencesStoreState>): boolean
    {
        return !!userPreferncesStoreState.currentSignature &&
            !!userPreferncesStoreState.previousSignature &&
            !!userPreferncesStoreState.state &&
            !!userPreferncesStoreState.userPreferencesStoreStateID &&
            !!userPreferncesStoreState.userID;
    }
}