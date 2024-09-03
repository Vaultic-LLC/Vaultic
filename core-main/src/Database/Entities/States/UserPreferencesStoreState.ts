import { Entity, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { User } from "../User";

@Entity({ name: "userPreferencesStoreStates" })
export class UserPreferencesStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    userPreferencesStoreStateID: number

    @OneToOne(() => User, (user: User) => user.userPreferencesStoreState)
    @JoinColumn({ name: "userPreferencesStoreStateID" })
    user: User;

    identifier(): number 
    {
        return this.userPreferencesStoreStateID;
    }

    protected createNew(): UserPreferencesStoreState 
    {
        return new UserPreferencesStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<UserPreferencesStoreState>("userPreferencesStoreStateID"));

        return properties;
    }

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<UserPreferencesStoreState>("userPreferencesStoreStateID"));

        return properties;
    }
}