import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";

@Entity({ name: "vaults" })
export class Vault extends VaulticEntity
{
    // Matches Server
    @PrimaryColumn("integer")
    vaultID: number

    @OneToMany(() => UserVault, (uv: UserVault) => uv.vault)
    userVaults: UserVault[];

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    name: string

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    color: string

    // Not backed up
    // Not encrypted
    @Column("boolean")
    lastUsed: boolean;

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    vaultStoreState: string

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    passwordStoreState: string

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    valueStoreState: string

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    filterStoreState: string

    // Backed Up
    // Encrypted by Vault Key
    @Column("text")
    groupStoreState: string

    identifier(): number 
    {
        return this.vaultID;
    }

    protected getSignatureMakeup(): any
    {
        // exclude user preferences so it can be updated without the need of a master key
        return {
            signatureSecret: this.signatureSecret,
            vaultID: this.vaultID,
            name: this.name,
            color: this.color,
            vaultStoreState: this.vaultStoreState,
            passwordStoreState: this.passwordStoreState,
            valueStoreState: this.valueStoreState,
            filterStoreState: this.filterStoreState,
            groupStoreState: this.groupStoreState
        };
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, ["name", "color", "vaultStoreState", "passwordStoreState",
            "valueStoreState", "filterStoreState", "groupStoreState"])
    }

    protected internalGetBackup() 
    {
        return {
            vaultID: this.vaultID,
            name: this.name,
            color: this.color,
            vaultStoreState: this.vaultStoreState,
            passwordStoreState: this.passwordStoreState,
            valueStoreState: this.valueStoreState,
            filterStoreState: this.filterStoreState,
            groupStoreState: this.groupStoreState,
        }
    }
}