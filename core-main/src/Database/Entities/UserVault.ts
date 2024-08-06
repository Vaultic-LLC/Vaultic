import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { User } from "./User"
import { Vault } from "./Vault"
import { VaulticEntity } from "./VaulticEntity"

@Entity({ name: "userVaults" })
export class UserVault extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment", { type: "integer" })
    userVaultID: number

    @Column("integer")
    userID: number

    @ManyToOne(() => User, (user: User) => user.userVaults)
    user: User

    @Column("integer")
    vaultID: number

    @ManyToOne(() => Vault, (vault: Vault) => vault.userVaults)
    vault: Vault;

    @Column("text")
    vaultKey: string

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
        return this.encryptAndSet(key, "vaultKey");
    }
}