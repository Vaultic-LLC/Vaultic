import { environment } from "../../Environment";
import * as jose from 'jose'

export class VaulticEntity
{
    @Column()
    signatureSecret: string

    @Column()
    signature: string

    async sign(masterKey: string, userIdentifier: string): Promise<boolean>
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
            .setAudience(userIdentifier)
            .setExpirationTime('999y')
            .sign(secretBytes);

        this.signature = jwt;
        return true;
    }

    protected getSignatureMakeup(): any
    {
        return undefined;
    }

    async verify(masterKey: string, userIdentifier: string): Promise<boolean>
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
            audience: userIdentifier,
        });

        const retrievedEntity = response.payload.entity;
        if (!retrievedEntity || typeof retrievedEntity != 'string')
        {
            return false;
        }

        return environment.utilities.hash.compareHashes(retrievedEntity, hashedEntity);
    }

    protected async encryptAndSet(masterKey: string, property: keyof this): Promise<boolean> 
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

    protected async encryptAndSetEach(masterKey: string, properties: (keyof this)[]): Promise<boolean> 
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

    protected async decryptAndSet(masterKey: string, property: keyof this): Promise<boolean>
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

        //@ts-ignore
        this[property] = result.value!;
        return true;
    }

    async lock(key: string): Promise<boolean>
    {
        return false;
    }
}