import passwordTests from "./stores/passwordStore.test";
import { Test, TestResult } from "./test";

const results: TestResult = new TestResult();

export default async function runAllTests()
{
    let runningTests: Promise<void>[] = [];

    passwordTests.forEach(t => runningTests.push(new Test(t, results).run()));

    Promise.all(runningTests).then(() =>
    {
        results.printStatus();
    });
}