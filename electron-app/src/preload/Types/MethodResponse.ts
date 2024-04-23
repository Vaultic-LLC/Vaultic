export interface MethodResponse
{
	success: boolean;
	logID?: number;
	value?: string;
}

export interface HybridEncrypionResponse extends MethodResponse
{
	key?: string;
}
