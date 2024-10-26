// TODO: switch to Map
export interface Dictionary<T>
{
    [Key: string]: T;
}

export interface NumberDictionary<T>
{
    [key: number]: T;
}