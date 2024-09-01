import { Entity, Column, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User"
import { Vault } from "./Vault"
import { VaulticEntity } from "./VaulticEntity"
import { nameof } from "../../Helpers/TypeScriptHelper"
import { VaultPreferencesStoreState } from "./States/VaultPreferencesStoreState"

@Entity({ name: "userVaults" })
export class UserVault extends VaulticEntity
{
    // Matches Server
    @Column("integer")
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

    @ManyToOne(() => Vault, (vault: Vault) => vault.userVaults)
    @JoinColumn({ name: "vaultID" })
    vault: Vault;

    // Encrypted by Users Private Key
    // Backed Up
    // In the format { publicKey: string, vaultkey: string }
    @Column("text")
    vaultKey: string

    // matches server
    @Column("integer")
    vaultPreferencesStoreStateID: number

    @OneToOne(() => VaultPreferencesStoreState, (state: VaultPreferencesStoreState) => state.userVault, { eager: true, cascade: true })
    vaultPreferencesStoreState: VaultPreferencesStoreState;

    identifier(): number 
    {
        return this.userVaultID;
    }

    protected createNew(): VaulticEntity 
    {
        return new UserVault();
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<UserVault>("userVaultID"),
            nameof<UserVault>("userID"),
            nameof<UserVault>("vaultID"),
            nameof<UserVault>("vaultKey"),
            nameof<UserVault>("vaultPreferencesStoreStateID")
        ];
    }

    protected internalGetBackupableProperties(): string[] 
    {
        return [
            nameof<UserVault>("userVaultID"),
            nameof<UserVault>("vaultKey")
        ];
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [nameof<UserVault>("vaultKey")]);
    }
}