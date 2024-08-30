import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity"
import { nameof } from "../../Helpers/TypeScriptHelper"

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

    // Backed up
    // Encrypted by Users Master Key
    @Column("text")
    appStoreState: string;

    // Backed Up
    // Not Encrypted
    @Column("text")
    userPreferencesStoreState: string;

    @OneToMany(() => UserVault, (uv: UserVault) => uv.user)
    userVaults: UserVault[]

    identifier(): number 
    {
        return this.userID;
    }

    protected createNew(): VaulticEntity
    {
        return new User();
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<User>("userID"),
            nameof<User>("email"),
            nameof<User>("masterKeyHash"),
            nameof<User>("masterKeySalt"),
            nameof<User>("publicKey"),
            nameof<User>("privateKey"),
            nameof<User>("appStoreState")
        ];
    }

    protected internalGetBackupableProperties(): string[] 
    {
        return [
            nameof<User>("userID"),
            nameof<User>("publicKey"),
            nameof<User>("privateKey"),
            nameof<User>("appStoreState"),
            nameof<User>("userPreferencesStoreState")
        ];
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            nameof<User>("masterKeyHash"),
            nameof<User>("masterKeySalt"),
            nameof<User>("privateKey"),
            nameof<User>("appStoreState")
        ]);
    }
}