export enum PublicKeyType
{
    Signing,
    Encrypting,
    Both
}

export interface PublicKeys
{
    PublicSigningKey?: string;
    PublicEncryptingKey?: string;
}

export interface SignedVaultKeyMessage
{
    senderUserID: number;
    cipherText: string;
    vaultKey: string;
}

export interface PublicPrivateKey<T>
{
    public: T;
    private: T;
}

// keep in sync with server
export enum Algorithm
{
    XCHACHA20_POLY1305 = "XCHACHA20_POLY1305",
    ML_DSA_87 = "ML_DSA_87",
    ML_KEM_1024 = "ML_KEM_1024",
    Vaultic_Key_Share = "Vaultic_Key_Share",
    SHA_256 = "SHA_256"
}

export interface MLKEM1024KeyResult
{
    cipherText: string;
    value: string;
}

export type StartKeyResult = string | MLKEM1024KeyResult;
export type FinishKeyResult = string | boolean;

export interface AlgorithmDependentData
{
    algorithm: Algorithm;
}

export interface SignedVaultKey extends AlgorithmDependentData
{
    signature: string;
    message: SignedVaultKeyMessage;
}

export interface VaulticKey extends AlgorithmDependentData
{
    key: string;
}

export interface AsymmetricVaulticKey extends VaulticKey
{
    symmetricAlgorithm: Algorithm;
}

export interface KSFParams
{
    iterations: number;
    memory: number;
    parallelism: number;
}