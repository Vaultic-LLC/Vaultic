class ErrorCodes 
{
    // General Errors
    get DECRYPTION_FAILED() { return 10000 };
    get ENCRYPTION_FAILED() { return 10001 };
    get HASHES_DONT_MATCH() { return 10002 };

    // Entity Verification Errors
    get NO_SIGNATURE_SECRET_OR_SIGNATURE() { return 10100 };
    get NO_SIGNATURE_MAKEUP() { return 10101 };
    get NO_RETRIEVED_ENTITY() { return 10102 };
    get VERIFICATION_FAILED() { return 10103 };

    constructor() { }
}

const errorCodes = new ErrorCodes();
export default errorCodes;