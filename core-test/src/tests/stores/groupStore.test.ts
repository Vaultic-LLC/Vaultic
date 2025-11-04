import { createTestSuite, TestSuites, type TestContext } from '@lib/test';
import userManager from '@lib/userManager';
import app from "@renderer/Objects/Stores/AppStore";
import { DataType, defaultGroup, IGroupable, defaultPassword, defaultValue, Group } from "@renderer/Types/DataTypes";
import { IIdentifiable, PrimaryDataObjectCollection } from '@vaultic/shared/Types/Fields';
import { DictionaryAsList, DoubleKeyedObject } from '@vaultic/shared/Types/Stores';

let groupStoreSuite = createTestSuite("Group Store", TestSuites.GroupStore);

groupStoreSuite.tests.push({
    name: "GroupStore Add Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);
            group.n = "GroupStore Add Works";
            group.c = "#FFFFFF";

            await userManager.defaultUser.addGroup("Add Group", ctx, group);
            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertEquals(`Name for ${type}`, retrievedGroup.n, "GroupStore Add Works");
            ctx.assertEquals(`Color for ${type}`, retrievedGroup.c, "#FFFFFF");
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
            group[property][primaryObject.id] = true;
            group.n = `GroupStore Add With Primary Object Works Type ${type}`;
            group.c = "#FFFFFF";

            await userManager.defaultUser.addGroup("Add Group", ctx, group);

            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            const retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.g[group.id]);
        }

        const password = defaultPassword();
        password.l = ":Om;lmvksnvilnigneioreg";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "n ruvwl hweigbweilblgbwelgnwelngwe";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testGroupAdd(DataType.NameValuePairs, "v", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
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
            getEmptyGroups: () => DictionaryAsList,
            getDuplicateGroups: () => DoubleKeyedObject)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.n = `GroupStore Add Metrics Work Empty Type ${type}`;

            await userManager.defaultUser.addGroup("Add Empty Group", ctx, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id == emptyGroup.id)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups()[emptyGroup.id];
            ctx.assertTruthy(`Empty Group Exists for type ${type}`, hasEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.n = `GroupStore Add Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.n = `GroupStore Add Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property][primaryObject.id] = true;
            duplicateGroupTwo[property][primaryObject.id] = true;

            await userManager.defaultUser.addGroup("Add Duplicate Group One", ctx, duplicateGroupOne);

            const retrievedDuplicateGroupOne = getGroups().filter(g => g.id == duplicateGroupOne.id)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedDuplicateGroupOne);

            let retrievedDuplicateGroupOneTwo = getDuplicateGroups()[duplicateGroupOne.id];
            ctx.assertUndefined(`Duplicate Group Doens't exist for type ${type}`, retrievedDuplicateGroupOneTwo);

            hasEmptyGroup = getEmptyGroups()[duplicateGroupOne.id];
            ctx.assertTruthy(`Non empty group doesn't exist for type ${type}`, !hasEmptyGroup);

            await userManager.defaultUser.addGroup("Add Duplicate Group Two", ctx, duplicateGroupTwo);

            retrievedDuplicateGroupOneTwo = getDuplicateGroups()[duplicateGroupOne.id];
            const retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            ctx.assertTruthy(`Duplicate group one is duplicate for ${type}`,
                retrievedDuplicateGroupOneTwo?.[duplicateGroupTwo.id]);

            ctx.assertTruthy(`Duplicate group two is duplicate for ${type}`,
                retrievedDuplicateGroupTwo?.[duplicateGroupOne.id]);

            const duplicateGroupThree = defaultGroup(type);
            duplicateGroupThree.n = `GroupStore Add Metrics Work Empty Dup three Type ${type}`;

            const duplicateGroupFour = defaultGroup(type);
            duplicateGroupFour.n = `GroupStore Add Metrics Work Empty Dup four Type ${type}`;

            await userManager.defaultUser.addGroup("Add Duplicate Group Three", ctx, duplicateGroupThree);
            await userManager.defaultUser.addGroup("Add Duplicate Group Four", ctx, duplicateGroupFour);

            ctx.assertTruthy(`Empty duplicate group three exists for type ${type}`, getDuplicateGroups()[duplicateGroupThree.id]);
            ctx.assertTruthy(`Empty duplicate group four exists for type ${type}`, getDuplicateGroups()[duplicateGroupFour.id]);
        }

        const password = defaultPassword();
        password.l = "MVonivrnweigwehgiowjgiowngoi2gn";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "uhvwivweign;iognelbnae;ne;";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "v", value, () => app.currentVault.groupStore.valuesGroups,
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
            group.n = originalName;
            group.c = originalColor;

            await userManager.defaultUser.addGroup("Add Group", ctx, group);

            const newName = "New Name";
            const newColor = "#000000";

            const editableGroup = userManager.defaultUser.getEditableGroup(group.id, type);

            editableGroup.dataType.n = newName;
            editableGroup.dataType.c = newColor;

            await userManager.defaultUser.updateGroup("Update Group", ctx, editableGroup, {});

            const originalGroup = getGroups().filter(g => g.n == originalName);
            ctx.assertEquals(`Original group doesn't exists for ${type}`, originalGroup.length, 0);

            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedGroup.n, newName);
            ctx.assertEquals(`Color was updated for ${type}`, retrievedGroup.c, newColor);
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
            group[property][primaryObject.id] = true;
            group.n = `GroupStore Update With Primary Object Works Type ${type}`;
            group.c = "#FFFFFF";

            await userManager.defaultUser.addGroup("Add Group", ctx, group);

            let retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.g[group.id]);

            let editableGroup = userManager.defaultUser.getEditableGroup(group.id, type);
            await userManager.defaultUser.updateGroup("Update Group", ctx, editableGroup, {});

            retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group doesn't have ${type} id`, !retrievedGroup[property][retrievedPrimaryObject.id]);
            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.g[group.id]);

            editableGroup = userManager.defaultUser.getEditableGroup(group.id, type);
            editableGroup.dataType[property][primaryObject.id] = true;

            await userManager.defaultUser.updateGroup("Update Group", ctx, editableGroup, editableGroup.dataType[property]);

            retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group has ${type} id after update`, retrievedGroup[property][retrievedPrimaryObject.id]);
            ctx.assertTruthy(`${type} has group id after update`, retrievedPrimaryObject.g[group.id]);
        }

        const password = defaultPassword();
        password.l = "j22hg28ghigneorvmilerneriohe";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "dnlxznvklzxnvilhbilehgeigherg";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testGroupAdd(DataType.NameValuePairs, "v", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
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
            getEmptyGroups: () => DictionaryAsList,
            getDuplicateGroups: () => DoubleKeyedObject)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.n = `GroupStore Update Metrics Work Empty Type ${type}`;

            await userManager.defaultUser.addGroup("Add Empty Group", ctx, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id == emptyGroup.id)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups()[emptyGroup.id];
            ctx.assertTruthy(`Empty Group Exist for type ${type}`, hasEmptyGroup);

            let editableGroup = userManager.defaultUser.getEditableGroup(emptyGroup.id, type);
            editableGroup.dataType[property][primaryObject.id] = true;

            await userManager.defaultUser.updateGroup("Update Empty Group", ctx, editableGroup, editableGroup.dataType[property]);
            ctx.assertUndefined(`Empty Group Doesn't Exist for type ${type}`, getEmptyGroups()[emptyGroup.id]);

            editableGroup = userManager.defaultUser.getEditableGroup(emptyGroup.id, type);
            editableGroup.dataType[property] = {};
            await userManager.defaultUser.updateGroup("Update Empty Group", ctx, editableGroup, {});

            ctx.assertTruthy(`Empty Group Exist for type ${type} after update`, getEmptyGroups()[emptyGroup.id]);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.n = `GroupStore Update Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.n = `GroupStore Update Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property][primaryObject.id] = true;
            duplicateGroupTwo[property][primaryObject.id] = true;

            await userManager.defaultUser.addGroup("Add Duplicate Group One", ctx, duplicateGroupOne);
            await userManager.defaultUser.addGroup("Add Duplicate Group Two", ctx, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id];
            let retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            ctx.assertTruthy(`Duplicate Group one Exists for type ${type}`,
                retrievedDuplicateGroupOne?.[duplicateGroupTwo.id]);

            ctx.assertTruthy(`Duplicate Group two Exists for type ${type}`,
                retrievedDuplicateGroupTwo?.[duplicateGroupOne.id]);

            editableGroup = userManager.defaultUser.getEditableGroup(duplicateGroupOne.id, type);
            editableGroup.dataType[property] = {};
            await userManager.defaultUser.updateGroup("Update Duplicate Group One", ctx, editableGroup, {});

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            // duplicate group one will be a duplicate due to groups added by other tests and / or the empty group added above
            ctx.assertTruthy(`Duplicate group one doesn't have group two ${type}`,
                !retrievedDuplicateGroupOne?.[duplicateGroupTwo.id]);

            ctx.assertUndefined(`Duplicate group two isn't a duplicate ${type}`, retrievedDuplicateGroupTwo);

            editableGroup = userManager.defaultUser.getEditableGroup(duplicateGroupOne.id, type);

            editableGroup.dataType[property][primaryObject.id] = true;
            await userManager.defaultUser.updateGroup("Update Duplicate Group One", ctx, editableGroup, editableGroup.dataType[property]);

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            ctx.assertTruthy(`Duplicate group one exists for type ${type} after update`,
                retrievedDuplicateGroupOne?.[duplicateGroupTwo.id]);

            ctx.assertTruthy(`Duplicate group two exists for type ${type} after update`,
                retrievedDuplicateGroupTwo?.[duplicateGroupOne.id]);
        }

        const password = defaultPassword();
        password.l = "mvpovmweoipvnwigwiug2hih2iuglin";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "zxhdfohoashibnsdklbnaei neraiv";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "v", value, () => app.currentVault.groupStore.valuesGroups,
            () => app.currentVault.groupStore.emptyValueGroups, () => app.currentVault.groupStore.duplicateValueGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testGroupDelete(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);
            group.n = `GroupStore Delete Works Type ${type}`;

            await userManager.defaultUser.addGroup("Add Group", ctx, group);

            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);

            await userManager.defaultUser.deleteGroup("Delete Group", ctx, group);

            const deletedGroup = getGroups().filter(g => g.id == group.id);
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
            group[property][primaryObject.id] = true;
            group.n = `GroupStore Delete With Primary Object Works Type ${type}`;
            group.c = "#FFFFFF";

            await userManager.defaultUser.addGroup("Add Group", ctx, group);

            let retrievedGroup = getGroups().filter(g => g.id == group.id);
            let retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup[0]);
            ctx.assertTruthy(`${type} has group`, retrievedPrimaryObject.g[group.id]);

            await userManager.defaultUser.deleteGroup("Delete Group", ctx, group);
            retrievedPrimaryObject = getPrimaryObject();

            ctx.assertTruthy(`${type} doesn't have group id`, !retrievedPrimaryObject.g[group.id]);
        }

        const password = defaultPassword();
        password.l = "mvpovmerobnrigugh23uguyuysbvuasg";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "ixhvzioxhvioaxvwiagnweuigweipgw";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password,
            () => app.currentVault.groupStore.passwordGroups, () => app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0]);

        await testGroupAdd(DataType.NameValuePairs, "v", value,
            () => app.currentVault.groupStore.valuesGroups, () => app.currentVault.valueStore.nameValuePairs.filter(v => v.id == value.id)[0]);
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
            getEmptyGroups: () => DictionaryAsList,
            getDuplicateGroups: () => DoubleKeyedObject)
        {
            const emptyGroup: Group = defaultGroup(type);
            emptyGroup.n = `GroupStore Delete Metrics Work Empty Type ${type}`;

            await userManager.defaultUser.addGroup("Add Empty Group", ctx, emptyGroup);

            const retrievedGroup = getGroups().filter(g => g.id == emptyGroup.id)[0];
            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);

            let hasEmptyGroup = getEmptyGroups()[emptyGroup.id];
            ctx.assertTruthy(`Empty Group Exist for type ${type}`, hasEmptyGroup);

            await userManager.defaultUser.deleteGroup("Delete Empty Group", ctx, emptyGroup);

            hasEmptyGroup = getEmptyGroups()[emptyGroup.id];
            ctx.assertTruthy(`Empty Group Doesn't Exist for type ${type}`, !hasEmptyGroup);

            const duplicateGroupOne = defaultGroup(type);
            duplicateGroupOne.n = `GroupStore Delete Metrics Work Dup One Type ${type}`;

            const duplicateGroupTwo = defaultGroup(type);
            duplicateGroupTwo.n = `GroupStore Delete Metrics Work Dup Two Type ${type}`;

            duplicateGroupOne[property][primaryObject.id] = true;
            duplicateGroupTwo[property][primaryObject.id] = true;

            await userManager.defaultUser.addGroup("Add Duplicate Group One", ctx, duplicateGroupOne);
            await userManager.defaultUser.addGroup("Add Duplicate Group Two", ctx, duplicateGroupTwo);

            let retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id];
            let retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            ctx.assertTruthy(`Duplicate Group one Exists for type ${type}`, retrievedDuplicateGroupOne != undefined);
            ctx.assertTruthy(`Duplicate Group two Exists for type ${type}`, retrievedDuplicateGroupTwo != undefined);

            ctx.assertTruthy(`Duplicate Group one has duplicate group two for type ${type}`,
                retrievedDuplicateGroupOne?.[duplicateGroupTwo.id]);

            ctx.assertTruthy(`Duplicate Group two has duplicate group one for type ${type}`,
                retrievedDuplicateGroupTwo?.[duplicateGroupOne.id]);

            await userManager.defaultUser.deleteGroup("Delete Duplicate Group One", ctx, duplicateGroupOne);

            retrievedDuplicateGroupOne = getDuplicateGroups()[duplicateGroupOne.id];
            retrievedDuplicateGroupTwo = getDuplicateGroups()[duplicateGroupTwo.id];

            ctx.assertUndefined(`Duplicate group one doesn't Exists for type ${type}`, retrievedDuplicateGroupOne);
            ctx.assertUndefined(`Duplicate group two doesn't Exists for type ${type}`, retrievedDuplicateGroupOne);
        }

        const password = defaultPassword();
        password.l = "vmsovmovnwigh2t8o2hto8hidlibdsb";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const value = defaultValue();
        value.n = "zxioviowngiognio;gnio;gner;ige";
        await userManager.defaultUser.addNameValuePair("Add Name Value Pair", ctx, value);

        await testGroupAdd(DataType.Passwords, "p", password, () => app.currentVault.groupStore.passwordGroups,
            () => app.currentVault.groupStore.emptyPasswordGroups, () => app.currentVault.groupStore.duplicatePasswordGroups);

        await testGroupAdd(DataType.NameValuePairs, "v", value, () => app.currentVault.groupStore.valuesGroups,
            () => app.currentVault.groupStore.emptyValueGroups, () => app.currentVault.groupStore.duplicateValueGroups);
    }
});


export default groupStoreSuite;