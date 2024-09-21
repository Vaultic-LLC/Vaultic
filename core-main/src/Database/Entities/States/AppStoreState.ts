import { Entity, OneToOne, PrimaryColumn, Column, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { User } from "../User";

@Entity({ name: "appStoreStates" })
export class AppStoreState extends StoreState
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

        return properties;
    }

    public static isValid(appStoreState: Partial<AppStoreState>): boolean
    {
        return !!appStoreState.signatureSecret &&
            !!appStoreState.currentSignature &&
            !!appStoreState.previousSignature &&
            !!appStoreState.state &&
            !!appStoreState.appStoreStateID &&
            !!appStoreState.userID;
    }
}