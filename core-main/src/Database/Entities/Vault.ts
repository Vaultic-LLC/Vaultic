import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "../../Helpers/TypeScriptHelper";

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

    protected createNew(): VaulticEntity 
    {
        return new Vault();
    }

    protected internalGetSignableProperties(): string[] 
    {
        // exclude user preferences so it can be updated without the need of a master key
        return [
            nameof<Vault>("vaultID"),
            nameof<Vault>("name"),
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState"),
        ];
    }

    protected internalGetBackupableProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID"),
            nameof<Vault>("name"),
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState"),
        ];
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            nameof<Vault>("name"),
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState")
        ]);
    }
}