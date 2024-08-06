import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity"

@Entity({ name: "users" })
export class User extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment", { type: "integer" })
    userID: number

    // TODO: add emailHash for querying for user so I don't have to decrypt and check every user
    @Column("text")
    email: string

    @Column("text")
    userIdentifier: string

    @Column("text")
    masterKeyHash: string

    @Column("text")
    masterKeySalt: string

    @Column("text")
    publicKey: string

    @Column("text")
    privateKey: string

    @OneToMany(() => UserVault, (uv: UserVault) => uv.user)
    userVaults: UserVault[]

    protected getSignatureMakeup(): any
    {
        return {
            signatureSecret: this.signatureSecret,
            userID: this.userID,
            email: this.email,
            userIdentifier: this.userIdentifier,
            masterKeyHash: this.masterKeyHash,
            masterKeySalt: this.masterKeySalt,
            publicKey: this.publicKey,
            privateKey: this.privateKey
        };
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, ["email", "userIdentifier",
            "masterKeyHash", "masterKeySalt", "privateKey"]);
    }
}