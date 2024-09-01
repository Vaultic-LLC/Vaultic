import { Entity, Column, OneToMany } from "typeorm"
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
    @Column("integer")
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

    // matches server
    @Column("integer")
    vaultStoreStateID: number

    @OneToOne(() => VaultStoreState, (state: VaultStoreState) => state.vault, { eager: true, cascade: true })
    vaultStoreState: VaultStoreState;

    // matches server
    @Column("integer")
    passwordStoreStateID: number

    @OneToOne(() => PasswordStoreState, (state: PasswordStoreState) => state.vault, { eager: true, cascade: true })
    passwordStoreState: PasswordStoreState;

    // matches server
    @Column("integer")
    valueStoreStateID: number

    @OneToOne(() => ValueStoreState, (state: ValueStoreState) => state.vault, { eager: true, cascade: true })
    valueStoreState: ValueStoreState;

    // Backed Up
    // Encrypted by Vault Key
    @Column("integer")
    filterStoreStateID: number

    @OneToOne(() => FilterStoreState, (state: FilterStoreState) => state.vault, { eager: true, cascade: true })
    filterStoreState: FilterStoreState;

    // Backed Up
    // Encrypted by Vault Key
    @Column("integer")
    groupStoreStateID: number

    @OneToOne(() => GroupStoreState, (state: GroupStoreState) => state.vault, { eager: true, cascade: true })
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
            nameof<Vault>("color"),
            nameof<Vault>("vaultStoreStateID"),
            nameof<Vault>("passwordStoreStateID"),
            nameof<Vault>("valueStoreStateID"),
            nameof<Vault>("filterStoreStateID"),
            nameof<Vault>("groupStoreStateID"),
        ];
    }

    protected internalGetBackupableProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID"),
            nameof<Vault>("name"),
            nameof<Vault>("color"),
        ];
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [
            nameof<Vault>("name"),
            nameof<Vault>("color")
        ]);
    }
}