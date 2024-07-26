import { Test, TestResult, TestSuite } from "./test";
import { stores } from "../src/core/Objects/Stores";
import { AutoLockTime } from "../src/core/Types/Settings";

import passwordStoreSuite from "./stores/passwordStore.test";
import valueStoreSuite from "./stores/valueStore.test";
import filterStoreSuite from "./stores/filterStore.test";
import groupStoreSuite from "./stores/groupStore.test";
import transactionTestSuite from "./stores/transaction.test"

import serverHelperTestSuite from "./helpers/serverHelper.test";
import importExportHelperTestSuite from "./helpers/importExportHelper.test";

import cryptUtilityTestSuite from "./utilities/cryptUtility.test";

const results: TestResult = new TestResult();
const masterKey = "test";

async function runTests(suite: TestSuite)
{
    console.log(`Running ${suite.name} Tests`);
    for (let i = 0; i < suite.tests.length; i++)
    {
        await new Test(suite.tests[i], results).run()
    }
}

async function setup()
{
    // update the auto lock time so our store data doesn't get reset mid test run
    const settingState = stores.settingsStore.getState();
    settingState.autoLockTime = AutoLockTime.ThirtyMinutes;

    await stores.settingsStore.update(masterKey, settingState);
}

async function cleanUp()
{
    for (let i = 0; i < stores.passwordStore.passwords.length; i++)
    {
        await stores.passwordStore.deletePassword(masterKey, stores.passwordStore.passwords[i]);
    }

    for (let i = 0; i < stores.valueStore.nameValuePairs.length; i++)
    {
        await stores.valueStore.deleteNameValuePair(masterKey, stores.valueStore.nameValuePairs[i]);
    }

    const filterState = stores.filterStore.getState();
    for (let i = 0; i < filterState.values.length; i++)
    {
        await stores.filterStore.deleteFilter(masterKey, filterState.values[i]);
    }

    const groupState = stores.groupStore.getState();
    for (let i = 0; i < groupState.values.length; i++)
    {
        await stores.groupStore.deleteGroup(masterKey, groupState.values[i]);
    }
}

export default async function runAllTests()
{
    await cleanUp();
    await setup();

    await stores.appStore.setKey(masterKey);
    console.time();

    await runTests(passwordStoreSuite);
    await runTests(valueStoreSuite);
    await runTests(groupStoreSuite);
    await runTests(filterStoreSuite);
    await runTests(transactionTestSuite);
    await runTests(serverHelperTestSuite);
    await runTests(importExportHelperTestSuite);
    await runTests(cryptUtilityTestSuite);

    results.printStatus();

    await cleanUp();
}

export async function runAllValueTests()
{
    console.time();
    await runTests(valueStoreSuite);

    results.printStatus();
}

export async function runAllGroupTests()
{
    console.time();
    await runTests(groupStoreSuite);

    results.printStatus();
}

export async function runAllFilterTests()
{
    console.time();
    await runTests(filterStoreSuite);

    results.printStatus();
}

export async function runAllTransactionTests()
{
    console.time();
    await runTests(transactionTestSuite);

    results.printStatus();
}

export async function runServerHelperTests()
{
    console.time();
    await runTests(serverHelperTestSuite);

    results.printStatus();
}

export async function runImportExportHelperTests()
{
    console.time();
    await runTests(importExportHelperTestSuite);

    results.printStatus();
}

export async function runCryptUtilityTests()
{
    console.time();
    await runTests(cryptUtilityTestSuite);

    results.printStatus();
}
