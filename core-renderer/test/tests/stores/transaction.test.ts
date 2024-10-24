import { TestContext, createTestSuite } from "../test";
import app from "../../src/core/Objects/Stores/AppStore";
import { defaultFilter, DataType, FilterConditionType, defaultGroup, defaultPassword } from "../../src/core/Types/DataTypes";
import { Field } from "../../src/core/Types/Fields";

let transactionTestSuite = createTestSuite("Transaction");

const masterKey = "test";

transactionTestSuite.tests.push({
    name: "Store states aren't updated if transaction fails", func: async (ctx: TestContext) =>
    {
        const test = "Transaction rollbacks store states on fail";

        const filter = defaultFilter(DataType.Passwords);
        filter.conditions.value.push({
            id: new Field(test),
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: test
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);

        const group = defaultGroup(DataType.Passwords);
        await app.currentVault.groupStore.addGroup(masterKey, group);

        const password = defaultPassword();
        password.login.value = test;
        password.groups.value.push(group.id.value);

        const passwordStoreState = JSON.stringify(app.currentVault.passwordStore.getState());
        const filterStoreState = JSON.stringify(app.currentVault.filterStore.getState());
        const groupStoreState = JSON.stringify(app.currentVault.groupStore.getState());

        // wrong master key should fail
        const success = await app.currentVault.passwordStore.addPassword("", password);
        ctx.assertTruthy("Save Password failed", !success);

        ctx.assertEquals("Password states", JSON.stringify(app.currentVault.passwordStore.getState()), passwordStoreState);
        ctx.assertEquals("Filter states", JSON.stringify(app.currentVault.filterStore.getState()), filterStoreState);
        ctx.assertEquals("Group states", JSON.stringify(app.currentVault.groupStore.getState()), groupStoreState);
    }
});

export default transactionTestSuite;