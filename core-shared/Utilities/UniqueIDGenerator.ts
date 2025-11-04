// Generates Short and Unique IDs. 
// This probably won't work across the main and renderer process, but that shouldn't be an issue as
// enough time sould pass between them before generating the next value
class UniqueIDGenerator
{
    private lastGeneratedPrefix: string;
    private lastGeneratedCount: number;

    constructor()
    {
        this.lastGeneratedPrefix = '';
        this.lastGeneratedCount = 0;
    }

    generate()
    {
        const prefix = Date.now().toString(36);
        if (this.lastGeneratedPrefix === prefix)
        {
            this.lastGeneratedCount += 1;
        }
        else
        {
            this.lastGeneratedCount = 0;
        }

        this.lastGeneratedPrefix = prefix;
        return `${prefix}${this.lastGeneratedCount}`;
    }
}

export const uniqueIDGenerator = new UniqueIDGenerator();