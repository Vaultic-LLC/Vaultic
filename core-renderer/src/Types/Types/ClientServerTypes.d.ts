export interface Session {
    Token?: string;
    Hash?: string;
}
export interface UserDataBreach {
    UserDataBreachID: number;
    PasswordID: string;
    BreachedDate: number;
    PasswordsWereBreached: boolean;
    BreachedDataTypes: string;
}
export interface ChartData {
    Y: number[];
    DataX: number[];
    TargetX: number[];
    Max: number;
}
export declare enum LicenseStatus {
    NotActivated = 0,
    Active = 1,
    Inactive = 2,
    Cancelled = 3,
    Unknown = 4
}
