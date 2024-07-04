import { DataFile, defaultFilter, defaultGroup, defaultPassword } from "../../src/core/Types/EncryptedData";
import { TestContext, createTestSuite } from "../test";
import { DataType, FilterConditionType } from "../../src/core/Types/Table";
import { stores } from "../../src/core/Objects/Stores";
import { api } from "../../src/core/API";

let transactionTestSuite = createTestSuite("Transaction");

const masterKey = "test";

transactionTestSuite.tests.push({
    name: "Store states aren't updated if transaction fails", func: async (ctx: TestContext) =>
    {
        const test = "Transaction rollbacks store states on fail";

        const filter = defaultFilter(DataType.Passwords);
        filter.conditions.push({
            id: test,
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: test
        });

        await stores.filterStore.addFilter(masterKey, filter);

        const group = defaultGroup(DataType.Passwords);
        await stores.groupStore.addGroup(masterKey, group);

        const password = defaultPassword();
        password.login = test;
        password.groups.push(group.id);

        // groups are saved last in the add password workflow. This will cause it to fail, 
        // triggering a rollback of filters and passwords
        stores.groupStore.getFile = () => ({} as DataFile);

        const passwordStoreState = JSON.stringify(stores.passwordStore.getState());
        const filterStoreState = JSON.stringify(stores.filterStore.getState());
        const groupStoreState = JSON.stringify(stores.groupStore.getState());

        const success = await stores.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Save Password failed", !success);

        ctx.assertEquals("Password states", JSON.stringify(stores.passwordStore.getState()), passwordStoreState);
        ctx.assertEquals("Filter states", JSON.stringify(stores.filterStore.getState()), filterStoreState);
        ctx.assertEquals("Group states", JSON.stringify(stores.groupStore.getState()), groupStoreState);

        stores.groupStore.getFile = () => api.files.group;
    }
});

transactionTestSuite.tests.push({
    name: "Store files are rolled back if transaction fails", func: async (ctx: TestContext) =>
    {
        const test = "Store files are rolled back if transaction fails";

        const filter = defaultFilter(DataType.Passwords);
        filter.conditions.push({
            id: test,
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: test
        });

        await stores.filterStore.addFilter(masterKey, filter);

        const group = defaultGroup(DataType.Passwords);
        await stores.groupStore.addGroup(masterKey, group);

        const password = defaultPassword();
        password.login = test;
        password.groups.push(group.id);

        // groups are saved last in the add password workflow. This will cause it to fail, 
        // triggering a rollback of filters and passwords
        stores.groupStore.getFile = () => ({} as DataFile);

        const passwordStoreState = JSON.stringify(stores.passwordStore.getState());
        const filterStoreState = JSON.stringify(stores.filterStore.getState());
        const groupStoreState = JSON.stringify(stores.groupStore.getState());

        const success = await stores.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Save Password failed", !success);

        stores.groupStore.getFile = () => api.files.group;

        // re reading in the files should give the same state as before trying to save the password
        stores.passwordStore.resetToDefault();
        await stores.passwordStore.readState(masterKey);

        stores.filterStore.resetToDefault();
        await stores.filterStore.readState(masterKey);

        stores.groupStore.resetToDefault();
        await stores.groupStore.readState(masterKey);

        ctx.assertEquals("Password states", JSON.stringify(stores.passwordStore.getState()), passwordStoreState);
        ctx.assertEquals("Filter states", JSON.stringify(stores.filterStore.getState()), filterStoreState);
        ctx.assertEquals("Group states", JSON.stringify(stores.groupStore.getState()), groupStoreState);
    }
});

export default transactionTestSuite;