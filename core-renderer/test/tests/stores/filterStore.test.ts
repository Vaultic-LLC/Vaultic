import { stores } from "../../src/core/Objects/Stores/index";
import { defaultFilter } from '../../src/core/Types/EncryptedData';
import { createTestSuite, type ITest, type TestContext } from '../test';
import { DataType, FilterConditionType, type Filter, type FilterCondition } from "../../src/core/Types/Table";

let filterStoreSuite = createTestSuite("Filter Store");

const masterKey = "test";

filterStoreSuite.tests.push({
    name: "FilterStore Add Works", func: async (ctx: TestContext) =>
    {
        async function testFilterAdd(type: DataType, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);

            await stores.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];

            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
        }

        await testFilterAdd(DataType.Passwords, () => stores.filterStore.passwordFilters);
        await testFilterAdd(DataType.NameValuePairs, () => stores.filterStore.nameValuePairFilters);
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

            await stores.filterStore.addFilter(masterKey, filter);

            const newName = "New Name";
            const newIsActive = true;

            filter.name = newName;
            filter.isActive = newIsActive;

            await stores.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.name == originalName);
            ctx.assertEquals(`Original Filter doesn't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedFilter.name, newName);
            ctx.assertEquals(`Active was updated for ${type}`, retrievedFilter.isActive, newIsActive);
        }

        await testFilterUpdate(DataType.Passwords, () => stores.filterStore.passwordFilters);
        await testFilterUpdate(DataType.NameValuePairs, () => stores.filterStore.nameValuePairFilters);
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

            await stores.filterStore.addFilter(masterKey, filter);

            const updatedValue = "Updated Value";

            filter.conditions[0].filterType = FilterConditionType.StartsWith;
            filter.conditions[0].property = newProperty;
            filter.conditions[0].value = updatedValue;

            await stores.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.conditions[0] ? f.conditions[0].value == originalFilterValue : false);
            ctx.assertEquals(`Original filter condition doens't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Filter condition type was updated for ${type}`, retrievedFilter.conditions[0].filterType, FilterConditionType.StartsWith);
            ctx.assertEquals(`Filter condition property was updated for ${type}`, retrievedFilter.conditions[0].property, newProperty);
            ctx.assertEquals(`Filter condition value was updated for ${type}`, retrievedFilter.conditions[0].value, updatedValue);
        }

        await testUpdateFilterCondition(DataType.Passwords, () => stores.filterStore.passwordFilters, "login", "email");
        await testUpdateFilterCondition(DataType.NameValuePairs, () => stores.filterStore.nameValuePairFilters, "name", "additionalInformation");
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

            await stores.filterStore.addFilter(masterKey, filter);

            filter.conditions.splice(0, 1);

            await stores.filterStore.updateFilter(masterKey, filter);

            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Filter condition was deleted for ${type}`, retrievedFilter.conditions.length, 0);
        }

        await testFilterConditionDelete(DataType.Passwords, () => stores.filterStore.passwordFilters, "login");
        await testFilterConditionDelete(DataType.NameValuePairs, () => stores.filterStore.nameValuePairFilters, "name");
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testFilterDelete(type: DataType, getFilters: () => Filter[])
        {
            const filter: Filter = defaultFilter(type);

            await stores.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.id == filter.id)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            await stores.filterStore.deleteFilter(masterKey, filter);
            const deletedFilter = getFilters().filter(f => f.id == filter.id);
            ctx.assertEquals(`Filter was deleted for ${type}`, deletedFilter.length, 0);
        }

        await testFilterDelete(DataType.Passwords, () => stores.filterStore.passwordFilters);
        await testFilterDelete(DataType.NameValuePairs, () => stores.filterStore.nameValuePairFilters);
    }
});

export default filterStoreSuite;