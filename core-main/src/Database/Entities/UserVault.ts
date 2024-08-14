import { Entity, PrimaryColumn, Column, ManyToOne } from "typeorm"
import { User } from "./User"
import { Vault } from "./Vault"
import { VaulticEntity } from "./VaulticEntity"

@Entity({ name: "userVaults" })
export class UserVault extends VaulticEntity
{
    // Matches Server
    @PrimaryColumn("integer")
    userVaultID: number

    // Matches Server
    @Column("integer")
    userID: number

    @ManyToOne(() => User, (user: User) => user.userVaults)
    user: User

    // Matches Server
    @Column("integer")
    vaultID: number

    @ManyToOne(() => Vault, (vault: Vault) => vault.userVaults)
    vault: Vault;

    // Encrypted by Users Private Key
    // Backed Up
    // In the format { publicKey: string, vaultkey: string }
    @Column("text")
    vaultKey: string

    // Backed Up
    // Not encrypted
    @Column("text")
    vaultPreferencesStoreState: string

    protected getSignatureMakeup(): any
    {
        return {
            signatureSecret: this.signatureSecret,
            userVaultID: this.userVaultID,
            userID: this.userID,
            vaultID: this.vaultID,
            vaultKey: this.vaultKey
        };
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetAll(key, ["vaultKey"]);
    }

    protected internalGetBackup() 
    {
        return {
            vaultKey: this.vaultKey,
            vaultPreferencesStoreState: this.vaultPreferencesStoreState,
        }
    }
}