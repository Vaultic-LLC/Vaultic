// Used to validate the property on an object
export const nameof = <T>(name: Extract<keyof T, string>): string => name;

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

type WrapNonPromiseInPromise<T> = T extends Promise<any> ? T : Promise<T>;

export type Promisify<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any
    ? (...args: Parameters<T[K]>) => WrapNonPromiseInPromise<ReturnType<T[K]>>
    : T[K]
};

function isOnlyWhitespace(str: string)
{
    return !str.replace(/\s/g, '').length
}

/**
 * Used to check if primitive has a value. Can't use just '!' since that would give false negatives
 * for booleans
 * @param val The value to check
 * @returns True if val isn't null or undefined
 */
export function hasValue<T extends string | number | boolean>(val?: T): boolean
{
    if (typeof val === 'string')
    {
        return val != null && val != undefined && val !== '' && !isOnlyWhitespace(val);
    }

    return val != null && val != undefined;
}