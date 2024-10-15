import { environment } from "../../Environment";
import * as jose from 'jose'
import { Column, ObjectLiteral, AfterLoad } from "typeorm"
import { nameof } from "../../Helpers/TypeScriptHelper";
import { EntityState } from "../../Types/Properties";
import { StoreState } from "./States/StoreState";
import { TypedMethodResponse } from "../../Types/MethodResponse";
import errorCodes from "../../Types/ErrorCodes";

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

export class VaulticEntity implements ObjectLiteral
{
    // Encrypted in sign
    // Backed Up
    @Column("text")
    signatureSecret: string

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
        return [nameof<VaulticEntity>("signatureSecret"), ...this.internalGetSignableProperties()];
    }

    protected getUserUpdatableProperties(): string[]
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
            nameof<VaulticEntity>("signatureSecret"),
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
        let signatureSecret = "";
        if (!this.signatureSecret)
        {
            signatureSecret = environment.utilities.hash.insecureHash(environment.utilities.generator.randomValue(40));

            const response = await environment.utilities.crypt.encrypt(key, signatureSecret);
            if (!response.success)
            {
                return false;
            }

            this.signatureSecret = response.value!;
        }
        else 
        {
            const response = await environment.utilities.crypt.decrypt(key, this.signatureSecret);
            if (!response.success)
            {
                return false;
            }

            signatureSecret = response.value!;
        }

        let signatureMakeup = this.getSignatureMakeup();
        if (!signatureMakeup)
        {
            return false;
        }

        const seriazliedMakeup = JSON.stringify(signatureMakeup);
        const hashedEntity = environment.utilities.hash.insecureHash(seriazliedMakeup);
        const secretBytes = new TextEncoder().encode(signatureSecret);

        const jwt = await new jose.SignJWT({ entity: hashedEntity })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('vaultic')
            .setAudience('vaulticUser')
            .setExpirationTime('999y')
            .sign(secretBytes);

        this.currentSignature = jwt;
        return true;
    }

    protected async internalVerify(key: string): Promise<TypedMethodResponse<any>>
    {
        if (!this.signatureSecret || !this.currentSignature)
        {
            return TypedMethodResponse.fail(errorCodes.NO_SIGNATURE_SECRET_OR_SIGNATURE);
        }

        const secretResponse = await environment.utilities.crypt.decrypt(key, this.signatureSecret);
        if (!secretResponse.success)
        {
            console.log(`Key: ${key}, Secret: ${this.signatureSecret}`);
            return TypedMethodResponse.fail(errorCodes.DECRYPTION_FAILED);
        }

        let signatureMakeup = this.getSignatureMakeup();
        if (!signatureMakeup)
        {
            return TypedMethodResponse.fail(errorCodes.NO_SIGNATURE_MAKEUP);
        }

        const serializedMakeup = JSON.stringify(signatureMakeup);
        const hashedEntity = environment.utilities.hash.insecureHash(serializedMakeup);
        const secretBytes = new TextEncoder().encode(secretResponse.value!);

        try
        {
            const response = await jose.jwtVerify(this.currentSignature, secretBytes, {
                issuer: 'vaultic',
                audience: 'vaulticUser',
            });

            if (nameof<StoreState>('previousSignature') in this)
            {
                await jose.jwtVerify(this[nameof<StoreState>("previousSignature")], secretBytes, {
                    issuer: 'vaultic',
                    audience: 'vaulticUser',
                });
            }

            const retrievedEntity = response.payload.entity;
            if (!retrievedEntity || typeof retrievedEntity != 'string')
            {
                return TypedMethodResponse.fail(errorCodes.NO_RETRIEVED_ENTITY);
            }

            const equalHashes = environment.utilities.hash.compareHashes(retrievedEntity, hashedEntity);
            if (!equalHashes)
            {
                return TypedMethodResponse.fail(errorCodes.HASHES_DONT_MATCH);
            }

            return TypedMethodResponse.success();
        }
        catch (e)
        {
            return TypedMethodResponse.fail(errorCodes.VERIFICATION_FAILED, e);
        }
    }

    // Attempts to verify entity and all nested entities. Will throw the TypedMethodResponse if 
    // unsuccessfull. Any call that verifies an entity should be wrapped in safetifyMethod
    // at the highest level to catch the thrown error
    async verify(key: string): Promise<boolean>
    {
        const selfVerification = await this.internalVerify(key);
        if (!selfVerification.success)
        {
            selfVerification.addToCallStack(`Verifying ${this.entityName()}`);
            console.log(JSON.stringify(selfVerification));
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
                    console.log(JSON.stringify(selfVerification));

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
            return false;
        }

        const result = await environment.utilities.crypt.encrypt(key, this[property] as string);
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
                const result = await environment.utilities.crypt.encrypt(key, obj[properties[i]] as string);
                if (!result)
                {
                    return false;
                }

                target[properties[i]] = result.value!;
            }
        }

        return true;
    }

    private async decryptAndGet(masterKey: string, property: keyof this, runningObject: { [key: string]: any }): Promise<boolean>
    {
        if (this[property] === undefined || typeof this[property] != 'string')
        {
            return false;
        }

        const result = await environment.utilities.crypt.decrypt(masterKey, this[property] as string);
        if (!result)
        {
            return false;
        }

        // @ts-ignore
        runningObject[property] = result.value!;
        return true;
    }

    public async decryptAndGetEach(masterKey: string, properties: (keyof this)[]): Promise<[boolean, VaulticEntity]>
    {
        let runningObject = this.createNew();
        for (let i = 0; i < properties.length; i++)
        {
            if (!await this.decryptAndGet(masterKey, properties[i], runningObject))
            {
                return [false, {} as VaulticEntity];
            }
        }

        runningObject = runningObject.makeReactive();
        return [true, runningObject];
    }

    public preInsert()
    {
    }
}