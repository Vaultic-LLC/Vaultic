import { IFilterable, IIdentifiable, defaultFilter, defaultPassword, defaultValue } from '../../src/core/Types/EncryptedData';
import { createTestSuite, type TestContext } from '../test';
import { DataType, FilterConditionType, type Filter, type FilterCondition } from "../../src/core/Types/Table";
import app from "../../src/core/Objects/Stores/AppStore";
import { Dictionary } from '@vaultic/shared/Types/DataStructures';

let filterStoreSuite = createTestSuite("Filter Store");

const masterKey = "test";

filterStoreSuite.tests.push({
    name: "FilterStore Add Works", func: async (ctx: TestContext) =>
    {
        const name = "FilterStore Add Works";
        async function testFilterAdd(type: DataType, property: string, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);
            filter.name = name;
            filter.conditions.push({
                id: name,
                property: property,
                filterType: FilterConditionType.EqualTo,
                value: name
            });

            await app.currentVault.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];

            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name for ${type}`, retrievedFilter.name, name);
            ctx.assertEquals(`Condition for ${type}`, retrievedFilter.conditions[0].value, name);
        }

        await testFilterAdd(DataType.Passwords, "login", () => app.currentVault.filterStore.passwordFilters);
        await testFilterAdd(DataType.NameValuePairs, "name", () => app.currentVault.filterStore.nameValuePairFilters);
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
            filter.conditions.push({
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: "FilterStore Add With Current Primary Objects Works"
            });

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.filters.includes(filter.id));
        }

        const password = defaultPassword();
        password.login = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
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
            getEmptyFilters: () => string[],
            getDuplicateFilters: () => Dictionary<string[]>)
        {
            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for ${type}`, retrievedEmptyFilter);

            const retrievedEmptyFilterFromEmptyFilters = getEmptyFilters().filter(f => f == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, retrievedEmptyFilterFromEmptyFilters);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.push({
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: "FilterStore Add With Current Primary Objects Works"
            });

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.push({
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: "FilterStore Add With Current Primary Objects Works"
            });

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            const duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            const duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`, duplicateFilterOneFromDuplicates.includes(duplicateFilterTwo.id));
            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`, duplicateFilterTwoFromDuplicates.includes(duplicateFilterOne.id));
        }

        const password = defaultPassword();
        password.login = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "name", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
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
            filter.name = originalName;
            filter.isActive = false;

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const newName = "New Name";
            const newIsActive = true;

            filter.name = newName;
            filter.isActive = newIsActive;

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.name == originalName);
            ctx.assertEquals(`Original Filter doesn't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedFilter.name, newName);
            ctx.assertEquals(`Active was updated for ${type}`, retrievedFilter.isActive, newIsActive);
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
                filterType: FilterConditionType.EqualTo,
                property: originalProperty,
                value: originalFilterValue
            };

            filter.conditions.push(filterCondition);

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const updatedValue = "Updated Value";

            filter.conditions[0].filterType = FilterConditionType.StartsWith;
            filter.conditions[0].property = newProperty;
            filter.conditions[0].value = updatedValue;

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.conditions[0] ? f.conditions[0].value == originalFilterValue : false);
            ctx.assertEquals(`Original filter condition doens't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Filter condition type was updated for ${type}`, retrievedFilter.conditions[0].filterType, FilterConditionType.StartsWith);
            ctx.assertEquals(`Filter condition property was updated for ${type}`, retrievedFilter.conditions[0].property, newProperty);
            ctx.assertEquals(`Filter condition value was updated for ${type}`, retrievedFilter.conditions[0].value, updatedValue);
        }

        await testUpdateFilterCondition(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters, "login", "email");
        await testUpdateFilterCondition(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters, "name", "additionalInformation");
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
            filter.conditions.push({
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: filterValue
            });

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            let retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.filters.includes(filter.id));

            filter.conditions[0].value = filterValue + "--NoMatches";
            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.filters.includes(filter.id));

            filter.conditions[0].value = filterValue;
            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} has filter after update`, retrievedPrimaryObject.filters.includes(filter.id));
        }

        const password = defaultPassword();
        password.login = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
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
            getEmptyFilters: () => string[],
            getDuplicateFilters: () => Dictionary<string[]>)
        {
            const condition = {
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: filterValue
            };

            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let retrievedEmptyFilterFromEmptyFilters = getEmptyFilters().filter(f => f == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, retrievedEmptyFilterFromEmptyFilters);

            emptyFilter.conditions.push(condition);
            await app.currentVault.filterStore.updateFilter(masterKey, emptyFilter);

            let nonExistsEmptyFilter = getEmptyFilters().filter(f => f == emptyFilter.id);
            ctx.assertEquals(`Empty Filter is not included in empty filters for ${type}`, nonExistsEmptyFilter.length, 0);

            emptyFilter.conditions = [];
            await app.currentVault.filterStore.updateFilter(masterKey, emptyFilter);

            retrievedEmptyFilterFromEmptyFilters = getEmptyFilters().filter(f => f == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter is included in empty filters after update for ${type}`, retrievedEmptyFilterFromEmptyFilters);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.push(condition);

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.push(condition);

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`, duplicateFilterOneFromDuplicates.includes(duplicateFilterTwo.id));
            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`, duplicateFilterTwoFromDuplicates.includes(duplicateFilterOne.id));

            duplicateFilterOne.conditions = [];
            await app.currentVault.filterStore.updateFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one doesn't has duplicate filter two as a duplicate for ${type}`, !duplicateFilterOneFromDuplicates.includes(duplicateFilterTwo.id));
            ctx.assertEquals(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates, undefined);

            duplicateFilterOne.conditions.push(condition);
            await app.currentVault.filterStore.updateFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`, duplicateFilterOneFromDuplicates.includes(duplicateFilterTwo.id));
            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`, duplicateFilterTwoFromDuplicates.includes(duplicateFilterOne.id));
        }

        const password = defaultPassword();
        password.login = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "name", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testFilterDelete(type: DataType, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);

            await app.currentVault.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            await app.currentVault.filterStore.deleteFilter(masterKey, filter);
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
                filterType: FilterConditionType.EqualTo,
                property: property,
                value: "Value"
            };

            filter.conditions.push(filterCondition);

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            filter.conditions.splice(0, 1);

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Filter condition was deleted for ${type}`, retrievedFilter.conditions.length, 0);
        }

        await testFilterConditionDelete(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters, "login");
        await testFilterConditionDelete(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters, "name");
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
            filter.conditions.push({
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: filterValue
            });

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            let retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.filters.includes(filter.id));

            await app.currentVault.filterStore.deleteFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.filters.includes(filter.id));
        }

        const password = defaultPassword();
        password.login = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
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
            getEmptyFilters: () => string[],
            getDuplicateFilters: () => Dictionary<string[]>)
        {
            const condition = {
                id: "Hi",
                property: conditionProperty,
                filterType: FilterConditionType.EqualTo,
                value: filterValue
            };

            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.id == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let retrievedEmptyFilterFromEmptyFilters = getEmptyFilters().filter(f => f == emptyFilter.id)[0];
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, retrievedEmptyFilterFromEmptyFilters);

            await app.currentVault.filterStore.deleteFilter(masterKey, emptyFilter);

            let nonExistsEmptyFilter = getEmptyFilters().filter(f => f == emptyFilter.id);
            ctx.assertEquals(`Empty Filter is not included in empty filters for ${type}`, nonExistsEmptyFilter.length, 0);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.push(condition);

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.push(condition);

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.id == duplicateFilterOne.id)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.id == duplicateFilterTwo.id)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`, duplicateFilterOneFromDuplicates.includes(duplicateFilterTwo.id));
            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`, duplicateFilterTwoFromDuplicates.includes(duplicateFilterOne.id));

            await app.currentVault.filterStore.deleteFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters()[duplicateFilterOne.id];
            duplicateFilterTwoFromDuplicates = getDuplicateFilters()[duplicateFilterTwo.id];

            ctx.assertEquals(`Duplicate filter one doesn't exist in duplicates for ${type}`, duplicateFilterOneFromDuplicates, undefined);
            ctx.assertEquals(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates, undefined);
        }

        const password = defaultPassword();
        password.login = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "name", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

export default filterStoreSuite;