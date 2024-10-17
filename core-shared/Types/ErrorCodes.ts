class ErrorCodes 
{
    // General Errors
    get DECRYPTION_FAILED() { return 10000; }
    get ENCRYPTION_FAILED() { return 10001; }
    get HASHES_DONT_MATCH() { return 10002; }
    get TRANSACTION_FAILED() { return 10003; }
    get NO_USER() { return 10004; }
    get BACKUP_FAILED() { return 10005; }
    get EC_DECRYPTION_FAILED() { return 10006; }
    get EC_ENCRYPTION_FAILED() { return 10007; }

    // Entity Verification Errors
    get NO_SIGNATURE_SECRET_OR_SIGNATURE() { return 11000; }
    get NO_SIGNATURE_MAKEUP() { return 11001; }
    get NO_RETRIEVED_ENTITY() { return 11002; }
    get VERIFICATION_FAILED() { return 11003; }
    get FAILED_TO_DECRYPT_CONDENSED_VAULT() { return 11004; }
    get NESTED_OBJECT_DOES_NOT_EXIST() { return 11005; }

    // Entity Creation Errors
    get FAILED_TO_GET_USER_IDS() { return 12000; }
    get FAILED_TO_CREATE_NEW_VAULT() { return 12001; }

    constructor() { }

    verificationFailed(errorCode: number): boolean
    {
        return errorCode >= this.NO_SIGNATURE_SECRET_OR_SIGNATURE &&
            errorCode <= this.NESTED_OBJECT_DOES_NOT_EXIST;
    }

    userFailedToSave(errorCode: number): boolean
    {
        return errorCode == this.FAILED_TO_CREATE_NEW_VAULT ||
            errorCode == this.EC_ENCRYPTION_FAILED ||
            errorCode == this.TRANSACTION_FAILED;
    }
}

const errorCodes = new ErrorCodes();
export default errorCodes;