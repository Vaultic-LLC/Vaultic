import { api } from "../API";
import qrCode from "qrcode";

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