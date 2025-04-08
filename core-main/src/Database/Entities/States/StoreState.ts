import { VaulticEntity } from "../VaulticEntity";
import { Column } from "typeorm";
import { IStoreState } from "@vaultic/shared/Types/Entities";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { environment } from "../../../Environment";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

export class StoreState extends VaulticEntity implements IStoreState
{
    @Column("text")
    state: string;

    @Column("text")
    previousSignature: string;

    constructor()
    {
        super();
    }

    protected internalGetSignableProperties(): string[] 
    {
        // don't include state since its already encrypted
        return [];
        // return [
        //     nameof<StoreState>("state")
        // ];
    }

    protected neededBackupProperties(): string[]
    {
        return [
            nameof<StoreState>("previousSignature")
        ]
    }

    public backupableProperties(): string[]
    {
        const properties = super.backupableProperties();
        properties.push(nameof<StoreState>("state"));
        properties.push(nameof<StoreState>("previousSignature"));

        return properties;
    }

    public getCompressableProperties(): string[]
    {
        return [nameof<StoreState>("state")];
    }

    getEncryptableProperties(): string[]
    {
        return [nameof<StoreState>("state")];
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

    public preInsert(): void
    {
        this.previousSignature = this.currentSignature;
    }

    public static async getUsableState(key: string, state: string, decrypt: boolean = true): Promise<TypedMethodResponse<string>>
    {
        let value = state;

        if (decrypt && key)
        {
            const result = await environment.utilities.crypt.symmetricDecrypt(key, state);
            if (!result.success)
            {
                throw result;
            }

            value = result.value;
        }

        const decompressed = await environment.utilities.data.uncompress(value!);
        if (!decompressed)
        {
            return TypedMethodResponse.fail();
        }

        return TypedMethodResponse.success(decompressed);
    }
}