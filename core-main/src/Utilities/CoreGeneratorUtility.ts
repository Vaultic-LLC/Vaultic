import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { PublicPrivateKey, CoreGeneratorUtility } from '@vaultic/shared/Types/Utilities';

async function ECKeys(): Promise<PublicPrivateKey>
{
    const priv = x25519.utils.randomPrivateKey();
    const pub = x25519.getPublicKey(priv);

    const privHex = bytesToHex(priv);
    const pubHex = bytesToHex(pub);

    return {
        private: privHex,
        public: pubHex
    }
}

const coreGenerator: CoreGeneratorUtility =
{
    ECKeys
};

export default coreGenerator;