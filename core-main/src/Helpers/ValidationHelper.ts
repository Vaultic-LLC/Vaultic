import { ValidationHelper } from "@vaultic/shared/Types/Helpers";

function isWeak(value: string): [boolean, number]
{
    if (value.length < 16)
    {
        return [true, 0];
    }
    else if (!containsUppercaseAndLowercaseNumber(value))
    {
        return [true, 1]
    }
    else if (!containsNumber(value))
    {
        return [true, 2];
    }
    else
    {
        if (!containsSpecialCharacter(value))
        {
            return [true, 3];
        }
    }

    return [false, -1];
}

function containsNumber(value: string): boolean
{
    return /\d/.test(value);
}

function containsSpecialCharacter(value: string): boolean
{
    const specialCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/;
    return specialCharacters.test(value);
}

function containsUppercaseAndLowercaseNumber(value: string): boolean
{
    return /[A-Z]/.test(value) && /[a-z]/.test(value);
}

const validationHelper: ValidationHelper =
{
    isWeak,
    containsNumber,
    containsSpecialCharacter,
    containsUppercaseAndLowercaseNumber
};

export default validationHelper;
