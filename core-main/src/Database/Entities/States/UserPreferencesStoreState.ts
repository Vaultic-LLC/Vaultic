import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";
import { DeepPartial, nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { User } from "../User";

@Entity({ name: "userPreferencesStoreStates" })
export class UserPreferencesStoreState extends StoreState
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
        return !!userPreferncesStoreState.signatureSecret &&
            !!userPreferncesStoreState.currentSignature &&
            !!userPreferncesStoreState.previousSignature &&
            !!userPreferncesStoreState.state &&
            !!userPreferncesStoreState.userPreferencesStoreStateID &&
            !!userPreferncesStoreState.userID;
    }
}