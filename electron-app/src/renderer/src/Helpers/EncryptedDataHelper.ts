export function isWeak(value: string, type: string): [boolean, string]
{
    if (value.length < 16)
    {
        return [true, type + ` is less than 16 characters. For best security, create ${type}s that are at least 16 characters long.`];
    }
    else if (!containsUppercaseAndLowercaseNumber(value))
    {
        return [true, type + " does not contain and uppercase and lowercase letter. For best security, add an uppercase and lowercase letter to your " + type];
    }
    else if (!containsNumber(value))
    {
        return [true, type + " does not contain any numbers. For best security, add at least one number to your " + type];
    }
    else 
    {
        if (!containsSpecialCharacter(value))
        {
            return [true, type + " does not contain any special characters. For best security, add at least one special character to your " + type];
        }
    }

    return [false, ""];
}

export function containsNumber(value: string): boolean
{
    return /\d/.test(value);
}

export function containsSpecialCharacter(value: string): boolean
{
    const specialCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/;
    return specialCharacters.test(value);
}

export function containsUppercaseAndLowercaseNumber(value: string): boolean
{
    return /[A-Z]/.test(value) && /[a-z]/.test(value);
}