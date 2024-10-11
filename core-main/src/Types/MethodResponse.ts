import errorCodes from "./ErrorCodes";

// TODO: clean up ffs in type PR
export interface ITypedMethodResponse<T>
{
    success: boolean;
    errorCode?: number;
    callStack?: string;
    errorMessage?: string;
    logID?: number;
    invalidSession?: boolean;
    value?: T;
}

export interface MethodResponse extends ITypedMethodResponse<string>
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

export class TypedMethodResponse<T> implements ITypedMethodResponse<T>
{
    success: boolean;
    errorCode?: number;
    callStack?: string;
    errorMessage?: string;
    logID?: number;
    invalidSession?: boolean;
    value?: T;

    constructor(success: boolean, errorCode?: number, callStack?: string, errorMessage?: string, logID?: number, invalidSession?: boolean, value?: T)
    {
        this.success = success;
        this.errorCode = errorCode ?? -1;
        this.callStack = callStack ?? "";
        this.errorMessage = errorMessage ?? "";
        this.logID = logID;
        this.invalidSession = invalidSession;
        this.value = value;
    }

    addToCallStack(call: string)
    {
        this.callStack += `\n${call}`;
    }

    addToErrorMessage(message: string)
    {
        this.errorMessage += `\n${message}`;
    }

    static success<T>(value?: T)
    {
        return new TypedMethodResponse(true, undefined, undefined, undefined, undefined, undefined, value);
    }

    static fail<T>(errorCode?: number, callStack?: string, errorMessage?: string, logID?: number, invalidSession?: boolean, value?: T)
    {
        return new TypedMethodResponse<T>(false, errorCode, callStack, errorMessage, logID, invalidSession, value);
    }

    static failWithValue<T>(value?: T)
    {
        return new TypedMethodResponse<T>(false, undefined, undefined, undefined, undefined, undefined, value);
    }

    static transactionFail<T>()
    {
        return TypedMethodResponse.fail<T>(errorCodes.TRANSACTION_FAILED);
    }

    static backupFail<T>()
    {
        return TypedMethodResponse.fail<T>(errorCodes.BACKUP_FAILED);
    }
}