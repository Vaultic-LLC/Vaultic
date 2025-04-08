class ErrorCodes 
{
    // General Errors
    get ENCRYPTION_FAILED() { return 10001; }
    get TRANSACTION_FAILED() { return 10003; }
    get NO_USER() { return 10004; }
    get BACKUP_FAILED() { return 10005; }
    get EC_DECRYPTION_FAILED() { return 10006; }
    get EC_ENCRYPTION_FAILED() { return 10007; }
    get INVALID_PROPERTY_WHILE_ENCRYPTING() { return 10008; }
    get HASHING_FAILED() { return 10009; }

    // Entity Verification Errors
    get NO_SIGNATURE() { return 11000; }
    get NO_SIGNATURE_MAKEUP() { return 11001; }
    get NO_RETRIEVED_ENTITY() { return 11002; }
    get VERIFICATION_FAILED() { return 11003; }
    get FAILED_TO_DECRYPT_CONDENSED_VAULT() { return 11004; }
    get NESTED_OBJECT_DOES_NOT_EXIST() { return 11005; }
    get HASHES_DONT_MATCH() { return 11006; }
    get DECRYPTION_FAILED() { return 11007; }
    get E2E_DECRYPTION_FAILED() { return 11008; }

    // Entity Creation Errors
    get FAILED_TO_GET_USER_IDS() { return 12000; }
    get FAILED_TO_CREATE_NEW_VAULT() { return 12001; }

    constructor() { }

    verificationFailed(errorCode: number): boolean
    {
        return errorCode >= this.NO_SIGNATURE &&
            errorCode <= this.DECRYPTION_FAILED;
    }

    userFailedToSave(errorCode?: number): boolean
    {
        if (!errorCode)
        {
            return false;
        }

        return errorCode == this.FAILED_TO_CREATE_NEW_VAULT ||
            errorCode == this.EC_ENCRYPTION_FAILED ||
            errorCode == this.TRANSACTION_FAILED;
    }
}

const errorCodes = new ErrorCodes();
export default errorCodes;