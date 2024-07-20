import { stores } from "../../src/core/Objects/Stores/index";
import { NameValuePairType, defaultFilter, defaultGroup, defaultValue, type NameValuePair } from '../../src/core/Types/EncryptedData';
import cryptHelper from '../../src/core/Helpers/cryptHelper';
import { createTestSuite, type TestContext } from '../test';
import createReactiveValue from "../../src/core/Objects/Stores/ReactiveValue";
import { DataType, Filter, FilterConditionType, Group } from "../../src/core/Types/Table";

let valueStoreSuite = createTestSuite("Value Store");

const masterKey = "test";

function getSafeValues()
{
    return stores.valueStore.nameValuePairs.filter(v => !v.isWeak &&
        !stores.valueStore.duplicateNameValuePairs.value.includes(v.id) && !v.isOld);
}

valueStoreSuite.tests.push({
    name: "ValueStore Add Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = "ValueStore Add Works";
        value.notifyIfWeak = true;
        value.valueType = NameValuePairType.Information;
        value.value = "Value";
        value.additionalInformation = "AdditionalInformation";

        await stores.valueStore.addNameValuePair(masterKey, value);
        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];

        const decryptedValue = await cryptHelper.decrypt(masterKey, retrievedValue.value);

        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name is correct", retrievedValue.name, "ValueStore Add Works");
        ctx.assertEquals("NotifyIfWeak is correct", retrievedValue.notifyIfWeak, true);
        ctx.assertEquals("ValueType is correct", retrievedValue.valueType, NameValuePairType.Information);
        ctx.assertEquals("Value is correct", decryptedValue.value, "Value");
        ctx.assertEquals("Value length is correct", retrievedValue.valueLength, 5);
        ctx.assertEquals("Additional Information is correct", retrievedValue.additionalInformation, "AdditionalInformation");
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.name = "Mvosnviowengwegnwilgnl";
        weakPhraseValue.valueType = NameValuePairType.Passphrase;
        weakPhraseValue.value = "weakduplicate";

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPhraseValue.name = "MV;lmlvnqlbguilwhguilghwlig";
        weakPasscodeValue.valueType = NameValuePairType.Passcode;
        weakPasscodeValue.value = "weak";

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.name = "MLKZNlkdnfijlbguiweguilhgiwelgw";
        duplicateValue.value = "weakduplicate";

        await stores.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        const retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        await stores.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        const retrievedWeaCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeaCodeValue.length, 1);

        await stores.valueStore.addNameValuePair(masterKey, duplicateValue);

        const retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(v => v == duplicateValue.id);
        const retrievedDuplicateValueTwo = stores.valueStore.duplicateNameValuePairs.value.filter(v => v == weakPhraseValue.id);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name = "mamlsnlwniogwegilwgiowgg";
        safeValue.value = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name = "mnwiughqwuighq4uighilghnelgng";
        unsafeValue.value = "weak";

        await stores.valueStore.addNameValuePair(masterKey, safeValue);

        ctx.assertEquals("Safe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await stores.valueStore.addNameValuePair(masterKey, unsafeValue);

        ctx.assertEquals("Unsafe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = "amsldkvnwlbuweibgwukgbeauilglg";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name = "ValueStore Add With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);

        value.groups.push(group.id);

        await stores.valueStore.addNameValuePair(masterKey, value);

        const retrieveValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        const retrievedGroup = stores.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.filter(g => g == retrievedGroup.id).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.filter(v => v == retrieveValue.id).length, 1);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = "ValueStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name = "ValueStore Add With Filter Works";

        filter.conditions.push({
            id: "ValueStore Add With Filter Works",
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: "ValueStore Add With Filter Works"
        });

        await stores.filterStore.addFilter(masterKey, filter);
        await stores.valueStore.addNameValuePair(masterKey, value);

        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        const retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value has filter id", retrievedValue.filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 1);
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

        const newName = "ValueStoreUpdateWorks--New";
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
        value.name = "vms;alvnwklnweigwligewg";

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
    name: "ValueStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const notWeakValue = "s123hgsjhLS HDHFp[]p[L ihsgh lh hsh hwe SLHF shgskljhwkg eghuiSSHGL SDh";
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.name = "ms;lvknklvenilwbguilwgwlgwg";
        weakPhraseValue.valueType = NameValuePairType.Passphrase;
        weakPhraseValue.value = notWeakValue;

        await stores.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        let retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        weakPhraseValue.value = "weak";
        await stores.valueStore.updateNameValuePair(masterKey, weakPhraseValue, true);

        retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        weakPhraseValue.value = notWeakValue;
        await stores.valueStore.updateNameValuePair(masterKey, weakPhraseValue, true);

        retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exist after update", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.name = "qwuiegfuiwqvkabvljksdbvmbmansdjklgna";
        weakPasscodeValue.valueType = NameValuePairType.Passcode;
        weakPasscodeValue.value = notWeakValue;

        await stores.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        let retrievedWeakCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);

        weakPasscodeValue.value = "weak";
        await stores.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedWeakCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        weakPasscodeValue.value = notWeakValue;
        await stores.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedWeakCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists after update", retrievedWeakCodeValue.length, 0);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.name = "zxncvlashijhgweilghweroipghwro;igwrg";
        duplicateValue.value = "notDuplicate";

        await stores.valueStore.addNameValuePair(masterKey, duplicateValue);

        let retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id);
        ctx.assertEquals("Duplicate value doesn't exists", retrievedDuplicateValueOne.length, 0);

        duplicateValue.value = notWeakValue;
        await stores.valueStore.updateNameValuePair(masterKey, duplicateValue, true);

        retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id);
        let retrievedDuplicateValueTwo = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPhraseValue.id);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);

        duplicateValue.value = "notDuplicate";
        weakPasscodeValue.value = "alsoNotDuplicate";

        await stores.valueStore.updateNameValuePair(masterKey, duplicateValue, true);
        await stores.valueStore.updateNameValuePair(masterKey, weakPasscodeValue, true);

        retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id);
        retrievedDuplicateValueTwo = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPhraseValue.id);

        ctx.assertEquals("Duplicate value one doesn't exists", retrievedDuplicateValueOne.length, 0);
        ctx.assertEquals("Duplicate value two doesn't exists", retrievedDuplicateValueTwo.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name = "sm;lwanvwjekgbwuighwuighwigwh";
        safeValue.value = "weak";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name = "uhweoghisvklsdabvkwehlkebgleibg";
        unsafeValue.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        await stores.valueStore.addNameValuePair(masterKey, safeValue);

        safeValue.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";
        await stores.valueStore.updateNameValuePair(masterKey, safeValue, true);

        ctx.assertEquals("Safe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await stores.valueStore.addNameValuePair(masterKey, unsafeValue);

        unsafeValue.value = "weak";
        await stores.valueStore.updateNameValuePair(masterKey, unsafeValue, true);

        ctx.assertEquals("Unsafe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = "msal;vkwanvwebuiogwbguiwhgilenle";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name = "ValueStore Add With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);
        await stores.valueStore.addNameValuePair(masterKey, value);

        const valueWithGroup = JSON.parse(JSON.stringify(value));
        valueWithGroup.groups.push(group.id);

        await stores.valueStore.updateNameValuePair(masterKey, valueWithGroup, false);

        let retrieveValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedGroup = stores.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.filter(g => g == retrievedGroup.id).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.filter(v => v == retrieveValue.id).length, 1);

        const valueWithoutGroup: NameValuePair = JSON.parse(JSON.stringify(valueWithGroup));
        valueWithoutGroup.groups = [];

        await stores.valueStore.updateNameValuePair(masterKey, valueWithoutGroup, false);

        retrieveValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedGroup = stores.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertEquals("Value doens't have group id", retrieveValue.groups.filter(g => g == retrievedGroup.id).length, 0);
        ctx.assertEquals("Group doesn't have value id", retrievedGroup.values.filter(v => v == retrieveValue.id).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Update With Filter Works";
        const value: NameValuePair = defaultValue();
        value.name = name + "--noFilter";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name = "ValueStore Update With Filter Works";

        filter.conditions.push({
            id: "ValueStore Update With Filter Works",
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: "ValueStore Update With Filter Works"
        });

        await stores.filterStore.addFilter(masterKey, filter);
        await stores.valueStore.addNameValuePair(masterKey, value);

        let retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value doesn't has filter id", retrievedValue.filters.filter(f => f == retrievedFilter.id).length, 0);
        ctx.assertEquals("Filter doesn't has value id", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 0);

        value.name = name;
        await stores.valueStore.updateNameValuePair(masterKey, value, false);

        retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertEquals("Value has filter id", retrievedValue.filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 1);

        value.name = name + "--noFilter";
        await stores.valueStore.updateNameValuePair(masterKey, value, false);

        retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertEquals("Value doesn't has filter after update", retrievedValue.filters.filter(f => f == retrievedFilter.id).length, 0);
        ctx.assertEquals("Filter doesn't has value after update", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = "skmklwVIEBWUIAGBILGBLBKLBNERLKGBLER";

        await stores.valueStore.addNameValuePair(masterKey, value);

        const retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const reactiveValue = createReactiveValue(value);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        const deletedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id);
        ctx.assertEquals("Value does not exist", deletedValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.valueType = NameValuePairType.Passphrase;
        weakPhraseValue.value = "weak";
        weakPhraseValue.name = "mwo;jvwgbweuighwuighweiohgegewg";

        await stores.valueStore.addNameValuePair(masterKey, weakPhraseValue);

        let retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        const reactiveWeakPhraseValue = createReactiveValue(weakPhraseValue);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveWeakPhraseValue);

        retrievedWeakPhraseValue = stores.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.valueType = NameValuePairType.Passcode;
        weakPasscodeValue.value = "weak";
        weakPasscodeValue.name = "mvlkasnvkwjgighwuighwuighwlghwg";

        await stores.valueStore.addNameValuePair(masterKey, weakPasscodeValue);

        let retrievedWeakCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.value = "weak";
        duplicateValue.name = "zbxivhsuihweighweuigwgherilgherlg";

        await stores.valueStore.addNameValuePair(masterKey, duplicateValue);

        let retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id);
        let retrievedDuplicateValueTwo = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPasscodeValue.id);

        ctx.assertEquals("Duplicate value one exists", retrievedDuplicateValueOne.length, 1);
        ctx.assertEquals("Duplicate value two exists", retrievedDuplicateValueTwo.length, 1);

        const reactiveDuplicateValue = createReactiveValue(duplicateValue);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveDuplicateValue);

        retrievedDuplicateValueOne = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == duplicateValue.id);
        retrievedDuplicateValueTwo = stores.valueStore.duplicateNameValuePairs.value.filter(p => p == weakPasscodeValue.id);

        ctx.assertEquals("Duplicate value one doesn't exists", retrievedDuplicateValueOne.length, 0);

        const reactivepassCodeValue = createReactiveValue(weakPasscodeValue);
        await stores.valueStore.deleteNameValuePair(masterKey, reactivepassCodeValue);

        retrievedWeakCodeValue = stores.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.name = "hohsdl nuidlvuilvbio;beruilbelbheb";
        safeValue.valueType = NameValuePairType.Passcode;
        safeValue.value = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.name = "snvwvuibuidlhboa;nblabner";
        safeValue.valueType = NameValuePairType.Passcode;
        unsafeValue.value = "weak";

        await stores.valueStore.addNameValuePair(masterKey, safeValue);

        let retrievedSafeValue = stores.valueStore.nameValuePairs.filter(v => v.id == safeValue.id)[0];
        ctx.assertTruthy("Safe value exists", retrievedSafeValue);

        const reactiveSafeValue = createReactiveValue(safeValue);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveSafeValue);

        ctx.assertEquals("Safe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);

        await stores.valueStore.addNameValuePair(masterKey, unsafeValue);

        let retrievedUnsafeValue = stores.valueStore.nameValuePairs.filter(v => v.id == unsafeValue.id)[0];
        ctx.assertTruthy("Unsafe value exists", retrievedUnsafeValue);

        const reactiveUnsafeValue = createReactiveValue(unsafeValue);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveUnsafeValue);

        ctx.assertEquals("Unsafe value correct current",
            stores.valueStore.currentAndSafeValues.current[stores.valueStore.currentAndSafeValues.current.length - 1],
            stores.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            stores.valueStore.currentAndSafeValues.safe[stores.valueStore.currentAndSafeValues.safe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.name = " nvibweighweigweaioghwiugbwegihwgw";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.name = "ValueStore Add With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);
        value.groups.push(group.id);

        await stores.valueStore.addNameValuePair(masterKey, value);

        let retrieveValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedGroup = stores.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Value has group id", retrieveValue.groups.filter(g => g == retrievedGroup.id).length, 1);
        ctx.assertEquals("Group has value id", retrievedGroup.values.filter(v => v == retrieveValue.id).length, 1);

        const reactiveValue = createReactiveValue(value);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        retrievedGroup = stores.groupStore.valuesGroups.filter(g => g.id == group.id)[0];
        ctx.assertEquals("Group doesn't value id", retrievedGroup.values.filter(v => v == retrieveValue.id).length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Delete With Filter Works";
        const value: NameValuePair = defaultValue();
        value.name = name;

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.name = name;

        filter.conditions.push({
            id: name,
            property: "name",
            filterType: FilterConditionType.EqualTo,
            value: name
        });

        await stores.filterStore.addFilter(masterKey, filter);
        await stores.valueStore.addNameValuePair(masterKey, value);

        let retrievedValue = stores.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Value has filter id", retrievedValue.filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has value id", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 1);

        const reactiveValue = createReactiveValue(value);
        await stores.valueStore.deleteNameValuePair(masterKey, reactiveValue);

        retrievedFilter = stores.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];
        ctx.assertEquals("Filter doesn't has value", retrievedFilter.values.filter(p => p == retrievedValue.id).length, 0);
    }
});

export default valueStoreSuite;