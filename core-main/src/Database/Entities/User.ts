import { Entity, Column, OneToMany, OneToOne, PrimaryColumn } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity"
import { nameof } from "../../Helpers/TypeScriptHelper"
import { AppStoreState } from "./States/AppStoreState"
import { UserPreferencesStoreState } from "./States/UserPreferencesStoreState"

@Entity({ name: "users" })
export class User extends VaulticEntity
{
    // Matches Server
    @PrimaryColumn("integer")
    userID: number

    // Backed Up
    // Not Encrypted
    @Column("text")
    email: string

    // Not backed up
    // Not encrypted
    @Column("boolean")
    lastUsed: boolean;

    // Not Backed Up
    // Encrypted By Users Master Key
    @Column("text")
    masterKeyHash: string

    // Not Backed Up
    // Encrypted By Users Master Key
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

    // Matches Server
    @Column("integer")
    appStoreStateID: number;

    @OneToOne(() => AppStoreState, (state: AppStoreState) => state.user, { eager: true, cascade: true });
    appStoreState: AppStoreState;

    // matches server
    @Column("integer")
    userPreferencesStoreStateID: number;

    @OneToOne(() => UserPreferencesStoreState, (state: UserPreferencesStoreState) => state.user, { eager: true, cascade: true });
    userPreferencesStoreState: UserPreferencesStoreState;

    @OneToMany(() => UserVault, (uv: UserVault) => uv.user)
    userVaults: UserVault[]

    identifier(): number 
    {
        return this.userID;
    }

    protected createNew(): User
    {
        return new User();
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<User>("userID"),
            nameof<User>("email"),
            // TODO: is signing these an issue since they aren't also backed up? I won't be able to create the same signature
            // on another device then? Maybe just bakup the salt?
            nameof<User>("masterKeyHash"),
            nameof<User>("masterKeySalt"),
            nameof<User>("publicKey"),
            nameof<User>("privateKey"),
            nameof<User>("appStoreStateID"),
            nameof<User>("userPreferencesStoreStateID")
        ];
    }

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<User>("userID")
        ]
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            nameof<User>("masterKeyHash"),
            nameof<User>("masterKeySalt"),
            nameof<User>("privateKey")
        ]);
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<User>("appStoreState"),
            nameof<User>("userPreferencesStoreState")
        ]
    }
}