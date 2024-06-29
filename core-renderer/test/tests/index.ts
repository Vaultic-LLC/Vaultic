import filterStoreSuite from "./stores/filterStore.test";
import groupStoreSuite from "./stores/groupStore.test";
import passwordStoreSuite from "./stores/passwordStore.test";
import valueStoreSuite from "./stores/valueStore.test";
import { Test, TestResult, TestSuite } from "./test";

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
    await runTests(passwordStoreSuite);
    await runTests(valueStoreSuite);
    await runTests(groupStoreSuite);
    await runTests(filterStoreSuite);

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
    await runTests(groupStoreSuite);

    results.printStatus();
}

export async function runAllFilterTests()
{
    console.time();
    await runTests(filterStoreSuite);

    results.printStatus();
}