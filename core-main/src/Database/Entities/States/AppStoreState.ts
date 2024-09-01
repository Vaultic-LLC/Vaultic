import { Entity, JoinColumn, OneToOne } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { User } from "../User";

@Entity({ name: "appStoreStates" })
export class AppStoreState extends StoreState
{
    // Matches Server
    @Column("integer")
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

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<AppStoreState>("appStoreStateID"));

        return properties;
    }
}