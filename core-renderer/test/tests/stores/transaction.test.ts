import { TestContext, createTestSuite } from "../test";
import app from "../../src/core/Objects/Stores/AppStore";
import { defaultFilter, DataType, FilterConditionType, defaultGroup, defaultPassword } from "../../src/core/Types/DataTypes";
import { Field } from "@vaultic/shared/Types/Fields";

let transactionTestSuite = createTestSuite("Transaction");

const masterKey = "test";

transactionTestSuite.tests.push({
    name: "Store states aren't updated if transaction fails", func: async (ctx: TestContext) =>
    {
        const test = "Transaction rollbacks store states on fail";

        const filter = defaultFilter(DataType.Passwords);
        filter.conditions.value.set(test, Field.create({
            id: Field.create(test),
            property: Field.create("login"),
            filterType: Field.create(FilterConditionType.EqualTo),
            value: Field.create(test)
        }));

        await app.currentVault.filterStore.addFilter(masterKey, filter);

        const group = defaultGroup(DataType.Passwords);
        await app.currentVault.groupStore.addGroup(masterKey, group);

        const password = defaultPassword();
        password.login.value = test;
        password.groups.value.set(group.id.value, Field.create(group.id.value));

        const passwordStoreState = JSON.vaulticStringify(app.currentVault.passwordStore.getState());
        const filterStoreState = JSON.vaulticStringify(app.currentVault.filterStore.getState());
        const groupStoreState = JSON.vaulticStringify(app.currentVault.groupStore.getState());

        // wrong master key should fail
        const success = await app.currentVault.passwordStore.addPassword("", password);
        ctx.assertTruthy("Save Password failed", !success);

        ctx.assertEquals("Password states", JSON.vaulticStringify(app.currentVault.passwordStore.getState()), passwordStoreState);
        ctx.assertEquals("Filter states", JSON.vaulticStringify(app.currentVault.filterStore.getState()), filterStoreState);
        ctx.assertEquals("Group states", JSON.vaulticStringify(app.currentVault.groupStore.getState()), groupStoreState);
    }
});

export default transactionTestSuite;