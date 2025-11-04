export interface TestSuite
{
    name: string;
    tests: ITest[];
    suite: TestSuites;
}

export enum TestSuites
{
    All,
    DeleteAccount,
    MergingData,
    ImportExportHelper,
    ServerHelper,
    AppStore,
    FilterStore,
    GroupStore,
    PasswordStore,
    Transaction,
    UserPreferencesStore,
    ValueStore,
    VaultStore,
    CryptUtility
}

export interface ITest 
{
    name: string;
    func: (ctx: TestContext) => Promise<void>;
}

export interface TestContext<T = any>
{
    state: T;
    assertEquals<T>(description: string, actual: T, expected: T): void;
    assertTruthy<T>(description: string, value: T): void;
    assertUndefined(description: string, value: any): void;
}

export function createTestSuite(name: string, suite: TestSuites): TestSuite
{
    return {
        name,
        tests: [],
        suite
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

    run(state: any)
    {
        return this.func({
            state,
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

export class TestRunner
{
    private results: TestResult;
    private first: boolean;

    constructor()
    {
        this.results = new TestResult();
        this.first = true;
    }

    async runSuite(suite: TestSuite)
    {
        if (this.first)
        {
            console.time();
            this.first = false;
        }

        console.log(`Running ${suite.name} Tests`);
        const state = {};

        for (let i = 0; i < suite.tests.length; i++)
        {
            await new Test(suite.tests[i], this.results).run(state)
        }
    }

    printResults()
    {
        this.results.printStatus();
    }
}