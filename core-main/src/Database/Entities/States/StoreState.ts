import { VaulticEntity } from "../VaulticEntity"
import { nameof } from "../../../Helpers/TypeScriptHelper"
import { Column } from "typeorm";

export class StoreState extends VaulticEntity
{
    @Column("text")
    state: string;

    @Column("text")
    previousSignature: string;

    constructor() 
    {
        super();
        this.state = "{}";
    }

    async sign(masterKey: string): Promise<boolean> 
    {
        const currentSignature = this.currentSignature;
        if (await (super.sign(masterKey)))
        {
            this.previousSignature = currentSignature;
            return true;
        }

        return false;
    }

    protected internalGetSignableProperties(): string[] 
    {
        return [
            nameof<StoreState>("state"),
            nameof<StoreState>("previousSignature"),
        ];
    }

    protected internalGetBackupableProperties(): string[] 
    {
        return [
            nameof<StoreState>("state"),
            nameof<StoreState>("previousSignature")
        ];
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [nameof<StoreState>("state")]);
    }
}