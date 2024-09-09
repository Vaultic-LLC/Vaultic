import { Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { User } from "../User";

@Entity({ name: "appStoreStates" })
export class AppStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    appStoreStateID: number

    @OneToOne(() => User, (user: User) => user.appStoreState);
    @JoinColumn({ name: "appStoreStateID" })
    user: User;

    identifier(): number 
    {
        return this.appStoreStateID;
    }

    protected createNew(): AppStoreState 
    {
        return new AppStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<AppStoreState>("appStoreStateID"));

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<AppStoreState>("appStoreStateID"));

        return properties;
    }
}