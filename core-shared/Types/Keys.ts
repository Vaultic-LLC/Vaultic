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

export interface SignedVaultKey
{
    signature: string;
    message: SignedVaultKeyMessage;
}

export interface PublicPrivateKey<T>
{
    public: T;
    private: T;
}

export enum Algorithm
{
    XCHACHA20_POLY1305,
    ML_DSA_87,
    ML_KEM_1024,
    Vaultic_Key_Share
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

export interface VaulticKey extends AlgorithmDependentData
{
    key: string;
}