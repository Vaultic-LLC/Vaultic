import { environment } from "../../Environment";
import * as jose from 'jose'
import { Column } from "typeorm"

export class VaulticEntity
{
    [key: string]: any;

    // Encrypted
    // Backed Up
    @Column("text")
    signatureSecret: string

    // Not Encrypted
    // Backed Up
    @Column("text")
    signature: string

    identifier(): number
    {
        throw "need to override";
    }

    async sign(masterKey: string, userID: number): Promise<boolean>
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
            .setAudience(userID.toString())
            .setExpirationTime('999y')
            .sign(secretBytes);

        this.signature = jwt;
        return true;
    }

    protected getSignatureMakeup(): any
    {
        return undefined;
    }

    async verify(masterKey: string, userID: number): Promise<boolean>
    {
        if (!this.signatureSecret || !this.signature)
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

        const response = await jose.jwtVerify(this.signature, secretBytes, {
            issuer: 'vaultic',
            audience: userID.toString(),
        });

        const retrievedEntity = response.payload.entity;
        if (!retrievedEntity || typeof retrievedEntity != 'string')
        {
            return false;
        }

        return environment.utilities.hash.compareHashes(retrievedEntity, hashedEntity);
    }

    public async encryptAndSet(masterKey: string, property: keyof this): Promise<boolean> 
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

    public async encryptAndSetEach(masterKey: string, properties: (keyof this)[]): Promise<boolean> 
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

    protected async decryptAndGet(masterKey: string, property: keyof this, runningObject: { [key: string]: any }): Promise<boolean>
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

    public async decryptAndGetEach(masterKey: string, properties: (keyof this)[]): Promise<[boolean, Partial<this>]>
    {
        const runningObject = {};
        for (let i = 0; i < properties.length; i++)
        {
            if (!await this.decryptAndGet(masterKey, properties[i], runningObject))
            {
                return [false, {}];
            }
        }

        return [true, runningObject];
    }

    async lock(key: string): Promise<boolean>
    {
        return false;
    }

    protected internalGetBackup(): any
    {
        return {};
    }

    getBackup(): any
    {
        return {
            ...this.internalGetBackup(),
            signature: this.signature,
            signatureSecret: this.signatureSecret
        }
    }
}