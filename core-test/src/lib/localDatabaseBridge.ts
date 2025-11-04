import { api } from "@renderer/API";

// This is this used so that I don't have to use the @ts-ignore everywhere
class LocalDatabaseBridge
{
    constructor() {}

    async query<T = any>(query: string): Promise<T[]>
    {
        // @ts-ignore
        return await api.environment.runLocalQuery(query);
    }

    async getAllVaultDataByID(userVaultID: number): Promise<any>
    {
        const result = await this.query(`
            SELECT * 
            FROM "UserVaults" AS uv
            INNER JOIN "VaultPreferencesStoreStates" vp ON "uv"."UserVaultID" = "vp"."UserVaultID"
            INNER JOIN "Vaults" v ON "ov"."VaultID" = "v"."VaultID"
            INNER JOIN "VaultStoreStates" vss ON "vss"."VaultID" = "v"."VaultID"
            INNER JOIN "PasswordStoreStates" pss ON "pss"."VaultID" = "v"."VaultID"
            INNER JOIN "ValueStoreStates" vass ON "vass"."VaultID" = "v"."VaultID"
            INNER JOIN "FilterStoreStates" fss ON "fss"."VaultID" = "v"."VaultID"
            INNER JOIN "GroupStoreStates" gss ON "gss"."VaultID" = "v"."VaultID"
            WHERE "uv"."UserVaultID" = ${userVaultID}`);

        if (result.length === 0)
        {
            return undefined;
        }

        return result[0];
    } 
}

const localDatabase = new LocalDatabaseBridge();
export default localDatabase;