import { environment } from "../../Environment";
import * as jose from 'jose'
import { Column, ObjectLiteral, AfterLoad } from "typeorm"
import { StoreState } from "./States/StoreState";
import { EntityState, IVaulticEntity, VaultType } from "@vaultic/shared/Types/Entities";
import { nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";

const VaulticHandler =
{
    get(target, prop, receiver)
    {
        return target[prop];
    },
    set(obj: VaulticEntity, prop: string, newValue: any)
    {
        if (!obj.updatedProperties.includes(prop))
        {
            obj.updatedProperties.push(prop);
        }

        // don't want to include objects in this since they have their own tracking
        if (typeof newValue != 'object' && !obj.propertiesToSync.includes(prop) && obj.backupableProperties().includes(prop))
        {
            obj.propertiesToSync.push(prop);
            obj.serializedPropertiesToSync = JSON.stringify(obj.updatedProperties);
        }

        obj[prop] = newValue;
        return true;
    }
};

export class VaulticEntity implements ObjectLiteral, IVaulticEntity
{
    // Not Encrypted
    // Backed Up
    @Column("text")
    currentSignature: string

    @Column("integer")
    entityState: EntityState;

    // not encrypted
    // not backed up
    @Column("text")
    serializedPropertiesToSync: string;

    propertiesToSync: string[];
    updatedProperties: string[];

    constructor() 
    {
        this.serializedPropertiesToSync = "[]";
        this.updatedProperties = [];
        this.propertiesToSync = [];

        // this should be fine to do. TypeORM should override it with the saved value when 
        // retrieving entities.
        this.entityState = EntityState.Inserted;
    }

    @AfterLoad()
    afterLoad()
    {
        this.propertiesToSync = JSON.parse(this.serializedPropertiesToSync);
    }

    identifier(): number 
    {
        throw "need to override";
    }

    entityName(): string 
    {
        return "vaulticEntity";
    }

    protected createNew(): VaulticEntity
    {
        return new VaulticEntity();
    }

    public makeReactive(): typeof this
    {
        return new Proxy(this, VaulticHandler);
    }

    private getSignatureMakeup(): any
    {
        const signableProperties = this.getSignableProperties();
        const signatureMakeup = {};

        for (let i = 0; i < signableProperties.length; i++)
        {
            signatureMakeup[signableProperties[i]] = this[signableProperties[i]];
        }

        return signatureMakeup;
    }

    protected internalGetSignableProperties(): string[]
    {
        return [];
    }

    public getSignableProperties(): string[]
    {
        return [...this.internalGetSignableProperties()];
    }

    protected getUserUpdatableProperties(): string[]
    {
        return [];
    }

    public getCompressableProperties(): string[]
    {
        return [];
    }

    public getEncryptableProperties(): string[]
    {
        return [];
    }

    protected getNestedVaulticEntities(): string[]
    {
        return [];
    }

    protected neededBackupProperties(): string[]
    {
        return []
    }

    public backupableProperties(): string[]
    {
        return [
            nameof<VaulticEntity>("currentSignature"),
            nameof<VaulticEntity>("entityState")
        ];
    }

    public copyFrom(obj: any, target?: VaulticEntity)
    {
        if (target === undefined)
        {
            target = this;
        }

        if (!target.getUserUpdatableProperties)
        {
            return;
        }

        const properties = Object.keys(obj);
        const userUpdatableProperties = target.getUserUpdatableProperties();

        for (let i = 0; i < properties.length; i++)
        {
            if (!userUpdatableProperties.includes(properties[i]))
            {
                continue;
            }
            else if (target[properties[i]] === undefined || obj[properties[i]] === undefined)
            {
                continue;
            }
            else if (typeof obj[properties[i]] === "object")
            {
                this.copyFrom(obj[properties[i]], this[properties[i]]);
            }
            else if (typeof obj[properties[i]] === 'string')
            {
                target[properties[i]] = obj[properties[i]];
            }
        }
    }

    public getBackup()
    {
        const obj = {};
        obj[nameof<VaulticEntity>("currentSignature")] = this.currentSignature;
        obj[nameof<VaulticEntity>("entityState")] = this.entityState;

        const neededBackupProperties = this.neededBackupProperties();
        for (let i = 0; i < neededBackupProperties.length; i++)
        {
            obj[neededBackupProperties[i]] = this[neededBackupProperties[i]];
        }

        for (let i = 0; i < this.propertiesToSync.length; i++)
        {
            obj[this.propertiesToSync[i]] = this[this.propertiesToSync[i]];
        }

        return obj;
    }

    async sign(key: string): Promise<boolean>
    {
        let signatureMakeup = this.getSignatureMakeup();
        if (!signatureMakeup)
        {
            return false;
        }

        const seriazliedMakeup = JSON.stringify(signatureMakeup);

        const hashedEntity = await environment.utilities.hash.hash(Algorithm.SHA_256, seriazliedMakeup);
        if (!hashedEntity.success)
        {
            return false;
        }

        try 
        {
            let keyToUse = key;
            try 
            {
                const vaulticKey: VaulticKey = JSON.parse(key);
                keyToUse = vaulticKey.key;
            }
            catch { }

            const hashedKey = await environment.utilities.hash.hash(Algorithm.SHA_256, keyToUse);
            if (!hashedKey.success)
            {
                return false;
            }

            const keyBytes = environment.utilities.crypt.hexToBytes(hashedKey.value);
            const jwt = await new jose.EncryptJWT({ entity: hashedEntity.value })
                .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
                .setIssuedAt()
                .setIssuer('vaultic')
                .setAudience('vaulticUser')
                .setExpirationTime('999y')
                .encrypt(keyBytes);

            this.currentSignature = jwt;
            return true;
        }
        catch (e)
        {

        }

        return false;
    }

    protected async internalVerify(key: string): Promise<TypedMethodResponse<any>>
    {
        if (!this.currentSignature)
        {
            return TypedMethodResponse.fail(errorCodes.NO_SIGNATURE);
        }

        let signatureMakeup = this.getSignatureMakeup();
        if (!signatureMakeup)
        {
            return TypedMethodResponse.fail(errorCodes.NO_SIGNATURE_MAKEUP);
        }

        const serializedMakeup = JSON.stringify(signatureMakeup);
        const hashedEntity = await environment.utilities.hash.hash(Algorithm.SHA_256, serializedMakeup);

        if (!hashedEntity.success)
        {
            return TypedMethodResponse.fail();
        }

        try
        {
            let keyToUse = key;
            try
            {
                const vaulticKey: VaulticKey = JSON.parse(key);
                keyToUse = vaulticKey.key;
            }
            catch { }

            const hashedKey = await environment.utilities.hash.hash(Algorithm.SHA_256, keyToUse);
            if (!hashedKey.success)
            {
                return TypedMethodResponse.fail();
            }

            const keyBytes = environment.utilities.crypt.hexToBytes(hashedKey.value);
            const response = await jose.jwtDecrypt(this.currentSignature, keyBytes, {
                issuer: 'vaultic',
                audience: 'vaulticUser',
                contentEncryptionAlgorithms: ['A256GCM']
            });

            if (nameof<StoreState>('previousSignature') in this)
            {
                await jose.jwtDecrypt(this[nameof<StoreState>("previousSignature")], keyBytes, {
                    issuer: 'vaultic',
                    audience: 'vaulticUser',
                    contentEncryptionAlgorithms: ['A256GCM']
                });
            }

            const retrievedEntity = response.payload.entity;
            if (!retrievedEntity || typeof retrievedEntity != 'string')
            {
                return TypedMethodResponse.fail(errorCodes.NO_RETRIEVED_ENTITY);
            }

            const equalHashes = environment.utilities.hash.compareHashes(retrievedEntity, hashedEntity.value);
            if (!equalHashes)
            {
                return TypedMethodResponse.fail(errorCodes.HASHES_DONT_MATCH);
            }

            return TypedMethodResponse.success();
        }
        catch (e)
        {
            return TypedMethodResponse.fail(errorCodes.VERIFICATION_FAILED, undefined, e);
        }
    }

    /**
     * Attempts to verify entity and all nested entities. Will throw the TypedMethodResponse if 
     * unsuccessfull. Any call that verifies an entity should be wrapped in safetifyMethod
     * at the highest level to catch the thrown error
     * @param key 
     * @returns 
     */
    async verify(key: string): Promise<boolean>
    {
        const selfVerification = await this.internalVerify(key);
        if (!selfVerification.success)
        {
            selfVerification.addToCallStack(`Verifying ${this.entityName()}: ${this.identifier()}`);
            throw selfVerification;
        }

        const nestedVaulticEntites = this.getNestedVaulticEntities();
        for (let i = 0; i < nestedVaulticEntites.length; i++)
        {
            if (typeof this[nestedVaulticEntites[i]]?.internalVerify == 'function')
            {
                const response: TypedMethodResponse<any> = await this[nestedVaulticEntites[i]].internalVerify(key);
                if (!response.success)
                {
                    response.addToCallStack(`Verifying ${nestedVaulticEntites[i]}`);
                    response.addToErrorMessage(`ID: ${this.identifier()}`);

                    throw response;
                }
            }
            else
            {
                // Expected object to verify but it doesn't exist
                throw TypedMethodResponse.fail(errorCodes.NESTED_OBJECT_DOES_NOT_EXIST);
            }
        }

        return true;
    }

    public async encryptAndSet(key: string, property: string): Promise<boolean> 
    {
        if (this[property] === undefined || typeof this[property] != 'string')
        {
            await environment.repositories.logs.log(errorCodes.INVALID_PROPERTY_WHILE_ENCRYPTING, property);
            return false;
        }

        const result = await environment.utilities.crypt.symmetricEncrypt(key, this[property] as string);
        if (!result)
        {
            return false;
        }

        //@ts-ignore
        this[property] = result.value!;
        return true;
    }

    public async encryptAndSetEach(key: string, properties: string[]): Promise<boolean> 
    {
        for (let i = 0; i < properties.length; i++)
        {
            if (!await this.encryptAndSet(key, properties[i]))
            {
                return false;
            }
        }

        return true;
    }

    public async encryptAndSetFromObject(key: string, obj: any, target?: VaulticEntity): Promise<boolean>
    {
        if (!target)
        {
            target = this;
        }

        const properties = Object.keys(obj);
        for (let i = 0; i < properties.length; i++)
        {
            if (target[properties[i]] === undefined || obj[properties[i]] === undefined)
            {
                continue;
            }
            else if (typeof obj[properties[i]] === "object")
            {
                this.encryptAndSetFromObject(key, obj[properties[i]], this[properties[i]]);
            }
            else if (typeof obj[properties[i]] === 'string')
            {
                const result = await environment.utilities.crypt.symmetricEncrypt(key, obj[properties[i]] as string);
                if (!result)
                {
                    return false;
                }

                target[properties[i]] = result.value!;
            }
        }

        return true;
    }

    async decryptAndGet(key: string, property: keyof this): Promise<TypedMethodResponse<string | undefined>>
    {
        if (this[property] === undefined || typeof this[property] != 'string')
        {
            return TypedMethodResponse.fail(undefined, undefined, "Invalid property to decrypt");
        }

        const result = await environment.utilities.crypt.symmetricDecrypt(key, this[property] as string);
        if (!result)
        {
            return TypedMethodResponse.propagateFail(result);
        }

        return TypedMethodResponse.success(result.value);
    }

    public preInsert()
    {
    }
}