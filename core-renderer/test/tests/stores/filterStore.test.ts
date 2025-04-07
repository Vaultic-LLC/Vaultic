import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { DataType, Filter, defaultFilter, FilterConditionType, IFilterable, defaultPassword, defaultValue, FilterCondition, DuplicateDataTypes } from '../../src/core/Types/DataTypes';
import { Field, IIdentifiable, KnownMappedFields } from '@vaultic/shared/Types/Fields';

let filterStoreSuite = createTestSuite("Filter Store");

const masterKey = "test";

filterStoreSuite.tests.push({
    name: "FilterStore Add Works", func: async (ctx: TestContext) =>
    {
        const name = "FilterStore Add Works";
        async function testFilterAdd(type: DataType, property: string, getFilters: () => Field<Filter>[])
        {
            const filter: Filter = defaultFilter(type);
            filter.name.value = name;
            filter.conditions.value.set(name, Field.create({
                id: Field.create(name),
                property: Field.create(property),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create(name)
            }));

            await app.currentVault.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];

            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name for ${type}`, retrievedFilter.value.name.value, name);
            ctx.assertEquals(`Condition for ${type}`, retrievedFilter.value.conditions.value.get(name)?.value.value.value, name);
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
            getFilters: () => Field<Filter>[],
            getPrimaryObject: () => Field<T>)
        {
            const filter: Filter = defaultFilter(type);
            filter.conditions.value.set("Hi", Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create("FilterStore Add With Current Primary Objects Works")
            }));

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.value.filters.value.has(filter.id.value));
        }

        const password = defaultPassword();
        password.login.value = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Add Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Field<Filter>[],
            getEmptyFilters: () => Field<Map<string, Field<string>>>,
            getDuplicateFilters: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.value.id.value == emptyFilter.id.value)[0];
            ctx.assertTruthy(`Empty Filter Exists for ${type}`, retrievedEmptyFilter);

            const hasEmptyFilter = getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, hasEmptyFilter);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.value.set("Hi", Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create("FilterStore Add With Current Primary Objects Works")
            }));

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.value.set("Hii", Field.create({
                id: Field.create("Hii"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create("FilterStore Add With Current Primary Objects Works")
            }));

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.value.id.value == duplicateFilterOne.id.value)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.value.id.value == duplicateFilterTwo.id.value)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            const duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            const duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterTwo.id.value));

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterOne.id.value));
        }

        const password = defaultPassword();
        password.login.value = "FilterStore Add With Current Primary Objects Works";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "FilterStore Add With Current Primary Objects Works";
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
        async function testFilterUpdate(type: DataType, getFilters: () => Field<Filter>[])
        {
            const originalName = "FilterStoreUpdateWorks";
            const filter: Filter = defaultFilter(type);
            filter.name.value = originalName;
            filter.isActive.value = false;

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const newName = "New Name";
            const newIsActive = true;

            filter.name.value = newName;
            filter.isActive.value = newIsActive;

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.value.name.value == originalName);
            ctx.assertEquals(`Original Filter doesn't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedFilter.value.name.value, newName);
            ctx.assertEquals(`Active was updated for ${type}`, retrievedFilter.value.isActive.value, newIsActive);
        }

        await testFilterUpdate(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters);
        await testFilterUpdate(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update Condition Works", func: async (ctx: TestContext) =>
    {
        async function testUpdateFilterCondition(type: DataType, getFilters: () => Field<Filter>[], originalProperty: string, newProperty: string)
        {
            const originalFilterValue = "UpdateFilterConditionWorks"
            const filter: Filter = defaultFilter(type);
            let filterCondition: FilterCondition =
            {
                id: Field.create("Condition"),
                filterType: Field.create(FilterConditionType.EqualTo),
                property: Field.create(originalProperty),
                value: Field.create(originalFilterValue)
            };

            filter.conditions.value.set("Condition", Field.create(filterCondition));

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            const updatedValue = "Updated Value";

            filter.conditions.value.get("Condition")!.value.filterType.value = FilterConditionType.StartsWith;
            filter.conditions.value.get("Condition")!.value.property.value = newProperty;
            filter.conditions.value.get("Condition")!.value.value.value = updatedValue;

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const originalFilter = getFilters().filter(f => f.value.conditions.value ? f.value.conditions.value.filter((k, v) => v.value.value.value == originalFilterValue).size > 0 : false);
            ctx.assertEquals(`Original filter condition doens't exist for ${type}`, originalFilter.length, 0);

            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            const condition = retrievedFilter.value.conditions.value.get("Condition");
            ctx.assertEquals(`Filter condition type was updated for ${type}`, condition?.value.filterType.value, FilterConditionType.StartsWith);
            ctx.assertEquals(`Filter condition property was updated for ${type}`, condition?.value.property.value, newProperty);
            ctx.assertEquals(`Filter condition value was updated for ${type}`, condition?.value.value.value, updatedValue);
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
            getFilters: () => Field<Filter>[],
            getPrimaryObject: () => Field<T>)
        {
            const filter: Filter = defaultFilter(type);
            filter.conditions.value.set("Hi", Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create(filterValue)
            }));

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            let retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.value.filters.value.has(filter.id.value));

            filter.conditions.value.get("Hi")!.value.value.value = filterValue + "--NoMatches";
            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.value.filters.value.has(filter.id.value));

            filter.conditions.value.get("Hi")!.value.value.value = filterValue;
            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} has filter after update`, retrievedPrimaryObject.value.filters.value.has(filter.id.value));
        }

        const password = defaultPassword();
        password.login.value = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Update Metrics Work", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Update Metrics Work";

        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Field<Filter>[],
            getEmptyFilters: () => Field<Map<string, Field<string>>>,
            getDuplicateFilters: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const condition: Field<FilterCondition> = Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create(filterValue)
            });

            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.value.id.value == emptyFilter.id.value)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let isInEmptyFilters = getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, isInEmptyFilters);

            emptyFilter.conditions.value.set("Hi", condition);
            await app.currentVault.filterStore.updateFilter(masterKey, emptyFilter);

            let doesNotExistInEmptyFilters = !getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is not included in empty filters for ${type}`, doesNotExistInEmptyFilters);

            emptyFilter.conditions.value.delete("Hi");
            await app.currentVault.filterStore.updateFilter(masterKey, emptyFilter);

            isInEmptyFilters = getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is included in empty filters after update for ${type}`, isInEmptyFilters);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.value.set("Hi", condition);

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.value.set("Hi", condition);

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.value.id.value == duplicateFilterOne.id.value)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.value.id.value == duplicateFilterTwo.id.value)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for type ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for type ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterTwo.id.value));

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterOne.id.value));

            duplicateFilterOne.conditions.value.delete("Hi");
            await app.currentVault.filterStore.updateFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertTruthy(`Duplicate filter one doesn't has duplicate filter two as a duplicate for ${type}`,
                !duplicateFilterOneFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterTwo.id.value));

            ctx.assertUndefined(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates);

            duplicateFilterOne.conditions.value.set("Hi", condition);
            await app.currentVault.filterStore.updateFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterTwo.id.value));

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterOne.id.value));
        }

        const password = defaultPassword();
        password.login.value = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = filterValue;
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
        async function testFilterDelete(type: DataType, getFilters: () => Field<Filter>[])
        {
            const filter: Filter = defaultFilter(type);

            await app.currentVault.filterStore.addFilter(masterKey, filter);
            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);

            await app.currentVault.filterStore.deleteFilter(masterKey, filter);
            const deletedFilter = getFilters().filter(f => f.value.id.value == filter.id.value);
            ctx.assertEquals(`Filter was deleted for ${type}`, deletedFilter.length, 0);
        }

        await testFilterDelete(DataType.Passwords, () => app.currentVault.filterStore.passwordFilters);
        await testFilterDelete(DataType.NameValuePairs, () => app.currentVault.filterStore.nameValuePairFilters);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Condition Works", func: async (ctx: TestContext) =>
    {
        async function testFilterConditionDelete(type: DataType, getFilters: () => Field<Filter>[], property: string)
        {
            const filter: Filter = defaultFilter(type);
            let filterCondition: Field<FilterCondition> = Field.create(
                {
                    id: Field.create("Condition"),
                    filterType: Field.create(FilterConditionType.EqualTo),
                    property: Field.create(property),
                    value: Field.create("Value")
                });

            filter.conditions.value.set("Condition", filterCondition);

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            filter.conditions.value.delete("Condition");

            await app.currentVault.filterStore.updateFilter(masterKey, filter);

            const retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            ctx.assertTruthy(`Filter Exists for ${type}`, retrievedFilter);
            ctx.assertEquals(`Filter condition was deleted for ${type}`, retrievedFilter.value.conditions.value.size, 0);
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
            getFilters: () => Field<Filter>[],
            getPrimaryObject: () => Field<T>)
        {
            const filter: Filter = defaultFilter(type);
            filter.conditions.value.set("Hi", Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create(filterValue)
            }));

            await app.currentVault.filterStore.addFilter(masterKey, filter);

            let retrievedFilter = getFilters().filter(f => f.value.id.value == filter.id.value)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Filter Exists for type ${type}`, retrievedFilter);
            ctx.assertTruthy(`${type} has filter`, retrievedPrimaryObject.value.filters.value.has(filter.id.value));

            await app.currentVault.filterStore.deleteFilter(masterKey, filter);

            retrievedPrimaryObject = getPrimaryObject();
            ctx.assertTruthy(`${type} doesn't has filter`, !retrievedPrimaryObject.value.filters.value.has(filter.id.value));
        }

        const password = defaultPassword();
        password.login.value = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login",
            () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testFilterAdd(DataType.NameValuePairs, "name",
            () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

filterStoreSuite.tests.push({
    name: "FilterStore Delete Metrics Work", func: async (ctx: TestContext) =>
    {
        const filterValue = "FilterStore Delete Metrics Work";
        async function testFilterAdd(
            type: DataType,
            conditionProperty: string,
            getFilters: () => Field<Filter>[],
            getEmptyFilters: () => Field<Map<string, Field<string>>>,
            getDuplicateFilters: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const condition: Field<FilterCondition> = Field.create({
                id: Field.create("Hi"),
                property: Field.create(conditionProperty),
                filterType: Field.create(FilterConditionType.EqualTo),
                value: Field.create(filterValue)
            });

            const emptyFilter = defaultFilter(type);
            await app.currentVault.filterStore.addFilter(masterKey, emptyFilter);

            const retrievedEmptyFilter = getFilters().filter(f => f.value.id.value == emptyFilter.id.value)[0];
            ctx.assertTruthy(`Empty Filter Exists for type ${type}`, retrievedEmptyFilter);

            let hasEmptyFilter = getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is included in empty filters for ${type}`, hasEmptyFilter);

            await app.currentVault.filterStore.deleteFilter(masterKey, emptyFilter);

            let doesNotHaveEmptyFilter = !getEmptyFilters().value.has(emptyFilter.id.value);
            ctx.assertTruthy(`Empty Filter is not included in empty filters for ${type}`, doesNotHaveEmptyFilter);

            const duplicateFilterOne: Filter = defaultFilter(type);
            duplicateFilterOne.conditions.value.set("Hi", condition);

            const duplicateFilterTwo: Filter = defaultFilter(type);
            duplicateFilterTwo.conditions.value.set("Hi", condition);

            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterOne);
            await app.currentVault.filterStore.addFilter(masterKey, duplicateFilterTwo);

            const retrievedDuplicateFilterOne = getFilters().filter(f => f.value.id.value == duplicateFilterOne.id.value)[0];
            const retrievedDuplicateFilterTwo = getFilters().filter(f => f.value.id.value == duplicateFilterTwo.id.value)[0];

            ctx.assertTruthy(`Duplicate Filter one exists for ${type}`, retrievedDuplicateFilterOne);
            ctx.assertTruthy(`Duplicate Filter two exists for ${type}`, retrievedDuplicateFilterTwo);

            let duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            let duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertTruthy(`Duplicate filter one has duplicate filter two as a duplicate for ${type}`,
                duplicateFilterOneFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterTwo.id.value));

            ctx.assertTruthy(`Duplicate filter two has duplicate filter one as a duplicate for ${type}`,
                duplicateFilterTwoFromDuplicates?.value.duplicateDataTypesByID.value.has(duplicateFilterOne.id.value));

            await app.currentVault.filterStore.deleteFilter(masterKey, duplicateFilterOne);

            duplicateFilterOneFromDuplicates = getDuplicateFilters().value.get(duplicateFilterOne.id.value);
            duplicateFilterTwoFromDuplicates = getDuplicateFilters().value.get(duplicateFilterTwo.id.value);

            ctx.assertUndefined(`Duplicate filter one doesn't exist in duplicates for ${type}`, duplicateFilterOneFromDuplicates);
            ctx.assertUndefined(`Duplicate filter two doesn't exist in duplicates for ${type}`, duplicateFilterTwoFromDuplicates);
        }

        const password = defaultPassword();
        password.login.value = filterValue;
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = filterValue;
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testFilterAdd(DataType.Passwords, "login", () => app.currentVault.filterStore.passwordFilters, () => app.currentVault.filterStore.emptyPasswordFilters,
            () => app.currentVault.filterStore.duplicatePasswordFilters);

        await testFilterAdd(DataType.NameValuePairs, "name", () => app.currentVault.filterStore.nameValuePairFilters, () => app.currentVault.filterStore.emptyValueFilters,
            () => app.currentVault.filterStore.duplicateValueFilters);
    }
});

export default filterStoreSuite;