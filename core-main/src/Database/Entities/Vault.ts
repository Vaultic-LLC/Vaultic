import { Entity, Column, OneToMany, PrimaryColumn, OneToOne } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";
import { DeepPartial, nameof } from "../../Helpers/TypeScriptHelper";
import { VaultStoreState } from "./States/VaultStoreState";
import { PasswordStoreState } from "./States/PasswordStoreState";
import { ValueStoreState } from "./States/ValueStoreState";
import { FilterStoreState } from "./States/FilterStoreState";
import { GroupStoreState } from "./States/GroupStoreState";
import { MethodResponse, TypedMethodResponse } from "../../Types/MethodResponse";

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
            nameof<Vault>("name")
        ];
    }

    protected neededBackupProperties(): string[] 
    {
        return [
            nameof<Vault>("vaultID")
        ]
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

    async verify(key: string): Promise<MethodResponse> 
    {
        const vaultResponse = await super.verify(key);
        if (!vaultResponse.success)
        {
            vaultResponse.addToCallStack("Vault Verify");
            return vaultResponse;
        }

        const vaultStoreStateResponse = await this.vaultStoreState.verify(key);
        if (!vaultStoreStateResponse.success)
        {
            vaultStoreStateResponse.addToCallStack("VaultStoreState Verify");
            return vaultStoreStateResponse;
        }

        const passwordStoreStateResponse = await this.passwordStoreState.verify(key);
        if (!passwordStoreStateResponse.success)
        {
            passwordStoreStateResponse.addToCallStack("PasswordStoreState Verify");
            return passwordStoreStateResponse;
        }

        const valueStoreStateResponse = await this.valueStoreState.verify(key);
        if (!valueStoreStateResponse.success)
        {
            valueStoreStateResponse.addToCallStack("ValueStoreState Verify");
            return valueStoreStateResponse;
        }

        const filterStoreStateResponse = await this.filterStoreState.verify(key);
        if (!filterStoreStateResponse.success)
        {
            filterStoreStateResponse.addToCallStack("FilterStoreState Verify");
            return filterStoreStateResponse;
        }

        const groupStoreStateResponse = await this.groupStoreState.verify(key);
        if (!groupStoreStateResponse.success)
        {
            groupStoreStateResponse.addToCallStack("GroupStoreState Verify");
            return groupStoreStateResponse;
        }

        return TypedMethodResponse.success();
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