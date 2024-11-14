import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { Dictionary } from '@vaultic/shared/Types/DataStructures';
import { DataType, defaultGroup, IGroupable, defaultPassword, defaultValue, Group, DuplicateDataTypes } from '../../src/core/Types/DataTypes';
import { Field, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from '@vaultic/shared/Types/Fields';

let groupStoreSuite = createTestSuite("Group Store");

const masterKey = "test";

groupStoreSuite.tests.push({
    name: "GroupStore Add Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd(type: DataType, getGroups: () => Field<Group>[])
        {
            const group: Group = defaultGroup(type);
            group.name.value = "GroupStore Add Works";
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);
            const retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertEquals(`Name for ${type}`, retrievedGroup.value.name.value, "GroupStore Add Works");
            ctx.assertEquals(`Color for ${type}`, retrievedGroup.value.color.value, "#FFFFFF");
        }

        await testGroupAdd(DataType.Passwords, () => app.currentVault.groupStore.passwordGroups);
        await testGroupAdd(DataType.NameValuePairs, () => app.currentVault.groupStore.valuesGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Add With Primary Object Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getPrimaryObject: () => Field<T>)
        {
            const group: Group = defaultGroup(type);
            group[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            group.name.value = `GroupStore Add With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.value.groups.value.has(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = ":Om;lmvksnvilnigneioreg";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "n ruvwl hweigbweilblgbwelgnwelngwe";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Add Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getEmptyGroups: () => Field<Map<string, Field<string>>>,
            getDuplicateGroups: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Add Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Exists for type ${type}`, hasEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Add Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Add Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            duplicateGroupTwo[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));


            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);

            const retrievedDuplicateGroupOne = getGroups().filter(g => g.value.id.value == duplicateGroupOne.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedDuplicateGroupOne);

            let retrievedDuplicateGroupOneTwo = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            ctx.assertUndefined(`Duplicate Group Doens't exist for type ${type}`, retrievedDuplicateGroupOneTwo);

            hasEmptyGroup = getEmptyGroups().value.has(duplicateGroupOne.id.value);
            ctx.assertTruthy(`Non empty group doesn't exist for type ${type}`, !hasEmptyGroup);

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            retrievedDuplicateGroupOneTwo = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            const retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            ctx.assertTruthy(`Duplicate group one is duplicate for ${type}`,
                retrievedDuplicateGroupOneTwo?.value.duplicateDataTypesByID.value.has(duplicateGroupTwo.id.value));

            ctx.assertTruthy(`Duplicate group two is duplicate for ${type}`,
                retrievedDuplicateGroupTwo?.value.duplicateDataTypesByID.value.has(duplicateGroupOne.id.value));

            const duplicateGroupThree = defaultGroup(type);
            duplicateGroupThree.name.value = `GroupStore Add Metrics Work Empty Dup three Type ${type}`;

            const duplicateGroupFour = defaultGroup(type);
            duplicateGroupFour.name.value = `GroupStore Add Metrics Work Empty Dup four Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupThree);
            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupFour);

            ctx.assertTruthy(`Empty duplicate group three exists for type ${type}`, getDuplicateGroups().value.get(duplicateGroupThree.id.value));
            ctx.assertTruthy(`Empty duplicate group four exists for type ${type}`, getDuplicateGroups().value.get(duplicateGroupFour.id.value));
        }

        const password = defaultPassword();
        password.login.value = "MVonivrnweigwehgiowjgiowngoi2gn";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "uhvwivweign;iognelbnae;ne;";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "values", value, () => app.currentVault.groupStore.valuesGroups,
            () => app.currentVault.groupStore.emptyValueGroups, () => app.currentVault.groupStore.duplicateValueGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Update Group Works", func: async (ctx: TestContext) =>
    {
        async function testUpdateGroup(type: DataType, getGroups: () => Field<Group>[])
        {
            const originalName = `GroupStoreUpdateWorksType${type}`;
            const originalColor = "#FFFFFF";

            const group: Group = defaultGroup(type);
            group.name.value = originalName;
            group.color.value = originalColor;

            await app.currentVault.groupStore.addGroup(masterKey, group);

            const newName = "New Name";
            const newColor = "#000000";

            group.name.value = newName;
            group.color.value = newColor;

            await app.currentVault.groupStore.updateGroup(masterKey, group);

            const originalGroup = getGroups().filter(g => g.value.name.value == originalName);
            ctx.assertEquals(`Original group doesn't exists for ${type}`, originalGroup.length, 0);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedGroup.value.name.value, newName);
            ctx.assertEquals(`Color was updated for ${type}`, retrievedGroup.value.color.value, newColor);
        }

        await testUpdateGroup(DataType.Passwords, () => app.currentVault.groupStore.passwordGroups);
        await testUpdateGroup(DataType.NameValuePairs, () => app.currentVault.groupStore.valuesGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Update With Primary Object Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getPrimaryObject: () => Field<T>)
        {
            const group: Group = defaultGroup(type);
            group[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            group.name.value = `GroupStore Update With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            let retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.value.groups.value.has(group.id.value));

            const groupWithoutPrimaryObject: Group = JSON.vaulticParse(JSON.vaulticStringify(group));
            groupWithoutPrimaryObject[property].value = new Map();

            await app.currentVault.groupStore.updateGroup(masterKey, groupWithoutPrimaryObject);

            retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group doesn't have ${type} id`, !retrievedGroup.value[property].value.has(retrievedPrimaryObject.value.id.value));
            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.value.groups.value.has(group.id.value));

            const groupWithPrimaryObject: Group = JSON.vaulticParse(JSON.vaulticStringify(groupWithoutPrimaryObject));
            groupWithPrimaryObject[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));

            await app.currentVault.groupStore.updateGroup(masterKey, groupWithPrimaryObject);

            retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group has ${type} id after update`, retrievedGroup.value[property].value.has(retrievedPrimaryObject.value.id.value));
            ctx.assertTruthy(`${type} has group id after update`, retrievedPrimaryObject.value.groups.value.has(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = "j22hg28ghigneorvmilerneriohe";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "dnlxznvklzxnvilhbilehgeigherg";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Update Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getEmptyGroups: () => Field<Map<string, Field<string>>>,
            getDuplicateGroups: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Update Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Exist for type ${type}`, hasEmptyGroup);

            emptyGroup[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            await app.currentVault.groupStore.updateGroup(masterKey, emptyGroup);

            hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Doesn't Exist for type ${type}`, !hasEmptyGroup);

            emptyGroup[property].value = new Map();
            await app.currentVault.groupStore.updateGroup(masterKey, emptyGroup);

            hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Exist for type ${type} after update`, hasEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Update Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Update Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            duplicateGroupTwo[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);
            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            let retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            ctx.assertTruthy(`Duplicate Group one Exists for type ${type}`,
                retrievedDuplicateGroupOne?.value.duplicateDataTypesByID.value.has(duplicateGroupTwo.id.value));

            ctx.assertTruthy(`Duplicate Group two Exists for type ${type}`,
                retrievedDuplicateGroupTwo?.value.duplicateDataTypesByID.value.has(duplicateGroupOne.id.value));

            duplicateGroupOne[property].value = new Map();

            await app.currentVault.groupStore.updateGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            // duplicate group one will be a duplicate due to groups added by other tests and / or the empty group added above
            ctx.assertTruthy(`Duplicate group one doesn't have group two ${type}`,
                !retrievedDuplicateGroupOne?.value.duplicateDataTypesByID.value.has(duplicateGroupTwo.id.value));

            ctx.assertUndefined(`Duplicate group two isn't a duplicate ${type}`, retrievedDuplicateGroupTwo);

            duplicateGroupOne[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));

            await app.currentVault.groupStore.updateGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            ctx.assertTruthy(`Duplicate group one exists for type ${type} after update`,
                retrievedDuplicateGroupOne?.value.duplicateDataTypesByID.value.has(duplicateGroupTwo.id.value));

            ctx.assertTruthy(`Duplicate group two exists for type ${type} after update`,
                retrievedDuplicateGroupTwo?.value.duplicateDataTypesByID.value.has(duplicateGroupOne.id.value));
        }

        const password = defaultPassword();
        password.login.value = "mvpovmweoipvnwigwiug2hih2iuglin";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "zxhdfohoashibnsdklbnaei neraiv";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "values", value, () => app.currentVault.groupStore.valuesGroups,
            () => app.currentVault.groupStore.emptyValueGroups, () => app.currentVault.groupStore.duplicateValueGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testGroupDelete(type: DataType, getGroups: () => Field<Group>[])
        {
            const group: Group = defaultGroup(type);
            group.name.value = `GroupStore Delete Works Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, group);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);

            await app.currentVault.groupStore.deleteGroup(masterKey, group);

            const deletedGroup = getGroups().filter(g => g.value.id.value == group.id.value);
            ctx.assertEquals(`Group doens't exist for ${type}`, deletedGroup.length, 0);
        }

        await testGroupDelete(DataType.Passwords, () => app.currentVault.groupStore.passwordGroups);
        await testGroupDelete(DataType.NameValuePairs, () => app.currentVault.groupStore.valuesGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete With Primary Object Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getPrimaryObject: () => Field<T>)
        {
            const group: Group = defaultGroup(type);
            group[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            group.name.value = `GroupStore Delete With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            let retrievedGroup = getGroups().filter(g => g.value.id.value == group.id.value);
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup[0]);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.value.groups.value.has(group.id.value));

            await app.currentVault.groupStore.deleteGroup(masterKey, group);
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.value.groups.value.has(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = "mvpovmerobnrigugh23uguyuysbvuasg";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "ixhvzioxhvioaxvwiagnweuigweipgw";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.value.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.value.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Field<Group>[],
            getEmptyGroups: () => Field<Map<string, Field<string>>>,
            getDuplicateGroups: () => Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Delete Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.value.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Exist for type ${type}`, hasEmptyGroup);

            await app.currentVault.groupStore.deleteGroup(masterKey, emptyGroup);

            hasEmptyGroup = getEmptyGroups().value.has(emptyGroup.id.value);
            ctx.assertTruthy(`Empty Group Doesn't Exist for type ${type}`, !hasEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Delete Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Delete Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));
            duplicateGroupTwo[property].value.set(primaryObject.id.value, new Field(primaryObject.id.value));

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);
            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            let retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            ctx.assertTruthy(`Duplicate Group one Exists for type ${type}`, retrievedDuplicateGroupOne != undefined);
            ctx.assertTruthy(`Duplicate Group two Exists for type ${type}`, retrievedDuplicateGroupTwo != undefined);

            ctx.assertTruthy(`Duplicate Group one has duplicate group two for type ${type}`,
                retrievedDuplicateGroupOne?.value.duplicateDataTypesByID.value.has(duplicateGroupTwo.id.value));

            ctx.assertTruthy(`Duplicate Group two has duplicate group one for type ${type}`,
                retrievedDuplicateGroupTwo?.value.duplicateDataTypesByID.value.has(duplicateGroupOne.id.value));

            await app.currentVault.groupStore.deleteGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups().value.get(duplicateGroupOne.id.value);
            retrievedDuplicateGroupTwo = getDuplicateGroups().value.get(duplicateGroupTwo.id.value);

            ctx.assertUndefined(`Duplicate group one doesn't Exists for type ${type}`, retrievedDuplicateGroupOne);
            ctx.assertUndefined(`Duplicate group two doesn't Exists for type ${type}`, retrievedDuplicateGroupOne);
        }

        const password = defaultPassword();
        password.login.value = "vmsovmovnwigh2t8o2hto8hidlibdsb";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "zxioviowngiognio;gnio;gner;ige";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "values", value, () => app.currentVault.groupStore.valuesGroups,
            () => app.currentVault.groupStore.emptyValueGroups, () => app.currentVault.groupStore.duplicateValueGroups);
    }
});


export default groupStoreSuite;