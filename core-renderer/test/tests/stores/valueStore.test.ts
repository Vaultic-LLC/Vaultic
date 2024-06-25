import { stores } from "../../src/core/Objects/Stores/index";
import { NameValuePairType, defaultValue, type NameValuePair } from '../../src/core/Types/EncryptedData';
import cryptHelper from '../../src/core/Helpers/cryptHelper';
import { createTestSuite, type ITest, type TestContext } from '../test';
import createReactiveValue from "../../src/core/Objects/Stores/ReactiveValue";

let valueStoreSuite = createTestSuite("Value Store");

const masterKey = "test";

valueStoreSuite.tests.push({
    name: "ValueStore Add Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();

        await stores.valueStore.addNameValuePair(masterKey, value);
        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];

        ctx.assertTruthy("Value Exists", retrievedValue);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Works", func: async (ctx: TestContext) =>
    {
        const originalName = "ValueStoreUpdateWorks";
        const value: NameValuePair = defaultValue();
        value.name = originalName;
        value.notifyIfWeak = true;

        await stores.valueStore.addNameValuePair(masterKey, value);

        const newName = "New Name";
        const newValueType = NameValuePairType.Safe;
        const newNotifyIfWeak = false;
        const newAdditionalInfo = "NewAdditionalInfo";

        value.name = newName;
        value.valueType = newValueType;
        value.notifyIfWeak = newNotifyIfWeak;
        value.additionalInformation = newAdditionalInfo;

        await stores.valueStore.updateNameValuePair(masterKey, value, false);

        const originalValue = stores.valueStore.nameValuePairs.filter(v => v.name == originalName);
        ctx.assertEquals("Original value doesn't exist", originalValue.length, 0);

        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name was updated", retrievedValue.name, newName);
        ctx.assertEquals("Type was updated", retrievedValue.valueType, newValueType);
        ctx.assertEquals("NotifyIfWeak was updated", retrievedValue.notifyIfWeak, newNotifyIfWeak);
        ctx.assertEquals("AdditionalInformation was updated", retrievedValue.additionalInformation, newAdditionalInfo);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Value Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.value = "Value";

        await stores.valueStore.addNameValuePair(masterKey, value);

        const newValue = "New Value";
        value.value = newValue;
        await stores.valueStore.updateNameValuePair(masterKey, value, true);

        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const decryptedValue = await cryptHelper.decrypt(masterKey, retrievedValue.value);
        ctx.assertEquals("Value was updated", decryptedValue.value, newValue);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();

        await stores.valueStore.addNameValuePair(masterKey, value);

        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const reactiveValue = createReactiveValue(value);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        const deletedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id);
        ctx.assertEquals("Value does not exist", deletedValue.length, 0);
    }
});

export default valueStoreSuite;