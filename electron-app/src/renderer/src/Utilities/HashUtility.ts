import { createHash } from "crypto"

class HashUtility
{
    constructor() { }

    public hash(value: string): string
    {
        return createHash('sha256').update(value).digest('base64');
    }
}

const hashUtility: HashUtility = new HashUtility();
export default hashUtility;