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

export interface ECEncryptionResult extends MethodResponse
{
	publicKey: string;
}

export interface PublicPrivateKey
{
	public: string;
	private: string;
}
