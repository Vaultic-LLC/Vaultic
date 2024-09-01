import { environment } from "../../Environment";
import * as jose from 'jose'
import { Column, ObjectLiteral, PrimaryGeneratedColumn } from "typeorm"
import { nameof } from "../../Helpers/TypeScriptHelper";
import { EntityState } from "../../Types/Properties";

const VaulticHandler = {
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

        obj[prop] = newValue;
        return true;
    }
};

export class VaulticEntity implements ObjectLiteral
{
    @PrimaryGeneratedColumn("increment")
    id: number

    // Encrypted
    // Backed Up
    @Column("text")
    signatureSecret: string

    // Not Encrypted
    // Backed Up
    @Column("text")
    currentSignature: string

    @Column("integer")
    entityState: EntityState;

    updatedProperties: string[];

    constructor() 
    {
        this.updatedProperties = [];
    }

    identifier(): number
    {
        throw "need to override";
    }

    protected createNew(): VaulticEntity
    {
        return new VaulticEntity();
    }

    public makeReactive(): VaulticEntity
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

    protected internalGetBackupableProperties(): string[]
    {
        return [];
    }

    getBackup(): any
    {
        const backup = {};
        backup[nameof<VaulticEntity>("signatureSecret")] = this[nameof<VaulticEntity>("signatureSecret")];
        backup[nameof<VaulticEntity>("currentSignature")] = this[nameof<VaulticEntity>("currentSignature")];

        const backupableProperties = this.internalGetBackupableProperties();
        for (let i = 0; i < backupableProperties.length; i++)
        {
            backup[backupableProperties[i]] = this[backupableProperties[i]];
        }

        return backup;
    }

    async sign(masterKey: string): Promise<boolean>
    {
        let signatureSecret = "";
        if (!this.signatureSecret)
        {
            signatureSecret = environment.utilities.hash.insecureHash(environment.utilities.generator.randomValue(40));

            const response = await environment.utilities.crypt.encrypt(masterKey, signatureSecret);
            if (!response.success)
            {
                return false;
            }

            this.signatureSecret = response.value!;
        }
        else 
        {
            const response = await environment.utilities.crypt.decrypt(masterKey, this.signatureSecret);
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

    async verify(masterKey: string): Promise<boolean>
    {
        if (!this.signatureSecret || !this.currentSignature)
        {
            return false;
        }

        const secretResponse = await environment.utilities.crypt.decrypt(masterKey, this.signatureSecret);
        if (!secretResponse.success)
        {
            return false;
        }

        let signatureMakeup = this.getSignatureMakeup();
        if (!signatureMakeup)
        {
            return false;
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

            const retrievedEntity = response.payload.entity;
            if (!retrievedEntity || typeof retrievedEntity != 'string')
            {
                console.log('no entity');
                return false;
            }

            return environment.utilities.hash.compareHashes(retrievedEntity, hashedEntity);
        }
        catch (e)
        {
            console.log(`error: ${e}`);
        }

        return false;
    }

    public async encryptAndSet(masterKey: string, property: string): Promise<boolean> 
    {
        if (this[property] === undefined || typeof this[property] != 'string')
        {
            return false;
        }

        const result = await environment.utilities.crypt.encrypt(masterKey, this[property] as string);
        if (!result)
        {
            return false;
        }

        //@ts-ignore
        this[property] = result.value!;
        return true;
    }

    public async encryptAndSetEach(masterKey: string, properties: string[]): Promise<boolean> 
    {
        for (let i = 0; i < properties.length; i++)
        {
            if (!await this.encryptAndSet(masterKey, properties[i]))
            {
                return false;
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

    async lock(key: string): Promise<boolean>
    {
        return false;
    }
}