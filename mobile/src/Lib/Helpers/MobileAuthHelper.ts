import { registerPlugin } from '@capacitor/core';
import { AuthHelper } from '@vaultic/shared/Types/API';

const biometricAuthPlugin = registerPlugin<BiometricAuthPlugin>('BiometricAuthPlugin');

interface BiometricAuthPlugin 
{
    isAvailable(): Promise<{ available: boolean }>;
    isDeviceSecure(): Promise<{ secure: boolean }>;
    enable(options: { masterKey: string, email: string }): Promise<{ success: boolean; errorCode?: string }>;
    unlock(): Promise<{ success: boolean, key?: string, email?: string }>;
}

export class MobileAuthHelper implements AuthHelper
{
    async isBiometricAvailable(): Promise<boolean>
    {
        const result = await biometricAuthPlugin.isAvailable();
        if (typeof result === 'object' && 'available' in result)
        {
            return result.available === true;
        }

        return false;
    }

    async isDeviceSecure(): Promise<boolean>
    {
        const result = await biometricAuthPlugin.isDeviceSecure();
        return typeof result === 'object' && 'secure' in result && result.secure === true;
    }

    async promptToStoreBiometric(key: string, email: string): Promise<{ success: boolean; errorCode?: string }>
    {
        const result = await biometricAuthPlugin.enable({ masterKey: key, email: email });
        if (typeof result === 'object' && 'success' in result)
        {
            return {
                success: result.success === true,
                ...(result.errorCode != null && { errorCode: result.errorCode })
            };
        }

        return { success: false };
    }

    async promptToUnlockBiometric(): Promise<{ key: string, email: string } | false>
    {
        const result = await biometricAuthPlugin.unlock();
        if (typeof result === 'object' && 'success' in result)
        {
            if (result.success === true && 'key' in result && 'email' in result)
            {
                return { key: result.key as string, email: result.email as string };
            }
        }

        return false;
    }
}