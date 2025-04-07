import { x25519 } from '@noble/curves/ed25519';
import { CoreGeneratorUtility } from '@vaultic/shared/Types/Utilities';
import { PublicPrivateKey } from '@vaultic/shared/Types/Keys';
import { environment } from '../Environment';

async function ECKeys(): Promise<PublicPrivateKey<string>>
{
    const priv = x25519.utils.randomPrivateKey();
    const pub = x25519.getPublicKey(priv);

    const privHex = environment.utilities.crypt.bytesToHex(priv);
    const pubHex = environment.utilities.crypt.bytesToHex(pub);

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