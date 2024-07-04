export interface MethodResponse
{
	success: boolean;
	errorMessage?: string;
	logID?: number;
	value?: string;
}

export interface HybridEncrypionResponse extends MethodResponse
{
	key?: string;
}
