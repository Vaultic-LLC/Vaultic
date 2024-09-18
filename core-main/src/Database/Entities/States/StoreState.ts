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
    }

    async sign(masterKey: string): Promise<boolean> 
    {
        const currentSignature = this.currentSignature;
        if (await (super.sign(masterKey)))
        {
            this.previousSignature = currentSignature ?? this.currentSignature;
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

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<StoreState>("previousSignature")
        ]
    }

    async lock(key: string): Promise<boolean>
    {
        return this.encryptAndSetEach(key, [nameof<StoreState>("state")]);
    }

    protected getUserUpdatableProperties(): string[] 
    {
        return [
            nameof<StoreState>("state"),
        ]
    }

    public static getUpdatedPropertiesFromObject(store: any)
    {
        const properties = {};
        if (store[nameof<StoreState>("signatureSecret")])
        {
            properties[nameof<StoreState>("signatureSecret")] = store.signatureSecret;
        }

        if (store[nameof<StoreState>("currentSignature")])
        {
            properties[nameof<StoreState>("currentSignature")] = store.currentSignature;
        }

        if (store[nameof<StoreState>("previousSignature")])
        {
            properties[nameof<StoreState>("previousSignature")] = store.previousSignature;
        }

        if (store[nameof<StoreState>("state")])
        {
            properties[nameof<StoreState>("state")] = store.state;
        }

        return properties;
    }
}