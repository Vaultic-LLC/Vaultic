import { Entity, Column, OneToMany, PrimaryColumn, OneToOne } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";
import { nameof } from "../../Helpers/TypeScriptHelper";
import { VaultStoreState } from "./States/VaultStoreState";
import { PasswordStoreState } from "./States/PasswordStoreState";
import { ValueStoreState } from "./States/ValueStoreState";
import { FilterStoreState } from "./States/FilterStoreState";
import { GroupStoreState } from "./States/GroupStoreState";

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

    @OneToOne(() => VaultStoreState, (state: VaultStoreState) => state.vault, { eager: true })
    vaultStoreState: VaultStoreState;

    @OneToOne(() => PasswordStoreState, (state: PasswordStoreState) => state.vault, { eager: true })
    passwordStoreState: PasswordStoreState;

    @OneToOne(() => ValueStoreState, (state: ValueStoreState) => state.vault, { eager: true })
    valueStoreState: ValueStoreState;

    @OneToOne(() => FilterStoreState, (state: FilterStoreState) => state.vault, { eager: true })
    filterStoreState: FilterStoreState;

    @OneToOne(() => GroupStoreState, (state: GroupStoreState) => state.vault, { eager: true })
    groupStoreState: GroupStoreState;

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
        return [
            nameof<Vault>("vaultID"),
            nameof<Vault>("name"),
            nameof<Vault>("color")
        ];
    }

    protected neededBackupProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID")
        ]
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            nameof<Vault>("name"),
            nameof<Vault>("color")
        ]);
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<Vault>("name"),
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState"),
        ]
    }

    public static getDecrypableProperties()
    {
        return [
            nameof<Vault>("name"),
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState")
        ];
    }
}