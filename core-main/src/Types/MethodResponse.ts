export interface MethodResponse
{
    success: boolean;
    errorMessage?: string;
    logID?: number;
    value?: string;
    invalidSession?: boolean;
}

export interface HybridEncrypionResponse extends MethodResponse
{
    key?: string;
}
