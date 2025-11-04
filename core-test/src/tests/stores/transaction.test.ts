import localDatabase from "@lib/localDatabaseBridge";
import { TestContext, TestSuites, createTestSuite } from "@lib/test";
import userManager from "@lib/userManager";
import app from "@renderer/Objects/Stores/AppStore";
import { defaultFilter, DataType, FilterConditionType, defaultGroup, defaultPassword } from "@renderer/Types/DataTypes";
import { IFilterStoreState, IGroupStoreState, IPasswordStoreState } from "@vaultic/shared/Types/Entities";

let transactionTestSuite = createTestSuite("Transaction", TestSuites.Transaction);

transactionTestSuite.tests.push({
    name: "Store states aren't updated if transaction fails", func: async (ctx: TestContext) =>
    {
        const test = "Transaction rollbacks store states on fail";

        const filter = defaultFilter(DataType.Passwords);
        filter.c[test] =
        {
            id: test,
            p: "l",
            t: FilterConditionType.EqualTo,
            v: test
        };

        await userManager.defaultUser.addFilter("Add filter", ctx, filter);

        const group = defaultGroup(DataType.Passwords);
        await userManager.defaultUser.addGroup("Add group", ctx, group);

        const password = defaultPassword();
        password.l = test;
        password.p = "test";
        password.g[group.id] = true;

        const passwordStoreState = JSON.stringify(app.currentVault.passwordStore.getState());
        const filterStoreState = JSON.stringify(app.currentVault.filterStore.getState());
        const groupStoreState = JSON.stringify(app.currentVault.groupStore.getState());

        const currentLocalPasswordStoreState = (await localDatabase.query<IPasswordStoreState>(`SELECT * FROM "PasswordStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];
        const currentLocalFilterStoreState = (await localDatabase.query<IFilterStoreState>(`SELECT * FROM "FilterStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];
        const currentLocalGroupStoreState = (await localDatabase.query<IGroupStoreState>(`SELECT * FROM "GroupStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];

        // wrong master key should fail
        const pendingPasswordState = app.currentVault.passwordStore.getPendingState()!;
        const success = await app.currentVault.passwordStore.addPassword("", password, [], pendingPasswordState);
        ctx.assertTruthy("Save Password failed", !success);

        ctx.assertEquals("Password states", JSON.stringify(app.currentVault.passwordStore.getState()), passwordStoreState);
        ctx.assertEquals("Filter states", JSON.stringify(app.currentVault.filterStore.getState()), filterStoreState);
        ctx.assertEquals("Group states", JSON.stringify(app.currentVault.groupStore.getState()), groupStoreState);

        const newLocalPasswordStoreState = (await localDatabase.query<IPasswordStoreState>(`SELECT * FROM "PasswordStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];
        const newLocalFilterStoreState = (await localDatabase.query<IFilterStoreState>(`SELECT * FROM "FilterStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];
        const newLocalGroupStoreState = (await localDatabase.query<IGroupStoreState>(`SELECT * FROM "GroupStoreStates" WHERE "VaultID" = ${app.currentVault.vaultID}`))[0];

        ctx.assertEquals("Password states are the same", currentLocalPasswordStoreState.state, newLocalPasswordStoreState.state);
        ctx.assertEquals("Password signatures are the same", currentLocalPasswordStoreState.currentSignature, newLocalPasswordStoreState.currentSignature);

        ctx.assertEquals("Filter states are the same", currentLocalFilterStoreState.state, newLocalFilterStoreState.state);
        ctx.assertEquals("Filter signatures are the same", currentLocalFilterStoreState.currentSignature, newLocalFilterStoreState.currentSignature);

        ctx.assertEquals("Group states are the same", currentLocalGroupStoreState.state, newLocalGroupStoreState.state);
        ctx.assertEquals("Group signatures are the same", currentLocalGroupStoreState.currentSignature, newLocalGroupStoreState.currentSignature);
    }
});

export default transactionTestSuite;