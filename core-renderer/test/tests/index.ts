import { Test, TestResult, TestSuite } from "./test";

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

import backupTestSuite from "./base/backup.test";
import mergingDataTestSuite from "./base/mergingData.test";

const results: TestResult = new TestResult();

async function runTests(suite: TestSuite)
{
    console.log(`Running ${suite.name} Tests`);
    for (let i = 0; i < suite.tests.length; i++)
    {
        await new Test(suite.tests[i], results).run()
    }
}

export default async function runAllTests()
{
    console.time();

    // These should go first since they mess with logging in
    await runTests(serverHelperTestSuite);
    //await runTests(backupTestSuite);
    await runTests(mergingDataTestSuite);
    await runTests(appStoreTestSuite);
    await runTests(vaultStoreTestSuite);

    await runTests(passwordStoreSuite);
    await runTests(valueStoreSuite);
    await runTests(groupStoreSuite);
    await runTests(filterStoreSuite);
    await runTests(transactionTestSuite);
    await runTests(importExportHelperTestSuite);
    await runTests(cryptUtilityTestSuite);

    results.printStatus();
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
    await runTests(serverHelperTestSuite);
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

export async function runAllBackupTests()
{
    console.time();

    await runTests(serverHelperTestSuite);
    await runTests(backupTestSuite);

    results.printStatus();
}

export async function runAllMergingDataTests()
{
    console.time();

    await runTests(serverHelperTestSuite);
    await runTests(mergingDataTestSuite);

    results.printStatus();
}