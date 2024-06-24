
export interface ITest 
{
    name: string;
    func: (ctx: TestContext) => Promise<void>;
}

export interface TestContext
{
    assertEquals<T>(description: string, actual: T, expected: T): void;
    assertTruthy<T>(description: string, value: T): void;
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
            assertTruthy: this.assertTruthy.bind(this)
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

    assertEquals<T>(description: string, actual: T, expected: T)
    {
        if (actual != expected)
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
                    console.log(t);
                });
            });
        }
    }
}