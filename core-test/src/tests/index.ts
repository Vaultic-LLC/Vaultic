import { TestRunner } from "../lib/test";

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
import deleteAccountTestSuite from "./base/deleteAccount.test";

const runner = new TestRunner();

export default async function runAllTests()
{
    // These should go first since they mess with logging in
    await runner.runSuite(serverHelperTestSuite);
    //await runTests(backupTestSuite);
    await runner.runSuite(mergingDataTestSuite);
    await runner.runSuite(appStoreTestSuite);
    await runner.runSuite(vaultStoreTestSuite);

    await runner.runSuite(passwordStoreSuite);
    await runner.runSuite(valueStoreSuite);
    await runner.runSuite(groupStoreSuite);
    await runner.runSuite(filterStoreSuite);
    await runner.runSuite(transactionTestSuite);
    await runner.runSuite(importExportHelperTestSuite);
    await runner.runSuite(cryptUtilityTestSuite);

    await runner.runSuite(deleteAccountTestSuite);

    runner.printResults();
}

export async function runAllAppStoreTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(appStoreTestSuite);

    runner.printResults();
}


export async function runAllPasswordTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(passwordStoreSuite);

    runner.printResults();
}

export async function runAllValueTests()
{
    await runner.runSuite(valueStoreSuite);

    runner.printResults();
}

export async function runAllGroupTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(groupStoreSuite);

    runner.printResults();
}

export async function runAllFilterTests()
{
    await runner.runSuite(filterStoreSuite);

    runner.printResults();
}

export async function runAllTransactionTests()
{
    await runner.runSuite(transactionTestSuite);

    runner.printResults();
}

export async function runServerHelperTests()
{
    await runner.runSuite(serverHelperTestSuite);

    runner.printResults();
}

export async function runImportExportHelperTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(importExportHelperTestSuite);

    runner.printResults();
}

export async function runCryptUtilityTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(cryptUtilityTestSuite);

    runner.printResults();
}

export async function runAllBackupTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(backupTestSuite);

    runner.printResults();
}

export async function runAllMergingDataTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(mergingDataTestSuite);

    runner.printResults();
}

export async function runAllDeleteAccountTests()
{
    await runner.runSuite(serverHelperTestSuite);
    await runner.runSuite(deleteAccountTestSuite);

    runner.printResults();
}