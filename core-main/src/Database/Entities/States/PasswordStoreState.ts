import { Entity, OneToOne, Column, PrimaryColumn, JoinColumn } from "typeorm";
import { DeepPartial, nameof } from "../../../Helpers/TypeScriptHelper"
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";

@Entity({ name: "passwordStoreStates" })
export class PasswordStoreState extends StoreState
{
    // Matches Server
    @PrimaryColumn("integer")
    passwordStoreStateID: number

    // Matches Server
    @Column("integer")
    vaultID: number

    @OneToOne(() => Vault, (vault) => vault.passwordStoreState)
    @JoinColumn({ name: "vaultID" })
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
        properties.push(
            nameof<PasswordStoreState>("passwordStoreStateID"),
            nameof<PasswordStoreState>("vaultID")
        );

        return properties;
    }

    protected neededBackupProperties(): string[] 
    {
        const properties = super.neededBackupProperties();
        properties.push(nameof<PasswordStoreState>("passwordStoreStateID"));

        return properties;
    }

    public static isValid(passwordStoreState: DeepPartial<PasswordStoreState>): boolean
    {
        return !!passwordStoreState.signatureSecret &&
            !!passwordStoreState.currentSignature &&
            !!passwordStoreState.previousSignature &&
            !!passwordStoreState.state &&
            !!passwordStoreState.passwordStoreStateID &&
            !!passwordStoreState.vaultID;
    }
}