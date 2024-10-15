// TODO: move into seperate types module so that this can be used anywhere that it may be needed
// Used to validate the property on an object
export const nameof = <T>(name: Extract<keyof T, string>): string => name;

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
