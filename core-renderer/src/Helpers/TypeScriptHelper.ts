import { Field } from "@vaultic/shared/Types/Fields";

// tests whether an object `tester` is the same type as another `actual`.
// Actual must be a concrete type, i.e. any nested objects must have all properties that it can have. Otherwise this will give 
// false negatives when comparing those nested objects
// can do additional property validation via propertyTest
export function validateObject(tester: Field<any>, actual: Field<any>, propertyTest?: (propName: string, propValue: any) => boolean,
    mapTest?: (objName: string, propname: string, propValue: any) => boolean)
{
    if (actual.value instanceof Map)
    {
        if (!checkMap("", tester, actual, propertyTest, mapTest))
        {
            return false;
        }

        return true;
    }

    const actualKeys = Object.keys(tester.value);
    const expectedKeys = Object.keys(actual.value);

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

        if (typeof tester.value[expectedKeys[i]].value != typeof actual.value[expectedKeys[i]].value)
        {
            return false;
        }

        if (typeof tester.value[expectedKeys[i]].value == 'object')
        {
            if (actual.value[expectedKeys[i]].value instanceof Map)
            {
                if (!checkMap(expectedKeys[i], tester.value[expectedKeys[i]], actual.value[expectedKeys[i]], propertyTest, mapTest))
                {
                    return false;
                }
            }
            else if (!validateObject(tester.value[expectedKeys[i]], actual.value[expectedKeys[i]], propertyTest, mapTest))
            {
                return false;
            }
        }
        else if (typeof tester.value[expectedKeys[i]].value != 'function' && propertyTest && !propertyTest(expectedKeys[i], tester.value[expectedKeys[i]].value))
        {
            return false;
        }

        actualKeys.splice(index, 1);
    }

    return actualKeys.length == 0;
}

function checkMap(objName: string, tester: Field<any>, actual: Field<any>, propertyTest?: (propName: string, propValue: any) => boolean,
    mapTest?: (objName: string, propname: string, propValue: any) => boolean)
{
    if (mapTest)
    {
        for (const [key, value] of tester.value.entries())
        {
            if (!mapTest(objName, key, value))
            {
                return false;
            }
        }
    }

    return true;
}