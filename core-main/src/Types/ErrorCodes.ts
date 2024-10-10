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

    constructor() { }
}

const errorCodes = new ErrorCodes();
export default errorCodes;