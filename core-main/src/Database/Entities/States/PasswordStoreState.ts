import { Entity, OneToOne, JoinColumn } from "typeorm";
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "passwordStoreStates" })
export class PasswordStoreState extends StoreState
{
    // Matches Server
    @Column("integer")
    passwordStoreStateID: number

    @OneToOne(() => Vault, (vault) => vault.passwordStoreState)
    @JoinColumn({ name: "passwordStoreStateID" })
    vault: Vault;

    identifier(): number 
    {
        return this.passwordStoreStateID;
    }

    protected createNew(): PasswordStoreState 
    {
        return new PasswordStoreState();
    }

    protected internalGetSignableProperties(): string[] 
    {
        const properties = super.internalGetSignableProperties();
        properties.push(nameof<PasswordStoreState>("passwordStoreStateID"));

        return properties;
    }

    protected internalGetBackupableProperties(): string[] 
    {
        const properties = super.internalGetBackupableProperties();
        properties.push(nameof<PasswordStoreState>("passwordStoreStateID"));

        return properties;
    }
}