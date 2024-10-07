import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";

let appStoreTestSuite = createTestSuite("App Store");

const masterKey = "test";

appStoreTestSuite.tests.push({
    name: "", func: async (ctx: TestContext) =>
    {

    }
});

export default appStoreTestSuite;