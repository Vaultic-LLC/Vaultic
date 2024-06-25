import { stores } from "../../src/core/Objects/Stores/index";
import { defaultGroup } from '../../src/core/Types/EncryptedData';
import { createTestSuite, type ITest, type TestContext } from '../test';
import { DataType, Group } from "../../src/core/Types/Table";

let groupStoreSuite = createTestSuite("Group Store");

const masterKey = "test";

groupStoreSuite.tests.push({
    name: "GroupStore Add Works", func: async (ctx: TestContext) =>
    {
        async function testGroupAdd(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);

            await stores.groupStore.addGroup(masterKey, group);
            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];

            ctx.assertTruthy(`Group Exists for type ${type}`, retrievedGroup);
        }

        await testGroupAdd(DataType.Passwords, () => stores.groupStore.passwordGroups);
        await testGroupAdd(DataType.NameValuePairs, () => stores.groupStore.valuesGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Update Group Works", func: async (ctx: TestContext) =>
    {
        async function testUpdateGroup(type: DataType, getGroups: () => Group[])
        {
            const originalName = "GroupStoreUpdateWorks";
            const originalColor = "#FFFFFF";

            const group: Group = defaultGroup(type);
            group.name = originalName;
            group.color = originalColor;

            await stores.groupStore.addGroup(masterKey, group);

            const newName = "New Name";
            const newColor = "#000000";

            group.name = newName;
            group.color = newColor;

            await stores.groupStore.updateGroup(masterKey, group);

            const originalGroup = getGroups().filter(g => g.name == originalName);
            ctx.assertEquals(`Original group doesn't exists for ${type}`, originalGroup.length, 0);

            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);
            ctx.assertEquals(`Name was updated for ${type}`, retrievedGroup.name, newName);
            ctx.assertEquals(`Color was updated for ${type}`, retrievedGroup.color, newColor);
        }

        await testUpdateGroup(DataType.Passwords, () => stores.groupStore.passwordGroups);
        await testUpdateGroup(DataType.NameValuePairs, () => stores.groupStore.valuesGroups);
    }
});

groupStoreSuite.tests.push({
    name: "GroupStore Delete Works", func: async (ctx: TestContext) =>
    {
        async function testGroupDelete(type: DataType, getGroups: () => Group[])
        {
            const group: Group = defaultGroup(type);

            await stores.groupStore.addGroup(masterKey, group);

            const retrievedGroup = getGroups().filter(g => g.id == group.id)[0];
            ctx.assertTruthy(`Group exists for ${type}`, retrievedGroup);

            await stores.groupStore.deleteGroup(masterKey, group);

            const deletedGroup = getGroups().filter(g => g.id == group.id);
            ctx.assertEquals(`Group doens't exist for ${type}`, deletedGroup.length, 0);
        }

        await testGroupDelete(DataType.Passwords, () => stores.groupStore.passwordGroups);
        await testGroupDelete(DataType.NameValuePairs, () => stores.groupStore.valuesGroups);
    }
});

export default groupStoreSuite;