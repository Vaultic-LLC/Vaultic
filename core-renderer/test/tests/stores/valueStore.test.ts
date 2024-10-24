import cryptHelper from '../../src/core/Helpers/cryptHelper';
import { createTestSuite, type TestContext } from '../test';
import createReactiveValue from "../../src/core/Objects/Stores/ReactiveValue";
import app from "../../src/core/Objects/Stores/AppStore";
import { NameValuePair, defaultValue, NameValuePairType, Group, defaultGroup, DataType, Filter, defaultFilter, FilterConditionType } from '../../src/core/Types/DataTypes';
import { Field } from '../../src/core/Types/Fields';

let valueStoreSuite = createTestSuite("Value Store");

const masterKey = "test";

function getSafeValues()
{
    return app.currentVault.valueStore.nameValuePairs.filter(v => !v.isWeak &&
        !app.currentVault.valueStore.duplicateNameValuePairs.value.includes(v.id.value) && !v.isOld);
}

valueStoreSuite.tests.push({
    name: "ValueStore Add Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = "ValueStore Add Works";
        value.notifyIfWeak.value = true;
        value.valueType.value = NameValuePairType.Information;
        value.value.value = "Value";
        value.additionalInformation.value = "AdditionalInformation";

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);
        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];

        const decryptedValue = await cryptHelper.decrypt(masterKey, retrievedValue.value.value);

        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name is correct", retrievedValue.name.value, "ValueStore Add Works");
        ctx.assertEquals("NotifyIfWeak is correct", retrievedValue.notifyIfWeak.value, true);
        ctx.assertEquals("ValueType is correct", retrievedValue.valueType.value, NameValuePairType.Information);
        ctx.assertEquals("Value is correct", decryptedValue.value, "Value");
        ctx.assertEquals("Value length is correct", retrievedValue.valueLength.value, 5);
        ctx.assertEquals("Additional Information is correct", retrievedValue.additionalInformation.value, "AdditionalInformation");
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.name.value = "Mvosnviowengwegnwilgnl";
        weakPhraseValue.valueType.value = NameValuePairType.Passphrase;
        weakPhraseValue.value.value = "weakduplicate";

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPhraseValue.name.value = "MV;lmlvnqlbguilwhguilghwlig";
        weakPasscodeValue.valueType.value = NameValuePairType.Passcode;
        weakPasscodeValue.value.value = "weak";

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.name.value = "MLKZNlkdnfijlbguiweguilhgiwelgw";
        duplicateValue.value.value = "weakduplicate";

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        const retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        const retrievedWeaCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value exists", retrievedWeaCodeValue.length, 1);

        await app.currentVault.valueStore.addNameValuePair(masterKey, duplicateValue);

        const retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(v => v == duplicateValue.id.value);
        const retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(v => v == weakPhraseValue.id.value);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name.value = "mamlsnlwniogwegilwgiowgg";
        safeValue.value.value = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name.value = "mnwiughqwuighq4uighilghnelgng";
        unsafeValue.value.value = "weak";

        await app.currentVault.valueStore.addNameValuePair(masterKey, safeValue);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await app.currentVault.valueStore.addNameValuePair(masterKey, unsafeValue);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = "amsldkvnwlbuweibgwukgbeauilglg";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "ValueStore Add With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);

        value.groups.value.push(group.id.value);

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        const retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.value.filter(g => g == retrievedGroup.id.value).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.value.filter(v => v == retrieveValue.id.value).length, 1);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = "ValueStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name.value = "ValueStore Add With Filter Works";

        filter.conditions.value.push({
            id: new Field("ValueStore Add With Filter Works"),
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: "ValueStore Add With Filter Works"
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        const retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value has filter id", retrievedValue.filters.value.filter(f => f == retrievedFilter.id.value).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 1);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Works", func: async (ctx: TestContext) =>
    {
        const originalName = "ValueStoreUpdateWorks";
        const value: NameValuePair = defaultValue();
        value.name.value = originalName;
        value.notifyIfWeak.value = true;

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const newName = "ValueStoreUpdateWorks--New";
        const newValueType = NameValuePairType.Safe;
        const newNotifyIfWeak = false;
        const newAdditionalInfo = "NewAdditionalInfo";

        value.name.value = newName;
        value.valueType.value = newValueType;
        value.notifyIfWeak.value = newNotifyIfWeak;
        value.additionalInformation.value = newAdditionalInfo;

        await app.currentVault.valueStore.updateNameValuePair(masterKey, value, false);

        const originalValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.name.value == originalName);
        ctx.assertEquals("Original value doesn't exist", originalValue.length, 0);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name was updated", retrievedValue.name.value, newName);
        ctx.assertEquals("Type was updated", retrievedValue.valueType.value, newValueType);
        ctx.assertEquals("NotifyIfWeak was updated", retrievedValue.notifyIfWeak.value, newNotifyIfWeak);
        ctx.assertEquals("AdditionalInformation was updated", retrievedValue.additionalInformation.value, newAdditionalInfo);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Value Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.value.value = "Value";
        value.name.value = "vms;alvnwklnweigwligewg";

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const newValue = "New Value";
        value.value.value = newValue;
        await app.currentVault.valueStore.updateNameValuePair(masterKey, value, true);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const decryptedValue = await cryptHelper.decrypt(masterKey, retrievedValue.value.value);
        ctx.assertEquals("Value was updated", decryptedValue.value, newValue);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const notWeakValue = "s123hgsjhLS HDHFp[]p[L ihsgh lh hsh hwe SLHF shgskljhwkg eghuiSSHGL SDh";
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.name.value = "ms;lvknklvenilwbguilwgwlgwg";
        weakPhraseValue.valueType.value = NameValuePairType.Passphrase;
        weakPhraseValue.value.value = notWeakValue;

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        let retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        weakPhraseValue.value.value = "weak";
        await app.currentVault.valueStore.updateNameValuePair(masterKey, weakPhraseValue, true);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        weakPhraseValue.value.value = notWeakValue;
        await app.currentVault.valueStore.updateNameValuePair(masterKey, weakPhraseValue, true);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value doesn't exist after update", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.name.value = "qwuiegfuiwqvkabvljksdbvmbmansdjklgna";
        weakPasscodeValue.valueType.value = NameValuePairType.Passcode;
        weakPasscodeValue.value.value = notWeakValue;

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        let retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);

        weakPasscodeValue.value.value = "weak";
        await app.currentVault.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        weakPasscodeValue.value.value = notWeakValue;
        await app.currentVault.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value doesn't exists after update", retrievedWeakCodeValue.length, 0);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.name.value = "zxncvlashijhgweilghweroipghwro;igwrg";
        duplicateValue.value.value = "notDuplicate";

        await app.currentVault.valueStore.addNameValuePair(masterKey, duplicateValue);

        let retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id.value);
        ctx.assertEquals("Duplicate value doesn't exists", retrievedDuplicateValueOne.length, 0);

        duplicateValue.value.value = notWeakValue;
        await app.currentVault.valueStore.updateNameValuePair(masterKey, duplicateValue, true);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id.value);
        let retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPhraseValue.id.value);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);

        duplicateValue.value.value = "notDuplicate";
        weakPasscodeValue.value.value = "alsoNotDuplicate";

        await app.currentVault.valueStore.updateNameValuePair(masterKey, duplicateValue, true);
        await app.currentVault.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id.value);
        retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPhraseValue.id.value);

        ctx.assertEquals("Duplicate value one doesn't exists", retrievedDuplicateValueOne.length, 0);
        ctx.assertEquals("Duplicate value two doesn't exists", retrievedDuplicateValueTwo.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name.value = "sm;lwanvwjekgbwuighwuighwigwh";
        safeValue.value.value = "weak";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name.value = "uhweoghisvklsdabvkwehlkebgleibg";
        unsafeValue.value.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        await app.currentVault.valueStore.addNameValuePair(masterKey, safeValue);

        safeValue.value.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";
        await app.currentVault.valueStore.updateNameValuePair(masterKey, safeValue, true);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await app.currentVault.valueStore.addNameValuePair(masterKey, unsafeValue);

        unsafeValue.value.value = "weak";
        await app.currentVault.valueStore.updateNameValuePair(masterKey, unsafeValue, true);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = "msal;vkwanvwebuiogwbguiwhgilenle";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "ValueStore Add With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const valueWithGroup = JSON.parse(JSON.stringify(value));
        valueWithGroup.groups.value.push(group.id.value);

        await app.currentVault.valueStore.updateNameValuePair(masterKey, valueWithGroup, false);

        let retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        let retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.value.filter(g => g == retrievedGroup.id.value).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.value.filter(v => v == retrieveValue.id.value).length, 1);

        const valueWithoutGroup: NameValuePair = JSON.parse(JSON.stringify(valueWithGroup));
        valueWithoutGroup.groups.value = [];

        await app.currentVault.valueStore.updateNameValuePair(masterKey, valueWithoutGroup, false);

        retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertEquals("Value doens't have group id", retrieveValue.groups.value.filter(g => g == retrievedGroup.id.value).length, 0);
        ctx.assertEquals("Group doesn't have value id", retrievedGroup.values.value.filter(v => v == retrieveValue.id.value).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Update With Filter Works";
        const value: NameValuePair = defaultValue();
        value.name.value = name + "--noFilter";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name.value = "ValueStore Update With Filter Works";

        filter.conditions.value.push({
            id: new Field("ValueStore Update With Filter Works"),
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: "ValueStore Update With Filter Works"
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        let retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        let retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value doesn't has filter id", retrievedValue.filters.value.filter(f => f == retrievedFilter.id.value).length, 0);
        ctx.assertEquals("Filter doesn't has value id", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 0);

        value.name.value = name;
        await app.currentVault.valueStore.updateNameValuePair(masterKey, value, false);

        retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertEquals("Value has filter id", retrievedValue.filters.value.filter(f => f == retrievedFilter.id.value).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 1);

        value.name.value = name + "--noFilter";
        await app.currentVault.valueStore.updateNameValuePair(masterKey, value, false);

        retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertEquals("Value doesn't has filter after update", retrievedValue.filters.value.filter(f => f == retrievedFilter.id.value).length, 0);
        ctx.assertEquals("Filter doesn't has value after update", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = "skmklwVIEBWUIAGBILGBLBKLBNERLKGBLER";

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const reactiveValue = createReactiveValue(value);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        const deletedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value);
        ctx.assertEquals("Value does not exist", deletedValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.valueType.value = NameValuePairType.Passphrase;
        weakPhraseValue.value.value = "weak";
        weakPhraseValue.name.value = "mwo;jvwgbweuighwuighweiohgegewg";

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        let retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        const reactiveWeakPhraseValue = createReactiveValue(weakPhraseValue);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveWeakPhraseValue);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id.value);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.valueType.value = NameValuePairType.Passcode;
        weakPasscodeValue.value.value = "weak";
        weakPasscodeValue.name.value = "mvlkasnvkwjgighwuighwuighwlghwg";

        await app.currentVault.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        let retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.value.value = "weak";
        duplicateValue.name.value = "zbxivhsuihweighweuigwgherilgherlg";

        await app.currentVault.valueStore.addNameValuePair(masterKey, duplicateValue);

        let retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id.value);
        let retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPasscodeValue.id.value);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);

        const reactiveDuplicateValue = createReactiveValue(duplicateValue);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveDuplicateValue);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id.value);
        retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPasscodeValue.id.value);

        ctx.assertEquals("Duplicate value one doesn't exists", retrievedDuplicateValueOne.length, 0);

        const reactivepassCodeValue = createReactiveValue(weakPasscodeValue);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactivepassCodeValue);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id.value);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name.value = "hohsdl nuidlvuilvbio;beruilbelbheb";
        safeValue.valueType.value = NameValuePairType.Passcode;
        safeValue.value.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name.value = "snvwvuibuidlhboa;nblabner";
        safeValue.valueType.value = NameValuePairType.Passcode;
        unsafeValue.value.value = "weak";

        await app.currentVault.valueStore.addNameValuePair(masterKey, safeValue);

        let retrievedSafeValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == safeValue.id.value)[0];
        ctx.assertTruthy("Safe value exists", retrievedSafeValue);

        const reactiveSafeValue = createReactiveValue(safeValue);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveSafeValue);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await app.currentVault.valueStore.addNameValuePair(masterKey, unsafeValue);

        let retrievedUnsafeValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == unsafeValue.id.value)[0];
        ctx.assertTruthy("Unsafe value exists", retrievedUnsafeValue);

        const reactiveUnsafeValue = createReactiveValue(unsafeValue);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveUnsafeValue);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValues.current[app.currentVault.valueStore.currentAndSafeValues.current.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValues.safe[app.currentVault.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name.value = " nvibweighweigweaioghwiugbwegihwgw";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "ValueStore Add With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);
        value.groups.value.push(group.id.value);

        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        let retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        let retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.value.filter(g => g == retrievedGroup.id.value).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.value.filter(v => v == retrieveValue.id.value).length, 1);

        const reactiveValue = createReactiveValue(value);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id.value == group.id.value)[0];
        ctx.assertEquals("Group doesn't value id", retrievedGroup.values.value.filter(v => v == retrieveValue.id.value).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Delete With Filter Works";
        const value: NameValuePair = defaultValue();
        value.name.value = name;

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name.value = name;

        filter.conditions.value.push({
            id: new Field(name),
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: name
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        let retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0];
        let retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value has filter id", retrievedValue.filters.value.filter(f => f == retrievedFilter.id.value).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 1);

        const reactiveValue = createReactiveValue(value);
        await app.currentVault.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == filter.id.value)[0];
        ctx.assertEquals("Filter doesn't has value", retrievedFilter.values.value.filter(p => p == retrievedValue.id.value).length, 0);
    }
});

export default valueStoreSuite;