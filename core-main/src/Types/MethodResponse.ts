export interface TypedMethodResponse<T>
{
    success: boolean;
    errorMessage?: string;
    logID?: number;
    invalidSession?: boolean;
    value?: T;
}

export interface MethodResponse extends TypedMethodResponse<string>
{
    value?: string;
}

export interface HybridEncrypionResponse extends MethodResponse
{
    key?: string;
}

export interface ECEncryptionResult extends MethodResponse
{
    publicKey: string;
}
