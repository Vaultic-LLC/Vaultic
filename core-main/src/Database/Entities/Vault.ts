import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { UserVault } from "./UserVault"
import { VaulticEntity } from "./VaulticEntity";

@Entity({ name: "vaults" })
export class Vault extends VaulticEntity
{
    @PrimaryGeneratedColumn("increment", { type: "integer" })
    vaultID: number

    @ManyToOne(() => UserVault, (uv: UserVault) => uv.vault)
    userVaults: UserVault[];

    @Column("text")
    vaultIdentifier: string

    @Column("text")
    name: string

    @Column("text")
    color: string

    @Column("text")
    appStoreState: string

    @Column("text")
    settingsStoreState: string

    @Column("text")
    passwordStoreState: string

    @Column("text")
    valueStoreState: string

    @Column("text")
    filterStoreState: string

    @Column("text")
    groupStoreState: string

    @Column("text")
    userPreferencesStoreState: string

    protected getSignatureMakeup(): any
    {
        // exclude user preferences so it can be updated without the need of a master key
        return {
            signatureSecret: this.signatureSecret,
            vaultID: this.vaultID,
            vaultIdentifier: this.vaultIdentifier,
            name: this.name,
            color: this.color,
            appStoreState: this.appStoreState,
            settingsStoreState: this.settingsStoreState,
            passwordStoreState: this.passwordStoreState,
            valueStoreState: this.valueStoreState,
            filterStoreState: this.filterStoreState,
            groupStoreState: this.groupStoreState
        };
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, ["vaultIdentifier", "name", "color",
            "appStoreState", "settingsStoreState", "passwordStoreState", "valueStoreState", "filterStoreState",
            "groupStoreState"])
    }
}