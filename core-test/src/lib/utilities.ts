import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import { api } from "@renderer/API";
import app from "@renderer/Objects/Stores/AppStore";
import { TestContext } from "./test";

const plainMasterKey: string = "test";
const key: VaulticKey = { algorithm: Algorithm.XCHACHA20_POLY1305, key: plainMasterKey };

const masterKey = JSON.stringify(key);
const email = "fuzzy1170@gmail.com";

export const testUser =
{
    plainMasterKey,
    masterKey,
    email
};

export async function logUserIn(ctx: TestContext)
{
    await app.lock();

    let response = await api.helpers.server.logUserIn(plainMasterKey, email, false, false);

    let logInRetrys = 0;
    while (response.value?.isSyncing)
    {
        if (logInRetrys >= 5)
        {
            ctx.assertTruthy("Syncing is taking too long", false);
            return;
        }

        logInRetrys += 1;
        await new Promise((resolve) =>
            setTimeout(async () =>
            {
                response = await api.helpers.server.logUserIn(plainMasterKey, email, false, false);
                resolve(true);
            }, 1000));
    }

    ctx.assertTruthy("Log user in works", response.success && response.value!.Success);
    app.isOnline = true;

    if (response.value?.masterKey)
    {
        const loadDataResponse = await app.loadUserData(response.value?.masterKey!);
        ctx.assertTruthy("Load User Data works", loadDataResponse);

        if (loadDataResponse)
        {
            const syncDataResponse = await app.syncVaults(response.value?.masterKey!, email, true);
            ctx.assertTruthy("Sync Data Works", syncDataResponse);
        }
    }
    else
    {
        const syncAndLoadDataResponse = await app.syncAndLoadUserData(plainMasterKey, email);
        ctx.assertTruthy("Sync And Load Data Works", syncAndLoadDataResponse);
    }
}