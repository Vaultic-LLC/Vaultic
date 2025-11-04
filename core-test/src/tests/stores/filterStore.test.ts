import { createTestSuite, TestSuites, type TestContext } from '@lib/test';
import userManager from '@lib/userManager';
import app from "@renderer/Objects/Stores/AppStore";
import { DataType, Filter, defaultFilter, FilterConditionType, IFilterable, defaultPassword, defaultValue, FilterCondition } from "@renderer/Types/DataTypes";
import { IIdentifiable } from '@vaultic/shared/Types/Fields';
import { DictionaryAsList, DoubleKeyedObject } from '@vaultic/shared/Types/Stores';

let filterStoreSuite = createTestSuite("Filter Store", TestSuites.FilterStore);

const masterKey = "test";

filterStoreSuite.tests.push({
    name: "FilterStore Add Works", func: async (ctx: TestContext) =>
    {
        const name = "FilterStore Add Works";
        async function testFilterAdd(type: DataType, property: string, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);
            filter.n = name;
            filter.c[name] =
            {
                id: name,
                p: property,
                t: FilterConditionType.EqualTo,
                v: name
            };

            await userManager.defaultUser.addFilter(name, ctx, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];

            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name for ${type}`, retrievedFilter.n, name);
            ctx.assertEquals(`Condition for ${type}`, retrievedFilter.c[name]?.v, name);
        }

        await testFilterAdd(DataType.Passwords, "l", () => app.currentVault.filterStore.passwordFilters);
        await testFilterAdd(DataType.NameValuePairs, "n", () => app.currentVault.filterStore.nameValuePairFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Add With Current Primary Objects Works", func: async (ctx: TestContext) =>
    {
        async function testFilterAdd<T extends IIdentifiable & IFilterable>(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getPrimaryObject: () => T)
        {
            const filter: Filter = defaultFilter(type);
            filter.c["Hi"] =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: "FilterStore Add With Current Primary Objects Works"
            };

            await userManager.defaultUser.addFilter(masterKey, ctx, filter);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.i[filter.id]);
        }

        const password = defaultPassword();
        password.l = "FilterStore Add With Current Primary Objects Works";
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = "FilterStore Add With Current Primary Objects Works";
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "n",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Add Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getEmptyFilters: () => DictionaryAsList,
            getDuplicateFilters: () => DoubleKeyedObject)
        {
            const emptyFilter = defaultFilter(type);
            await userManager.defaultUser.addFilter(masterKey, ctx, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for ${type}`, retrievedEmptyFilter);

            const hasEmptyFilter = getEmptyFilters()[emptyFilter.id];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, hasEmptyFilter);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.c["Hi"] =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: "FilterStore Add With Current Primary Objects Works"
            };

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.c["Hii"] =
            {
                id: "Hii",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: "FilterStore Add With Current Primary Objects Works"
            };

            await userManager.defaultUser.addFilter(masterKey, ctx, duplicateFilterOne);
            await userManager.defaultUser.addFilter(masterKey, ctx, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            const duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            const duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates[duplicateFilterTwo.id]);

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates[duplicateFilterOne.id]);
        }

        const password = defaultPassword();
        password.l = "FilterStore Add With Current Primary Objects Works";
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = "FilterStore Add With Current Primary Objects Works";
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "n", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update Works", func: async (ctx: TestContext) =>
    {
        async function testFilterUpdate(type: DataType, getFilters: () => Filter[])
        {
            const originalName = "FilterStoreUpdateWorks";
            const filter: Filter = defaultFilter(type);
            filter.n = originalName;
            filter.a = false;

            await userManager.defaultUser.addFilter("Add filter", ctx, filter);
            const editableFilter = userManager.defaultUser.getEditableFilter(filter.id, type);

            const newName = "New Name";
            const newIsActive = true;

            editableFilter.dataType.n = newName;
            editableFilter.dataType.a = newIsActive;

            await userManager.defaultUser.updateFilter("Update filter", ctx, editableFilter, [], []);

            const originalFilter = getFilters().filter(f => f.n == originalName);
            ctx.assertEquals(`Original Filter doesn't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedFilter.n, newName);
            ctx.assertEquals(`Active was updated for ${type}`, retrievedFilter.a, newIsActive);
        }

        await testFilterUpdate(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters);
        await testFilterUpdate(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update Condition Works", func: async (ctx: TestContext) =>
    {
        async function testUpdateFilterCondition(type: DataType, getFilters: () => Filter[], originalProperty: string, newProperty: string)
        {
            const originalFilterValue = "UpdateFilterConditionWorks"
            const filter: Filter = defaultFilter(type);
            let filterCondition: FilterCondition =
            {
                id: "Condition",
                t: FilterConditionType.EqualTo,
                p: originalProperty,
                v: originalFilterValue
            };

            filter.c["Condition"] = filterCondition;
            await userManager.defaultUser.addFilter("Add Filter", ctx, filter);

            const updatedValue = "Updated Value";

            const editableFilter = userManager.defaultUser.getEditableFilter(filter.id, type);
            editableFilter.dataType.c["Condition"]!.t = FilterConditionType.StartsWith;
            editableFilter.dataType.c["Condition"]!.p = newProperty;
            editableFilter.dataType.c["Condition"]!.v = updatedValue;

            await userManager.defaultUser.updateFilter("Update Filter", ctx, editableFilter, [], []);

            const originalFilter = getFilters().filter(f => f.c["Condition"] ? f.c["Condition"]!.v == originalFilterValue : false);
            ctx.assertEquals(`Original filter condition doens't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            const condition = retrievedFilter.c["Condition"];
            ctx.assertEquals(`Filter condition type was updated for ${type}`, condition?.t, FilterConditionType.StartsWith);
            ctx.assertEquals(`Filter condition property was updated for ${type}`, condition?.p, newProperty);
            ctx.assertEquals(`Filter condition value was updated for ${type}`, condition?.v, updatedValue);
        }

        await testUpdateFilterCondition(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters, "l", "e");
        await testUpdateFilterCondition(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters, "n", "a");
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update With Current Primary Objects Works", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Update With Current Primary Objects Works";

        async function testFilterAdd<T extends IIdentifiable & IFilterable>(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getPrimaryObject: () => T)
        {
            const filter: Filter = defaultFilter(type);
            filter.c["Hi"] =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: filterValue
            };

            await userManager.defaultUser.addFilter("Add Filter", ctx, filter);

            let retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.i[filter.id]);

            let editableFilter = userManager.defaultUser.getEditableFilter(filter.id, type);
            editableFilter.dataType.c["Hi"]!.v = filterValue + "--NoMatches";
            await userManager.defaultUser.updateFilter("Update Filter", ctx, editableFilter, [], []);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.i[filter.id]);

            editableFilter = userManager.defaultUser.getEditableFilter(filter.id, type);
            editableFilter.dataType.c["Hi"]!.v = filterValue;
            await userManager.defaultUser.updateFilter("Update Filter", ctx, editableFilter, [], []);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} has filter after update`, retrievedPrimaryObject.i[filter.id]);
        }

        const password = defaultPassword();
        password.l = filterValue;
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = filterValue;
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "n",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update Metrics Work", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Update Metrics Work";

        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getEmptyFilters: () => DictionaryAsList,
            getDuplicateFilters: () => DoubleKeyedObject)
        {
            const condition: FilterCondition =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: filterValue
            };

            const emptyFilter = defaultFilter(type);
            await userManager.defaultUser.addFilter("Add Filter", ctx, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let isInEmptyFilters = getEmptyFilters()[emptyFilter.id];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, isInEmptyFilters);

            let editableFilter = userManager.defaultUser.getEditableFilter(emptyFilter.id, type);
            editableFilter.dataType.c["Hi"] = condition;
            await userManager.defaultUser.updateFilter("Update condition condition", ctx, editableFilter, [], []);

            let doesNotExistInEmptyFilters = !getEmptyFilters()[emptyFilter.id];
            ctx.assertTruthy(`Empty Filter is not included in empty filters for ${type}`, doesNotExistInEmptyFilters);

            editableFilter = userManager.defaultUser.getEditableFilter(emptyFilter.id, type);
            await userManager.defaultUser.updateFilter("Delete condition on empty filter", ctx, editableFilter, [], ["Hi"]);

            isInEmptyFilters = getEmptyFilters()[emptyFilter.id];
            ctx.assertTruthy(`Empty Filter is included in empty filters after update for ${type}`, isInEmptyFilters);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.c["Hi"] = condition;

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.c["Hi"] = condition;

            await userManager.defaultUser.addFilter("Add Duplicate Filter One", ctx, duplicateFilterOne);
            await userManager.defaultUser.addFilter("Add Duplicate Filter Two", ctx, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.[duplicateFilterTwo.id]);

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.[duplicateFilterOne.id]);

            editableFilter = userManager.defaultUser.getEditableFilter(duplicateFilterOne.id, type);
            await userManager.defaultUser.updateFilter("Delete condition on duplicate filter one", ctx, editableFilter, [], ["Hi"]);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one doesn't has duplicate filter two as a duplicate for ${type}`,
                !duplicateFilterOneFromDuplicates?.[duplicateFilterTwo.id]);

            ctx.assertUndefined(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates);

            editableFilter = userManager.defaultUser.getEditableFilter(duplicateFilterOne.id, type);
            editableFilter.dataType.c["Hi"] = condition;
            await userManager.defaultUser.updateFilter("Update condition on duplicate filter one", ctx, editableFilter, [], []);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.[duplicateFilterTwo.id]);

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.[duplicateFilterOne.id]);
        }

        const password = defaultPassword();
        password.l = filterValue;
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = filterValue;
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "n", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testFilterDelete(type: DataType, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);

            await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            await userManager.defaultUser.deleteFilter("Delete Filter", ctx, filter);
            const deletedFilter = getFilters().filter(f => f.id == filter.id);
            ctx.assertEquals(`Filter was deleted for ${type}`, deletedFilter.length, 0);
        }

        await testFilterDelete(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters);
        await testFilterDelete(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Condition Works", func: async (ctx: TestContext) =>
    {
        async function testFilterConditionDelete(type: DataType, getFilters: () => Filter[], property: string)
        {
            const filter: Filter = defaultFilter(type);
            let filterCondition: FilterCondition =
            {
                id: "Condition",
                t: FilterConditionType.EqualTo,
                p: property,
                v: "Value"
            };

            filter.c["Condition"] = filterCondition;
            await userManager.defaultUser.addFilter("Add Filter", ctx, filter);

            const editableFilter = userManager.defaultUser.getEditableFilter(filter.id, type);
            await userManager.defaultUser.updateFilter("Delete Filter Condition", ctx, editableFilter, [], ["Condition"]);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertUndefined(`Filter condition was deleted for ${type}`, retrievedFilter.c["Condition"]);
        }

        await testFilterConditionDelete(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters, "l");
        await testFilterConditionDelete(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters, "n");
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete With Current Primary Objects Works", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Delete With Current Primary Objects Works";

        async function testFilterAdd<T extends IIdentifiable & IFilterable>(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getPrimaryObject: () => T)
        {
            const filter: Filter = defaultFilter(type);
            filter.c["Hi"] =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: filterValue
            };

            await userManager.defaultUser.addFilter("Add Filter", ctx, filter);

            let retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.i[filter.id]);

            await userManager.defaultUser.deleteFilter("Delete Filter", ctx, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.i[filter.id]);
        }

        const password = defaultPassword();
        password.l = filterValue;
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = filterValue;
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "n",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Metrics Work", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Delete Metrics Work";
        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Filter[],
            getEmptyFilters: () => DictionaryAsList,
            getDuplicateFilters: () => DoubleKeyedObject)
        {
            const condition: FilterCondition =
            {
                id: "Hi",
                p: conditionProperty,
                t: FilterConditionType.EqualTo,
                v: filterValue
            };

            const emptyFilter = defaultFilter(type);
            await userManager.defaultUser.addFilter("Add Empty Filter", ctx, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let hasEmptyFilter = getEmptyFilters()[emptyFilter.id];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, hasEmptyFilter);

            await userManager.defaultUser.deleteFilter("Delete Empty Filter", ctx, emptyFilter);

            ctx.assertUndefined(`Empty Filter is not included in empty filters for ${type}`, getEmptyFilters()[emptyFilter.id]);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.c["Hi"] = condition;

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.c["Hi"] = condition;

            await userManager.defaultUser.addFilter("Add Duplicate Filter One", ctx, duplicateFilterOne);
            await userManager.defaultUser.addFilter("Add Duplicate Filter Two", ctx, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.[duplicateFilterTwo.id]);

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.[duplicateFilterOne.id]);

            await userManager.defaultUser.deleteFilter("Delete Duplicate Filter One", ctx, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertUndefined(`Duplicate filter one doesn't exist in duplicates for ${type}`, duplicateFilterOneFromDuplicates);
            ctx.assertUndefined(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates);
        }

        const password = defaultPassword();
        password.l = filterValue;
        await userManager.defaultUser.addPassword(masterKey, ctx, password);

        const value = defaultValue();
        value.n = filterValue;
        await userManager.defaultUser.addNameValuePair(masterKey, ctx, value);

        await testFilterAdd(DataType.Passwords, "l", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "n", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

export default filterStoreSuite;