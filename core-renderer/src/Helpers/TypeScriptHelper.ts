// tests whether an object `tester` is the same type as another `actual`.
// Actual must be a concrete type, i.e. any nested objects must have all properties that it can have. Otherwise this will give 
// false negatives when comparing those nested objects
// can do additional property validation via propertyTest
export function validateObject(tester: any, actual: any, propertyTest?: (propName: string, propValue: any) => boolean,
    anonymousObjectTest?: (objName: string, propname: string, propValue: any) => boolean)
{
    const actualKeys = Object.keys(tester);
    const expectedKeys = Object.keys(actual);

    if (actualKeys.length != expectedKeys.length)
    {
        return false;
    }

    // loop over expected keys since it should have empty nested objects. That way we don't have to worry about 
    // false negatives when drilling down into nested properties
    for (let i = 0; i < expectedKeys.length; i++)
    {
        if (actualKeys.length == 0)
        {
            return false;
        }

        const index = actualKeys.indexOf(expectedKeys[i]);
        if (index < 0)
        {
            return false;
        }

        if (typeof tester[expectedKeys[i]] != typeof actual[expectedKeys[i]])
        {
            return false;
        }

        if (typeof tester[expectedKeys[i]] == 'object')
        {
            const nestedKeyLength = Object.keys(actual[expectedKeys[i]]);

            // anonymous object, like a dictionary
            if (nestedKeyLength.length == 0)
            {
                if (anonymousObjectTest)
                {
                    const anonymousObjectKeys = Object.keys(tester[expectedKeys[i]]);
                    for (let i = 0; i < anonymousObjectKeys.length; i++)
                    {
                        if (!anonymousObjectTest(expectedKeys[i], anonymousObjectKeys[i], tester[expectedKeys[i]][anonymousObjectKeys[i]]))
                        {
                            return false;
                        }
                    }
                }
            }
            else if (!validateObject(tester[expectedKeys[i]], actual[expectedKeys[i]], propertyTest, anonymousObjectTest))
            {
                return false;
            }
        }
        else if (typeof tester[expectedKeys[i]] != 'function' && propertyTest && !propertyTest(expectedKeys[i], tester[expectedKeys[i]]))
        {
            return false;
        }

        actualKeys.splice(index, 1);
    }

    return actualKeys.length == 0;
}