// Used to validate the property on an object
export const nameof = <T>(name: Extract<keyof T, string>): string => name;

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
