import errorCodes from "./ErrorCodes";

export class TypedMethodResponse<T>
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

    addToCallStack(call: string | undefined)
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
        const stack = Error().stack;
        return new TypedMethodResponse<T>(false, errorCode, stack, errorMessage, logID, invalidSession, value);
    }

    static propagateFail<T>(response: TypedMethodResponse<any>, callStack?: string)
    {
        response.addToCallStack(Error().stack);
        return TypedMethodResponse.fail<T>(response.errorCode, response.callStack, response.errorMessage, response.logID, response.invalidSession);
    }

    static failWithValue<T>(value?: T)
    {
        return TypedMethodResponse.fail<T>(undefined, undefined, undefined, undefined, undefined, value);
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

export interface ECEncryptionResult
{
    data: string;
    publicKey: string;
}