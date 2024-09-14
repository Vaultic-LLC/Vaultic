import { Entity, PrimaryColumn, OneToOne, Column, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
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

    // userPreferences isn't encrypted
    async lock(key: string): Promise<boolean> 
    {
        return true;
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

        return properties;
    }
}