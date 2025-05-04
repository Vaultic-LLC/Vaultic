import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, OneToOne } from "typeorm"
import { User } from "./User"
import { Vault } from "./Vault"
import { VaulticEntity } from "./VaulticEntity"
import { VaultPreferencesStoreState } from "./States/VaultPreferencesStoreState"
import { CondensedVaultData, IUserVault } from "@vaultic/shared/Types/Entities"
import { DeepPartial, hasValue, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper"
import { ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";

@Entity({ name: "userVaults" })
export class UserVault extends VaulticEntity implements IUserVault
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
    userOrganizationID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @Column("integer")
    lastLoadedChangeVersion: number

    @ManyToOne(() => Vault, (vault: Vault) => vault.userVaults, { eager: true })
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    @Column("boolean")
    isOwner: boolean;

    @Column("integer")
    permissions?: ServerPermissions;

    // Encrypted by Users Private Key
    // Backed Up
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

    // Make sure this are included in repository.updateFromServer() so the signature can be re built properly when
    // returning data from the server
    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<UserVault>("userVaultID"),
            nameof<UserVault>("userOrganizationID"),
            nameof<UserVault>("userID"),
            nameof<UserVault>("vaultID"),
            nameof<UserVault>("isOwner"),
            nameof<UserVault>("vaultKey"),
            nameof<UserVault>("lastLoadedChangeVersion")
        ];
    }

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<UserVault>("userVaultID"),
            nameof<UserVault>("userOrganizationID")
        ]
    }

    public backupableProperties(): string[]
    {
        const properties = super.backupableProperties();
        properties.push("userVaultID");
        properties.push("userOrganizationID");
        properties.push("userID");
        properties.push("vaultID");
        properties.push("vaultKey");

        return properties;
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

    public condense(): CondensedVaultData
    {
        return {
            userOrganizationID: this.userOrganizationID,
            userVaultID: this.userVaultID,
            vaultID: this.vault.vaultID,
            vaultPreferencesStoreState: this.vaultPreferencesStoreState.state,
            name: this.vault.name,
            shared: this.vault.shared,
            isArchived: this.vault.isArchived,
            isOwner: this.isOwner,
            isReadOnly: this.vault.isArchived || (this.isOwner === false && this.permissions === ServerPermissions.View),
            lastUsed: this.vault.lastUsed,
            permissions: this.permissions,
            vaultStoreState: this.vault.vaultStoreState.state,
            passwordStoreState: this.vault.passwordStoreState.state,
            valueStoreState: this.vault.valueStoreState.state,
            filterStoreState: this.vault.filterStoreState.state,
            groupStoreState: this.vault.groupStoreState.state
        }
    }

    public static isValid(userVault: DeepPartial<UserVault>): boolean
    {
        return hasValue(userVault.currentSignature) &&
            hasValue(userVault.userID) &&
            hasValue(userVault.userVaultID) &&
            hasValue(userVault.userOrganizationID) &&
            hasValue(userVault.vaultID) &&
            hasValue(userVault.vaultKey) &&
            hasValue(userVault.lastLoadedChangeVersion) &&
            !!userVault.vaultPreferencesStoreState &&
            VaultPreferencesStoreState.isValid(userVault.vaultPreferencesStoreState);
    }
}