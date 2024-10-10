import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, OneToOne } from "typeorm"
import { User } from "./User"
import { Vault } from "./Vault"
import { VaulticEntity } from "./VaulticEntity"
import { DeepPartial, nameof } from "../../Helpers/TypeScriptHelper"
import { VaultPreferencesStoreState } from "./States/VaultPreferencesStoreState"
import { CondensedVaultData } from "../../Types/Repositories"

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
    @JoinColumn({ name: "userID" })
    user: User

    // Matches Server
    @Column("integer")
    vaultID: number

    @ManyToOne(() => Vault, (vault: Vault) => vault.userVaults, { eager: true })
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    // Encrypted by Users Private Key
    // Backed Up
    // In the format { publicKey: string, vaultkey: string }
    @Column("text")
    vaultKey: string

    @OneToOne(() => VaultPreferencesStoreState, (state: VaultPreferencesStoreState) => state.userVault, { eager: true })
    vaultPreferencesStoreState: VaultPreferencesStoreState;

    identifier(): number 
    {
        return this.userVaultID;
    }

    entityName(): string 
    {
        return "userVault";
    }

    protected createNew(): UserVault 
    {
        return new UserVault();
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<UserVault>("userVaultID"),
            nameof<UserVault>("userID"),
            nameof<UserVault>("vaultID"),
            nameof<UserVault>("vaultKey")
        ];
    }

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<UserVault>("userVaultID")
        ]
    }

    getEncryptableProperties(): string[]
    {
        return [nameof<UserVault>("vaultKey")];
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<UserVault>("vaultPreferencesStoreState"),
        ]
    }

    protected getNestedVaulticEntities(): string[] 
    {
        return [
            nameof<UserVault>("vaultPreferencesStoreState")
        ];
    }

    public condense(): CondensedVaultData
    {
        return {
            userVaultID: this.userVaultID,
            vaultPreferencesStoreState: this.vaultPreferencesStoreState.state,
            name: this.vault.name,
            lastUsed: this.vault.lastUsed,
            vaultStoreState: this.vault.vaultStoreState.state,
            passwordStoreState: this.vault.passwordStoreState.state,
            valueStoreState: this.vault.valueStoreState.state,
            filterStoreState: this.vault.filterStoreState.state,
            groupStoreState: this.vault.groupStoreState.state
        }
    }

    public static isValid(userVault: DeepPartial<UserVault>): boolean
    {
        return !!userVault.signatureSecret &&
            !!userVault.currentSignature &&
            !!userVault.userID &&
            !!userVault.userVaultID &&
            !!userVault.vaultID &&
            !!userVault.vaultKey &&
            !!userVault.vaultPreferencesStoreState &&
            VaultPreferencesStoreState.isValid(userVault.vaultPreferencesStoreState);
    }
}