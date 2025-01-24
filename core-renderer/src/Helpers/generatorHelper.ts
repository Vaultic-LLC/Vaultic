import { IIdentifiable } from "@vaultic/shared/Types/Fields";
import { api } from "../API";
import qrCode from "qrcode";

export async function generateUniqueID<T extends IIdentifiable>(existingItems: T[]): Promise<string>
{
    let hasDuplicate: boolean = true;
    let id: string = "";

    while (hasDuplicate)
    {
        id = await api.utilities.generator.uniqueId();
        hasDuplicate = existingItems.some(i => i.id.value == id);
    }

    return id;
}

export async function generateUniqueIDForMap(existingItems: Map<string, any>): Promise<string>
{
    let hasDuplicate: boolean = true;
    let id: string = "";

    while (hasDuplicate)
    {
        id = await api.utilities.generator.uniqueId();
        hasDuplicate = existingItems.has(id);
    }

    return id;
}

export function generateMFAQRCode(issuedTo: string, key: string): Promise<any>
{
    return new Promise((resolve, reject) =>
    {
        const url = `otpauth://totp/${issuedTo}?secret=${key}&issuer=Vaultic`
        qrCode.toDataURL(url, function (err, data_url)
        {
            if (err)
            {
                reject();
            }

            resolve(data_url);
        });
    })
}