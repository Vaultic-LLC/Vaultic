import filterStoreSuite from "./stores/filterStore.test";
import groupStoreSuite from "./stores/groupStore.test";
import passwordStoreSuite from "./stores/passwordStore.test";
import valueStoreSuite from "./stores/valueStore.test";
import { Test, TestResult, TestSuite, type ITest } from "./test";

const results: TestResult = new TestResult();

export default async function runAllTests()
{
    runAllSync();
}

async function runAllAsync()
{
    let runningTests: Promise<void>[] = [];

    addTests(passwordStoreSuite.tests);
    addTests(valueStoreSuite.tests);
    addTests(filterStoreSuite.tests);
    addTests(groupStoreSuite.tests);

    Promise.all(runningTests).then(() =>
    {
        results.printStatus();
    });

    async function addTests(tests: ITest[])
    {
        tests.forEach(t => runningTests.push(new Test(t, results).run()));
    }
}

async function runAllSync()
{
    console.time();
    await runTests(passwordStoreSuite);
    await runTests(valueStoreSuite);
    await runTests(filterStoreSuite);
    await runTests(groupStoreSuite);

    results.printStatus();
    console.timeEnd();

    async function runTests(suite: TestSuite)
    {
        console.log(`Running ${suite.name} tests`);
        for (let i = 0; i < suite.tests.length; i++)
        {
            await new Test(suite.tests[i], results).run()
        }
    }
} 