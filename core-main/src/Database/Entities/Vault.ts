import { Entity, Column, OneToMany, PrimaryColumn, OneToOne } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";
import { VaultStoreState } from "./States/VaultStoreState";
import { PasswordStoreState } from "./States/PasswordStoreState";
import { ValueStoreState } from "./States/ValueStoreState";
import { FilterStoreState } from "./States/FilterStoreState";
import { GroupStoreState } from "./States/GroupStoreState";
import { IVault } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "vaults" })
export class Vault extends VaulticEntity implements IVault
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

    entityName(): string 
    {
        return "vault";
    }

    protected createNew(): VaulticEntity 
    {
        return new Vault();
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID"),
            nameof<Vault>("name")
        ];
    }

    protected neededBackupProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID")
        ]
    }

    public backupableProperties(): string[]
    {
        const properties = super.backupableProperties();
        properties.push("vaultID");
        properties.push("name");

        return properties;
    }

    getEncryptableProperties(): string[]
    {
        return [
            nameof<Vault>("name")
        ];
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<Vault>("name"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState"),
        ]
    }

    public static getDecryptableProperties()
    {
        return [
            nameof<Vault>("name"),
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState")
        ];
    }

    protected getNestedVaulticEntities(): string[] 
    {
        return [
            nameof<Vault>("vaultStoreState"),
            nameof<Vault>("passwordStoreState"),
            nameof<Vault>("valueStoreState"),
            nameof<Vault>("filterStoreState"),
            nameof<Vault>("groupStoreState")
        ];
    }

    public static isValid(vault: DeepPartial<Vault>): boolean
    {
        return !!vault.signatureSecret &&
            !!vault.currentSignature &&
            !!vault.vaultID &&
            !!vault.name &&
            !!vault.vaultStoreState &&
            !!vault.passwordStoreState &&
            !!vault.valueStoreState &&
            !!vault.filterStoreState &&
            !!vault.groupStoreState &&
            VaultStoreState.isValid(vault.vaultStoreState) &&
            PasswordStoreState.isValid(vault.passwordStoreState) &&
            ValueStoreState.isValid(vault.valueStoreState) &&
            FilterStoreState.isValid(vault.filterStoreState) &&
            GroupStoreState.isValid(vault.groupStoreState);
    }
}