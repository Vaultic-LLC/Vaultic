import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { Dictionary } from '@vaultic/shared/Types/DataStructures';
import { DataType, defaultGroup, IIdentifiable, IGroupable, defaultPassword, defaultValue, Group } from '../../src/core/Types/DataTypes';
import { PrimaryDataObjectCollection } from '../../src/core/Types/Fields';

let groupStoreSuite = createTestSuite("Group Store");

const masterKey = "test";

groupStoreSuite.tests.push({
    name: "GroupStore Add Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);
            group.name.value = "GroupStore Add Works";
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);
            const retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertEquals(`Name for ${type}`, retrievedGroup.name.value, "GroupStore Add Works");
            ctx.assertEquals(`Color for ${type}`, retrievedGroup.color.value, "#FFFFFF");
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
            getGroups: () => Group[],
            getPrimaryObject: () => T)
        {
            const group: Group = defaultGroup(type);
            group[property].value.push(primaryObject.id.value);
            group.name.value = `GroupStore Add With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            const retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.groups.value.includes(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = ":Om;lmvksnvilnigneioreg";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "n ruvwl hweigbweilblgbwelgnwelngwe";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Add Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Group[],
            getEmptyGroups: () => string[],
            getDuplicateGroups: () => Dictionary<string[]>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Add Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Empty Group Exists for type ${type}`, retrievedEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Add Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Add Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.push(primaryObject.id.value);
            duplicateGroupTwo[property].value.push(primaryObject.id.value);

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);

            const retrievedDuplicateGroupOne = getGroups().filter(g => g.id.value == duplicateGroupOne.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedDuplicateGroupOne);

            let retrievedDuplicateGroupOneTwo = getDuplicateGroups()[duplicateGroupOne.id.value];
            ctx.assertEquals(`Duplicate Group Doens't exist for type ${type}`, retrievedDuplicateGroupOneTwo, undefined);

            retrievedEmptyGroup = getEmptyGroups().filter(g => g == duplicateGroupOne.id.value)[0];
            ctx.assertEquals(`Non empty group doesn't exist for type ${type}`, retrievedEmptyGroup, undefined);

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            retrievedDuplicateGroupOneTwo = getDuplicateGroups()[duplicateGroupOne.id.value];
            const retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            ctx.assertEquals(`Duplicate group one is duplicate for ${type}`, retrievedDuplicateGroupOneTwo.length, 1);
            ctx.assertEquals(`Duplicate group two is duplicate for ${type}`, retrievedDuplicateGroupTwo.length, 1);
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
        async function testUpdateGroup(type: DataType, getGroups: () => Group[])
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

            const originalGroup = getGroups().filter(g => g.name.value == originalName);
            ctx.assertEquals(`Original group doesn't exists for ${type}`, originalGroup.length, 0);

            const retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedGroup.name.value, newName);
            ctx.assertEquals(`Color was updated for ${type}`, retrievedGroup.color.value, newColor);
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
            getGroups: () => Group[],
            getPrimaryObject: () => T)
        {
            const group: Group = defaultGroup(type);
            group[property].value.push(primaryObject.id.value);
            group.name.value = `GroupStore Update With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            let retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.groups.value.includes(group.id.value));

            const groupWithoutPrimaryObject: Group = JSON.parse(JSON.stringify(group));
            groupWithoutPrimaryObject[property].value = []

            await app.currentVault.groupStore.updateGroup(masterKey, groupWithoutPrimaryObject);

            retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group doesn't have ${type} id`, !retrievedGroup[property].value.includes(retrievedPrimaryObject.id.value));
            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.groups.value.includes(group.id.value));

            const groupWithPrimaryObject: Group = JSON.parse(JSON.stringify(groupWithoutPrimaryObject));
            groupWithPrimaryObject[property].value.push(primaryObject.id.value);

            await app.currentVault.groupStore.updateGroup(masterKey, groupWithPrimaryObject);

            retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group has ${type} id after update`, retrievedGroup[property].value.includes(retrievedPrimaryObject.id.value));
            ctx.assertTruthy(`${type} has group id after update`, retrievedPrimaryObject.groups.value.includes(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = "j22hg28ghigneorvmilerneriohe";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "dnlxznvklzxnvilhbilehgeigherg";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Update Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Group[],
            getEmptyGroups: () => string[],
            getDuplicateGroups: () => Dictionary<string[]>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Update Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value);
            ctx.assertEquals(`Empty Group Exist for type ${type}`, retrievedEmptyGroup.length, 1);

            emptyGroup[property].value.push(primaryObject.id.value);
            await app.currentVault.groupStore.updateGroup(masterKey, emptyGroup);

            retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value);
            ctx.assertEquals(`Empty Group Doesn't Exist for type ${type}`, retrievedEmptyGroup.length, 0);

            emptyGroup[property].value = [];
            await app.currentVault.groupStore.updateGroup(masterKey, emptyGroup);

            retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value);
            ctx.assertEquals(`Empty Group Exist for type ${type} after update`, retrievedEmptyGroup.length, 1);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Update Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Update Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.push(primaryObject.id.value);
            duplicateGroupTwo[property].value.push(primaryObject.id.value);

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);
            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id.value];
            let retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            ctx.assertEquals(`Duplicate Group one Exists for type ${type}`, retrievedDuplicateGroupOne.length, 1);
            ctx.assertEquals(`Duplicate Group two Exists for type ${type}`, retrievedDuplicateGroupTwo.length, 1);

            duplicateGroupOne[property].value = [];

            await app.currentVault.groupStore.updateGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id.value];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            // duplicate group one will be a duplicate due to groups added by other tests and / or the empty group added above
            ctx.assertTruthy(`Duplicate group one doesn't have group two ${type}`, !retrievedDuplicateGroupOne.includes(duplicateGroupTwo.id.value));
            ctx.assertEquals(`Duplicate group two isn't a duplicate ${type}`, retrievedDuplicateGroupTwo, undefined);

            duplicateGroupOne[property].value.push(primaryObject.id.value);

            await app.currentVault.groupStore.updateGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id.value];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            ctx.assertEquals(`Duplicate group one exists for type ${type} after update`, retrievedDuplicateGroupOne.length, 1);
            ctx.assertEquals(`Duplicate group two exists for type ${type} after update`, retrievedDuplicateGroupTwo.length, 1);
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
        async function testGroupDelete(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);
            group.name.value = `GroupStore Delete Works Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, group);

            const retrievedGroup = getGroups().filter(g => g.id.value == group.id.value)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);

            await app.currentVault.groupStore.deleteGroup(masterKey, group);

            const deletedGroup = getGroups().filter(g => g.id.value == group.id.value);
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
            getGroups: () => Group[],
            getPrimaryObject: () => T)
        {
            const group: Group = defaultGroup(type);
            group[property].value.push(primaryObject.id.value);
            group.name.value = `GroupStore Delete With Primary Object Works Type ${type}`;
            group.color.value = "#FFFFFF";

            await app.currentVault.groupStore.addGroup(masterKey, group);

            let retrievedGroup = getGroups().filter(g => g.id.value == group.id.value);
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup[0]);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.groups.value.includes(group.id.value));

            await app.currentVault.groupStore.deleteGroup(masterKey, group);
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.groups.value.includes(group.id.value));
        }

        const password = defaultPassword();
        password.login.value = "mvpovmerobnrigugh23uguyuysbvuasg";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const value = defaultValue();
        value.name.value = "ixhvzioxhvioaxvwiagnweuigweipgw";
        await app.currentVault.valueStore.addNameValuePair(masterKey, value);

        await testGroupAdd(DataType.Passwords, "passwords", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0]);

        await testGroupAdd(DataType.NameValuePairs, "values", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id.value == value.id.value)[0]);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete Metrics Work", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd<T extends IIdentifiable & IGroupable>(
            type: DataType,
            property: PrimaryDataObjectCollection,
            primaryObject: T,
            getGroups: () => Group[],
            getEmptyGroups: () => string[],
            getDuplicateGroups: () => Dictionary<string[]>)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.name.value = `GroupStore Delete Metrics Work Empty Type ${type}`;

            await app.currentVault.groupStore.addGroup(masterKey, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id.value == emptyGroup.id.value)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value);
            ctx.assertEquals(`Empty Group Exist for type ${type}`, retrievedEmptyGroup.length, 1);

            await app.currentVault.groupStore.deleteGroup(masterKey, emptyGroup);

            retrievedEmptyGroup = getEmptyGroups().filter(g => g == emptyGroup.id.value);
            ctx.assertEquals(`Empty Group Doesn't Exist for type ${type}`, retrievedEmptyGroup.length, 0);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.name.value = `GroupStore Delete Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.name.value = `GroupStore Delete Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property].value.push(primaryObject.id.value);
            duplicateGroupTwo[property].value.push(primaryObject.id.value);

            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupOne);
            await app.currentVault.groupStore.addGroup(masterKey, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id.value];
            let retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            ctx.assertEquals(`Duplicate Group one Exists for type ${type}`, retrievedDuplicateGroupOne.length, 1);
            ctx.assertEquals(`Duplicate Group two Exists for type ${type}`, retrievedDuplicateGroupOne.length, 1);

            await app.currentVault.groupStore.deleteGroup(masterKey, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id.value];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id.value];

            ctx.assertEquals(`Duplicate group one doesn't Exists for type ${type}`, retrievedDuplicateGroupOne, undefined);
            ctx.assertEquals(`Duplicate group two doesn't Exists for type ${type}`, retrievedDuplicateGroupOne, undefined);
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