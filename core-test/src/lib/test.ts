export interface TestSuite
{
    name: string;
    tests: ITest[];
}

export interface ITest 
{
    name: string;
    func: (ctx: TestContext) => Promise<void>;
}

export interface TestContext
{
    assertEquals<T>(description: string, actual: T, expected: T): void;
    assertTruthy<T>(description: string, value: T): void;
    assertUndefined(description: string, value: any): void;
}

export function createTestSuite(name: string): TestSuite
{
    return {
        name,
        tests: []
    }
}

export class Test
{
    name: string;
    func: (ctx: TestContext) => Promise<void>;
    results: TestResult;

    constructor(test: ITest, results: TestResult)
    {
        this.name = test.name;
        this.func = test.func;
        this.results = results;
        this.results.totalTests += 1;
    }

    run()
    {
        return this.func({
            assertEquals: this.assertEquals.bind(this),
            assertTruthy: this.assertTruthy.bind(this),
            assertUndefined: this.assertUndefined.bind(this)
        });
    }

    addFailed(message: string)
    {
        if (!this.results.failedTests[this.name])
        {
            this.results.failedTests[this.name] = [];
        }

        this.results.failedTests[this.name].push(message);
    }

    assertUndefined(description: string, actual: any)
    {
        if (actual != undefined)
        {
            this.addFailed(`${description} - Expected: undefined, Actual: ${actual}`);
        }
    }

    assertEquals<T>(description: string, actual: T, expected: T)
    {
        //  make sure that we're not getting equal undefind because of an error, resulting in a false positive
        if (actual == undefined || expected == undefined)
        {
            this.addFailed(`${description} - Undefined Not allowed - Expected: ${expected}, Actual: ${actual}`);
        }
        else if (actual != expected)
        {
            this.addFailed(`${description} - Expected: ${expected}, Actual: ${actual}`);
        }
    }

    assertTruthy<T>(description: string, value: T)
    {
        if (!value)
        {
            this.addFailed(`${description} - Expected: Truthy, Actual: ${value}`);
        }
    }
}

export class TestResult
{
    totalTests: number;
    failedTests: { [Key: string]: string[] };

    constructor()
    {
        this.totalTests = 0;
        this.failedTests = {};
    }

    printStatus()
    {
        const failedTests = Object.keys(this.failedTests);
        console.log('----- Test Results -----');
        console.timeEnd();
        console.log(`Passed: ${this.totalTests - failedTests.length}`);
        console.log(`Failed: ${failedTests.length}`);

        if (failedTests.length > 0)
        {
            console.log('------------------------');
            console.log('Failed Tests: ')
            failedTests.forEach(f => 
            {
                console.log(`Test: ${f}`);
                this.failedTests[f].forEach(t => 
                {
                    console.log(`\t ${t}`);
                });
            });
        }
    }
}