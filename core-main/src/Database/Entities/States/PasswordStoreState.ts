import { Entity, OneToOne, Column, PrimaryColumn, JoinColumn } from "typeorm";
import { StoreState } from "./StoreState";
import { Vault } from "../Vault";
import { IPasswordStoreState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";

@Entity({ name: "passwordStoreStates" })
export class PasswordStoreState extends StoreState implements IPasswordStoreState
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

    entityName(): string 
    {
        return "passwordStoreState";
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