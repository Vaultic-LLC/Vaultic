import { Entity, Column, OneToMany, OneToOne, PrimaryColumn } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity"
import { AppStoreState } from "./States/AppStoreState"
import { UserPreferencesStoreState } from "./States/UserPreferencesStoreState"
import { IUser } from "@vaultic/shared/Types/Entities"
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper"

@Entity({ name: "users" })
export class User extends VaulticEntity implements IUser
{
    // Matches Server
    @PrimaryColumn("integer")
    userID: number

    // Backed Up
    // Not Encrypted
    @Column("text")
    email: string;

    // Backed Up
    // Not Encrypted
    @Column("text")
    firstName: string;

    // Backed Up
    // Not Encrypted
    @Column("text")
    lastName: string;

    // Not backed up
    // Not encrypted
    @Column("boolean")
    lastUsed: boolean;

    // Not Backed Up
    // Encrypted By Users Master Key
    // Not an issue if this is tampered with since we regenerate it every time the user logs in
    @Column("text")
    masterKeyHash: string

    // Not Backed Up
    // Encrypted By Users Master Key
    // Not an issue if this is tampered with since we regenerate it every time the user logs in
    @Column("text")
    masterKeySalt: string

    // Backed Up
    // Not Encrypted
    @Column("text")
    publicKey: string

    // Backed Up
    // Encrypted By Users Master Key
    @Column("text")
    privateKey: string

    @OneToOne(() => AppStoreState, (state: AppStoreState) => state.user, { eager: true })
    appStoreState: AppStoreState;

    @OneToOne(() => UserPreferencesStoreState, (state: UserPreferencesStoreState) => state.user, { eager: true })
    userPreferencesStoreState: UserPreferencesStoreState;

    @OneToMany(() => UserVault, (uv: UserVault) => uv.user)
    userVaults: UserVault[]

    identifier(): number 
    {
        return this.userID;
    }

    entityName(): string 
    {
        return "user";
    }

    protected createNew(): User
    {
        return new User();
    }

    // Make sure this are included in repository.updateFromServer() so the signature can be re built properly when
    // returning data from the server
    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<User>("userID"),
            nameof<User>("email"),
            nameof<User>("firstName"),
            nameof<User>("lastName"),
            nameof<User>("publicKey"),
            nameof<User>("privateKey")
        ];
    }

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<User>("userID")
        ]
    }

    public backupableProperties(): string[]
    {
        const properties = super.backupableProperties();
        properties.push(nameof<User>("userID"));
        properties.push(nameof<User>("email"));
        properties.push(nameof<User>("firstName"));
        properties.push(nameof<User>("lastName"));

        return properties;
    }

    getEncryptableProperties(): string[]
    {
        return [
            nameof<User>("masterKeyHash"),
            nameof<User>("masterKeySalt")
        ];
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<User>("appStoreState"),
            nameof<User>("userPreferencesStoreState")
        ]
    }

    protected getNestedVaulticEntities(): string[] 
    {
        return [
            nameof<User>("appStoreState")
        ];
    }

    public static isValid(user: DeepPartial<User>): boolean
    {
        return !!user.signatureSecret &&
            !!user.currentSignature &&
            !!user.userID &&
            !!user.email &&
            !!user.firstName &&
            !!user.lastName &&
            !!user.publicKey &&
            !!user.privateKey &&
            !!user.appStoreState &&
            !!user.userPreferencesStoreState &&
            AppStoreState.isValid(user.appStoreState) &&
            UserPreferencesStoreState.isValid(user.userPreferencesStoreState);
    }
}