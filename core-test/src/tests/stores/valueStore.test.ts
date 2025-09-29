import cryptHelper from '@renderer/Helpers/cryptHelper';
import { createTestSuite, TestSuites, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import { NameValuePair, defaultValue, NameValuePairType, Group, defaultGroup, DataType, Filter, defaultFilter, FilterConditionType } from "@renderer/Types/DataTypes";
import userManager from '@lib/userManager';

let valueStoreSuite = createTestSuite("Value Store", TestSuites.ValueStore);

function getSafeValues()
{
    return app.currentVault.valueStore.nameValuePairs.filter(v => !v.w &&
        !app.currentVault.valueStore.duplicateNameValuePairs[v.id] && !v.isOld());
}

valueStoreSuite.tests.push({
    name: "ValueStore Add Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.n = "ValueStore Add Works";
        value.o = true;
        value.y = NameValuePairType.Information;
        value.v = "Value";
        value.a = "AdditionalInformation";

        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);
        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];

        const decryptedValue = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedValue.v);

        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name is correct", retrievedValue.n, "ValueStore Add Works");
        ctx.assertEquals("NotifyIfWeak is correct", retrievedValue.o, true);
        ctx.assertEquals("ValueType is correct", retrievedValue.y, NameValuePairType.Information);
        ctx.assertEquals("Value is correct", decryptedValue.value, "Value");
        ctx.assertEquals("Additional Information is correct", retrievedValue.a, "AdditionalInformation");
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.n = "Mvosnviowengwegnwilgnl";
        weakPhraseValue.y = NameValuePairType.Passphrase;
        weakPhraseValue.v = "weakduplicate";

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPhraseValue.n = "MV;lmlvnqlbguilwhguilghwlig";
        weakPasscodeValue.y = NameValuePairType.Passcode;
        weakPasscodeValue.v = "weak";

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.n = "MLKZNlkdnfijlbguiweguilhgiwelgw";
        duplicateValue.v = "weakduplicate";

        await userManager.defaultUser.addNameValuePair("Add Weak Phrase Value", ctx, weakPhraseValue);

        const retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        await userManager.defaultUser.addNameValuePair("Add Weak Passcode Value", ctx, weakPasscodeValue);

        const retrievedWeaCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeaCodeValue.length, 1);

        await userManager.defaultUser.addNameValuePair("Add Duplicate Value", ctx, duplicateValue);

        ctx.assertTruthy("Duplicate value one exists", app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id]);
        ctx.assertTruthy("Duplicate value two exists", app.currentVault.valueStore.duplicateNameValuePairs[weakPhraseValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.n = "mamlsnlwniogwegilwgiowgg";
        safeValue.v = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.n = "mnwiughqwuighq4uighilghnelgng";
        unsafeValue.v = "weak";

        await userManager.defaultUser.addNameValuePair("Add Safe Value", ctx, safeValue);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);

        await userManager.defaultUser.addNameValuePair("Add Unsafe Value", ctx, unsafeValue);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.n = "amsldkvnwlbuweibgwukgbeauilglg";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.n = "ValueStore Add With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);

        value.g[group.id] = true;

        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        const retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        const retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Value has group id", retrieveValue.g[retrievedGroup.id]);
        ctx.assertTruthy("Group has value id", retrievedGroup.v[retrieveValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.n = "ValueStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.n = "ValueStore Add With Filter Works";

        filter.c["n"] = 
        {
            id: "n",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "ValueStore Add With Filter Works"
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        const retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Value has filter id", retrievedValue.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has value id", retrievedFilter.v[retrievedValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Works", func: async (ctx: TestContext) =>
    {
        const originalName = "ValueStoreUpdateWorks";
        const value: NameValuePair = defaultValue();
        value.n = originalName;
        value.o = true;

        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        const newName = "ValueStoreUpdateWorks--New";
        const newValueType = NameValuePairType.Safe;
        const newNotifyIfWeak = false;
        const newAdditionalInfo = "NewAdditionalInfo";

        const editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);

        editableValue.dataType.n = newName;
        editableValue.dataType.y = newValueType;
        editableValue.dataType.o = newNotifyIfWeak;
        editableValue.dataType.a = newAdditionalInfo;

        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, false, editableValue.dataType.g);

        const originalValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.n == originalName);
        ctx.assertEquals("Original value doesn't exist", originalValue.length, 0);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);
        ctx.assertEquals("Name was updated", retrievedValue.n, newName);
        ctx.assertEquals("Type was updated", retrievedValue.y, newValueType);
        ctx.assertEquals("NotifyIfWeak was updated", retrievedValue.o, newNotifyIfWeak);
        ctx.assertEquals("AdditionalInformation was updated", retrievedValue.a, newAdditionalInfo);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update Value Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.v = "Value";
        value.n = "vms;alvnwklnweigwligewg";

        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        const editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);

        const newValue = "New Value";
        editableValue.dataType.v = newValue;
        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, true, editableValue.dataType.g);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const decryptedValue = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedValue.v);
        ctx.assertEquals("Value was updated", decryptedValue.value, newValue);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const notWeakValue = "s123hgsjhLS HDHFp[]p[L ihsgh lh hsh hwe SLHF shgskljhwkg eghuiSSHGL SDh";
        const notWeakPasscode = "f;jvioweoigjsSDfsiojio 26234}|[;][;joiS fiosjfios j SIOjsojsO Ojslj OL fj Ljsdl sdjiwewogI josj ojosi j fsfs fs fsweg ef";
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.n = "ms;lvknklvenilwbguilwgwlgwg";
        weakPhraseValue.y = NameValuePairType.Passphrase;
        weakPhraseValue.v = notWeakValue;

        await userManager.defaultUser.addNameValuePair("Add Weak Phrase Value", ctx, weakPhraseValue);

        let retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        let editableWeakPhraseValue = userManager.defaultUser.getEditableNameValuePair(weakPhraseValue.id);

        editableWeakPhraseValue.dataType.v = "weak";
        await userManager.defaultUser.updateNameValuePair("Update Weak Phrase Value", ctx, editableWeakPhraseValue, true, editableWeakPhraseValue.dataType.g);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        editableWeakPhraseValue = userManager.defaultUser.getEditableNameValuePair(weakPhraseValue.id);

        editableWeakPhraseValue.dataType.v = notWeakValue;
        await userManager.defaultUser.updateNameValuePair("Update Weak Phrase Value", ctx, editableWeakPhraseValue, true, editableWeakPhraseValue.dataType.g);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exist after update", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.n = "qwuiegfuiwqvkabvljksdbvmbmansdjklgna";
        weakPasscodeValue.y = NameValuePairType.Passcode;
        weakPasscodeValue.v = notWeakPasscode;

        await userManager.defaultUser.addNameValuePair("Add Weak Passcode Value", ctx, weakPasscodeValue);

        let retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);

        let editableWeakPasscodeValue = userManager.defaultUser.getEditableNameValuePair(weakPasscodeValue.id);

        editableWeakPasscodeValue.dataType.v = "weak";
        await userManager.defaultUser.updateNameValuePair("Update Weak Passcode Value", ctx, editableWeakPasscodeValue, true, editableWeakPasscodeValue.dataType.g);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        editableWeakPasscodeValue = userManager.defaultUser.getEditableNameValuePair(weakPasscodeValue.id);

        editableWeakPasscodeValue.dataType.v = notWeakPasscode;
        await userManager.defaultUser.updateNameValuePair("Update Weak Passcode Value", ctx, editableWeakPasscodeValue, true, editableWeakPasscodeValue.dataType.g);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists after update", retrievedWeakCodeValue.length, 0);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.n = "zxncvlashijhgweilghweroipghwro;igwrg";
        duplicateValue.v = "notDuplicate";

        await userManager.defaultUser.addNameValuePair("Add Duplicate Value", ctx, duplicateValue);

        let retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id];
        ctx.assertUndefined("Duplicate value doesn't exists", retrievedDuplicateValueOne);

        let editableDuplicateValue = userManager.defaultUser.getEditableNameValuePair(duplicateValue.id);

        editableDuplicateValue.dataType.v = notWeakValue;
        await userManager.defaultUser.updateNameValuePair("Update Duplicate Value", ctx, editableDuplicateValue, true, editableDuplicateValue.dataType.g);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id];
        let retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs[weakPhraseValue.id];

        ctx.assertTruthy("Duplicate value one exists", retrievedDuplicateValueOne[weakPhraseValue.id]);
        ctx.assertTruthy("Duplicate value two exists", retrievedDuplicateValueTwo[duplicateValue.id]);

        editableDuplicateValue = userManager.defaultUser.getEditableNameValuePair(duplicateValue.id);
        editableDuplicateValue.dataType.v = "notDuplicate";
        await userManager.defaultUser.updateNameValuePair("Update Duplicate Value", ctx, editableDuplicateValue, true, editableDuplicateValue.dataType.g);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id];
        retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs[weakPhraseValue.id];

        ctx.assertUndefined("Duplicate value one doesn't exists", retrievedDuplicateValueOne);
        ctx.assertUndefined("Duplicate value two doesn't exists", retrievedDuplicateValueTwo);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.n = "sm;lwanvwjekgbwuighwuighwigwh";
        safeValue.v = "weak";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.n = "uhweoghisvklsdabvkwehlkebgleibg";
        unsafeValue.v = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        await userManager.defaultUser.addNameValuePair("Add Safe Value", ctx, safeValue);

        let editableSafeValue = userManager.defaultUser.getEditableNameValuePair(safeValue.id);
        editableSafeValue.dataType.v = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";
        await userManager.defaultUser.updateNameValuePair("Update Safe Value", ctx, editableSafeValue, true, editableSafeValue.dataType.g);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);

        await userManager.defaultUser.addNameValuePair("Add Unsafe Value", ctx, unsafeValue);

        let editableUnsafeValue = userManager.defaultUser.getEditableNameValuePair(unsafeValue.id);
        editableUnsafeValue.dataType.v = "weak";
        await userManager.defaultUser.updateNameValuePair("Update Unsafe Value", ctx, editableUnsafeValue, true, editableUnsafeValue.dataType.g);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.n = "msal;vkwanvwebuiogwbguiwhgilenle";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.n = "ValueStore Add With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);
        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        let editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        editableValue.dataType.g[group.id] = true;
        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, false, editableValue.dataType.g);

        let retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Value has group id", retrieveValue.g[retrievedGroup.id]);
        ctx.assertTruthy("Group has value id", retrievedGroup.v[retrieveValue.id]);

        editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, false, {});

        retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertUndefined("Value doens't have group id", retrieveValue.g[retrievedGroup.id]);
        ctx.assertUndefined("Group doesn't have value id", retrievedGroup.v[retrieveValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Update With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Update With Filter Works";
        const value: NameValuePair = defaultValue();
        value.n = name + "--noFilter";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.n = "ValueStore Update With Filter Works";

        filter.c["ValueStore Update With Filter Works"] = 
        {
            id: "ValueStore Update With Filter Works",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "ValueStore Update With Filter Works"
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        let retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertUndefined("Value doesn't has filter id", retrievedValue.i[retrievedFilter.id]);
        ctx.assertUndefined("Filter doesn't has value id", retrievedFilter.v[retrievedValue.id]);

        let editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        editableValue.dataType.n = name;
        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, false, {});

        retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value has filter id", retrievedValue.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has value id", retrievedFilter.v[retrievedValue.id]);

        editableValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        editableValue.dataType.n = name + "--noFilter";
        await userManager.defaultUser.updateNameValuePair("Update Value", ctx, editableValue, false, {});

        retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertUndefined("Value doesn't has filter after update", retrievedValue.i[retrievedFilter.id]);
        ctx.assertUndefined("Filter doesn't has value after update", retrievedFilter.v[retrievedValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.v = "weak";
        value.n = "skmklwVIEBWUIAGBILGBLBKLBNERLKGBLER";

        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        const retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        ctx.assertTruthy("Value Exists", retrievedValue);

        const reactiveValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Value", ctx, reactiveValue.dataType);

        const deletedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id);
        ctx.assertEquals("Value does not exist", deletedValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPhraseValue: NameValuePair = defaultValue();
        weakPhraseValue.y = NameValuePairType.Passphrase;
        weakPhraseValue.v = "weak";
        weakPhraseValue.n = "mwo;jvwgbweuighwuighweiohgegewg";

        await userManager.defaultUser.addNameValuePair("Add Weak Phrase Value", ctx, weakPhraseValue);

        let retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value exists", retrievedWeakPhraseValue.length, 1);

        const reactiveWeakPhraseValue = userManager.defaultUser.getEditableNameValuePair(weakPhraseValue.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Weak Phrase Value", ctx, reactiveWeakPhraseValue.dataType);

        retrievedWeakPhraseValue = app.currentVault.valueStore.weakPassphraseValues.value.filter(v => v == weakPhraseValue.id);
        ctx.assertEquals("Weak pass phrase value doesn't exists", retrievedWeakPhraseValue.length, 0);

        const weakPasscodeValue: NameValuePair = defaultValue();
        weakPasscodeValue.y = NameValuePairType.Passcode;
        weakPasscodeValue.v = "weak";
        weakPasscodeValue.n = "mvlkasnvkwjgighwuighwuighwlghwg";

        await userManager.defaultUser.addNameValuePair("Add Weak Passcode Value", ctx, weakPasscodeValue);

        let retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value exists", retrievedWeakCodeValue.length, 1);

        const duplicateValue: NameValuePair = defaultValue();
        duplicateValue.v = "weak";
        duplicateValue.n = "zbxivhsuihweighweuigwgherilgherlg";

        await userManager.defaultUser.addNameValuePair("Add Duplicate Value", ctx, duplicateValue);

        let retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id];
        let retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs[weakPasscodeValue.id];

        ctx.assertTruthy("Duplicate value one exists", retrievedDuplicateValueOne[weakPasscodeValue.id]);
        ctx.assertTruthy("Duplicate value two exists", retrievedDuplicateValueTwo[duplicateValue.id]);

        const reactiveDuplicateValue = userManager.defaultUser.getEditableNameValuePair(duplicateValue.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Duplicate Value", ctx, reactiveDuplicateValue.dataType);

        retrievedDuplicateValueOne = app.currentVault.valueStore.duplicateNameValuePairs[duplicateValue.id];
        retrievedDuplicateValueTwo = app.currentVault.valueStore.duplicateNameValuePairs[weakPasscodeValue.id];

        // deleted so it shouldn't exist at all
        ctx.assertUndefined("Duplicate value one doesn't exists", retrievedDuplicateValueOne);

        // still has other duplicates so just make sure the deleted value isn't in there
        ctx.assertTruthy("Duplicate value two doesn't have previous duplicate value one",
            !retrievedDuplicateValueTwo[duplicateValue.id]);

        const reactivepassCodeValue = userManager.defaultUser.getEditableNameValuePair(weakPasscodeValue.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Weak Passcode Value", ctx, reactivepassCodeValue.dataType);

        retrievedWeakCodeValue = app.currentVault.valueStore.weakPasscodeValues.value.filter(v => v == weakPasscodeValue.id);
        ctx.assertEquals("Weak pass code value doesn't exists", retrievedWeakCodeValue.length, 0);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safeValue: NameValuePair = defaultValue();
        safeValue.n = "hohsdl nuidlvuilvbio;beruilbelbheb";
        safeValue.y = NameValuePairType.Passcode;
        safeValue.v = "aviowanlviwah uilwngui2ht thiohblago][lpy['kymiopyhp9h";

        const unsafeValue: NameValuePair = defaultValue();
        unsafeValue.n = "snvwvuibuidlhboa;nblabner";
        unsafeValue.y = NameValuePairType.Passcode;
        unsafeValue.v = "weak";

        await userManager.defaultUser.addNameValuePair("Add Safe Value", ctx, safeValue);

        let retrievedSafeValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == safeValue.id)[0];
        ctx.assertTruthy("Safe value exists", retrievedSafeValue);

        const reactiveSafeValue = userManager.defaultUser.getEditableNameValuePair(safeValue.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Safe Value", ctx, reactiveSafeValue.dataType);

        ctx.assertEquals("Safe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Safe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);

        await userManager.defaultUser.addNameValuePair("Add Unsafe Value", ctx, unsafeValue);

        let retrievedUnsafeValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == unsafeValue.id)[0];
        ctx.assertTruthy("Unsafe value exists", retrievedUnsafeValue);

        const reactiveUnsafeValue = userManager.defaultUser.getEditableNameValuePair(unsafeValue.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Unsafe Value", ctx, reactiveUnsafeValue.dataType);

        ctx.assertEquals("Unsafe value correct current",
            app.currentVault.valueStore.currentAndSafeValuesCurrent[app.currentVault.valueStore.currentAndSafeValuesCurrent.length - 1],
            app.currentVault.valueStore.nameValuePairs.length);

        ctx.assertEquals("Unsafe value correct safe",
            app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1],
            getSafeValues().length);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Group Works", func: async (ctx: TestContext) =>
    {
        const value: NameValuePair = defaultValue();
        value.v = "weak";
        value.n = " nvibweighweigweaioghwiugbwegihwgw";

        const group: Group = defaultGroup(DataType.NameValuePairs);
        group.n = "ValueStore Delete With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);

        value.g[group.id] = true;
        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        let retrieveValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Value exists", retrieveValue);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Value has group id", retrieveValue.g[retrievedGroup.id]);
        ctx.assertTruthy("Group has value id", retrievedGroup.v[retrieveValue.id]);

        const reactiveValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Value", ctx, reactiveValue.dataType);

        retrievedGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.id == group.id)[0];
        ctx.assertTruthy("Group doesn't value id", !retrievedGroup.v[retrieveValue.id]);
    }
});

valueStoreSuite.tests.push({
    name: "ValueStore Delete With Filter Works", func: async (ctx: TestContext) =>
    {
        const name = "ValueStore Delete With Filter Works";
        const value: NameValuePair = defaultValue();
        value.n = name;
        value.v = "weak";

        const filter: Filter = defaultFilter(DataType.NameValuePairs);
        filter.n = name;

        filter.c[name] = 
        {
            id: name,
            p: "n",
            t: FilterConditionType.EqualTo,
            v: name
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
        await userManager.defaultUser.addNameValuePair("Add Value", ctx, value);

        let retrievedValue = app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0];
        let retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Value exists", retrievedValue);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Value has filter id", retrievedValue.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has value id", retrievedFilter.v[retrievedValue.id]);

        const reactiveValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Value", ctx, reactiveValue.dataType);

        retrievedFilter = app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id == filter.id)[0];
        ctx.assertTruthy("Filter doesn't has value", !retrievedFilter.v[retrievedValue.id]);
    }
});

export default valueStoreSuite;