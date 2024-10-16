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