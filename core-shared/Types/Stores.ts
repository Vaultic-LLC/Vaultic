import { defaultColorPalettes, emptyUserColorPalettes } from "./Color";
import { Field, FieldedObject, FieldTreeUtility, IFieldedObject } from "./Fields";

export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Field<Map<string, Field<Map<string, Field<string>>>>>;
};

export type VaultStoreStates = "vaultStoreState" | "passwordStoreState" | "valueStoreState" | "filterStoreState" | "groupStoreState";

export class CurrentAndSafeStructure extends FieldedObject
{
    current: Field<Map<string, Field<number>>>;
    safe: Field<Map<string, Field<number>>>;

    constructor()
    {
        super();

        this.id = Field.create("");
        this.current = Field.create(new Map());
        this.safe = Field.create(new Map());
    }
}

export enum AutoLockTime
{
    OneMinute = "1 Minute",
    FiveMinutes = "5 Minuts",
    FifteenMinutes = "15 Minutes",
    ThirtyMinutes = "30 Minutes"
}

export enum FilterStatus
{
    And = "And",
    Or = "Or"
}

export interface PinnedDataTypes extends IFieldedObject
{
    pinnedFilters: Field<Map<string, Field<string>>>;
    pinnedGroups: Field<Map<string, Field<string>>>;
    pinnedPasswords: Field<Map<string, Field<string>>>;
    pinnedValues: Field<Map<string, Field<string>>>;
}

export const defaultAppStoreState = FieldTreeUtility.setupIDs({
    id: Field.create(""),
    version: Field.create(0),
    settings: Field.create({
        id: Field.create(""),
        userColorPalettes: Field.create(emptyUserColorPalettes),
        autoLockTime: Field.create(AutoLockTime.OneMinute),
        multipleFilterBehavior: Field.create(FilterStatus.Or),
        oldPasswordDays: Field.create(365),
        percentMetricForPulse: Field.create(1),
        randomValueLength: Field.create(25),
        randomPhraseLength: Field.create(7),
        includeNumbersInRandomPassword: Field.create(true),
        includeSpecialCharactersInRandomPassword: Field.create(true),
        includeAmbiguousCharactersInRandomPassword: Field.create(true),
        passphraseSeperator: Field.create('-'),
        temporarilyStoreMasterKey: Field.create(true)
    })
});

export const defaultUserPreferencesState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    currentColorPalette: defaultColorPalettes.entries().next().value![1],
    pinnedDataTypes: Field.create(new Map<number, Field<PinnedDataTypes>>()),
    pinnedDesktopDevices: Field.create(new Map()),
    pinnedMobileDevices: Field.create(new Map()),
    pinnedOrganizations: Field.create(new Map())
});

export const defaultVaultStoreState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    settings: Field.create(
        {
            id: Field.create(""),
            loginRecordsToStorePerDay: Field.create(13),
            numberOfDaysToStoreLoginRecords: Field.create(30)
        }),
    loginHistory: Field.create(new Map<number, Field<number>>())
});

export const defaultPasswordStoreState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    passwordsByID: Field.create(new Map<string, Field<any>>()),
    passwordsByDomain: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
    duplicatePasswords: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
    currentAndSafePasswords: Field.create(new CurrentAndSafeStructure()),
    passwordsByHash: Field.create(new Map<string, Field<Map<string, Field<string>>>>())
});

export const defaultValueStoreState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    valuesByID: Field.create(new Map<string, Field<any>>()),
    duplicateValues: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
    currentAndSafeValues: Field.create(new CurrentAndSafeStructure()),
    valuesByHash: Field.create(new Map<string, Field<Map<string, Field<string>>>>())
});

export const defaultFilterStoreState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    passwordFiltersByID: Field.create(new Map<string, Field<any>>()),
    valueFiltersByID: Field.create(new Map<string, Field<any>>()),
    emptyPasswordFilters: Field.create(new Map<string, Field<string>>()),
    emptyValueFilters: Field.create(new Map<string, Field<string>>()),
    duplicatePasswordFilters: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
    duplicateValueFilters: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
});

export const defaultGroupStoreState = FieldTreeUtility.setupIDs({
    version: Field.create(0),
    passwordGroupsByID: Field.create(new Map<string, Field<any>>()),
    valueGroupsByID: Field.create(new Map<string, Field<any>>()),
    emptyPasswordGroups: Field.create(new Map<string, Field<string>>()),
    emptyValueGroups: Field.create(new Map<string, Field<string>>()),
    duplicatePasswordGroups: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
    duplicateValueGroups: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
});