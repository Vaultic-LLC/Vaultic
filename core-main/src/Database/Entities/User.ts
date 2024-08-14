import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity"

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

    protected getSignatureMakeup(): any
    {
        return {
            signatureSecret: this.signatureSecret,
            userID: this.userID,
            email: this.email,
            masterKeyHash: this.masterKeyHash,
            masterKeySalt: this.masterKeySalt,
            publicKey: this.publicKey,
            privateKey: this.privateKey
        };
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            "masterKeyHash", "masterKeySalt", "privateKey", "appStoreState", "userPreferencesStoreState"]);
    }

    protected internalGetBackup() 
    {
        return {
            publicKey: this.publicKey,
            privateKey: this.privateKey,
            appStoreState: this.appStoreState,
            userPreferencesStoreState: this.userPreferencesStoreState
        }
    }
}