import { TestRunner, TestSuite, TestSuites } from "../lib/test";

import appStoreTestSuite from "./stores/appStore.test";
import vaultStoreTestSuite from "./stores/vaultStore.test";
import passwordStoreSuite from "./stores/passwordStore.test";
import valueStoreSuite from "./stores/valueStore.test";
import filterStoreSuite from "./stores/filterStore.test";
import groupStoreSuite from "./stores/groupStore.test";
import transactionTestSuite from "./stores/transaction.test"

import serverHelperTestSuite from "./helpers/serverHelper.test";
import importExportHelperTestSuite from "./helpers/importExportHelper.test";

import cryptUtilityTestSuite from "./utilities/cryptUtility.test";

import mergingDataTestSuite from "./base/mergingData.test";
import deleteAccountTestSuite from "./base/deleteAccount.test";

const runner = new TestRunner();

const testSuites: Map<TestSuites, TestSuite> = new Map([
    [TestSuites.MergingData, mergingDataTestSuite],
    [TestSuites.ImportExportHelper, importExportHelperTestSuite],
    [TestSuites.AppStore, appStoreTestSuite],
    [TestSuites.FilterStore, filterStoreSuite],
    [TestSuites.GroupStore, groupStoreSuite],
    [TestSuites.PasswordStore, passwordStoreSuite],
    [TestSuites.ValueStore, valueStoreSuite],
    [TestSuites.Transaction, transactionTestSuite],
    [TestSuites.VaultStore, vaultStoreTestSuite],
    [TestSuites.CryptUtility, cryptUtilityTestSuite],
    [TestSuites.DeleteAccount, deleteAccountTestSuite],
]);

export default async function runTests(suite: TestSuites)
{
    // Always run first to setup some data
    await runner.runSuite(serverHelperTestSuite);

    if (suite == TestSuites.All)
    {
        for (const testSuite of testSuites.values())
        {
            await runner.runSuite(testSuite);
        }
    }
    else
    {
        await runner.runSuite(testSuites.get(suite)!);
    }

    runner.printResults();
}