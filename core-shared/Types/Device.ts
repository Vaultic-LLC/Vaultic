import { Field, IIdentifiable } from "./Fields";

export enum RequireMFAOn
{
    NoDevices,
    AllDevices,
    UnregisteredDevices
}

export enum DisplayRequireMFAOn
{
    NoDevices = "No Devices",
    AllDevices = "All Devices",
    UnregisteredDevices = "Unregistered Devices"
}

export function reuireMFAOnToDisplay(val: RequireMFAOn)
{
    switch (val)
    {
        case RequireMFAOn.NoDevices:
            return DisplayRequireMFAOn.NoDevices;
        case RequireMFAOn.AllDevices:
            return DisplayRequireMFAOn.AllDevices;
        case RequireMFAOn.UnregisteredDevices:
            return DisplayRequireMFAOn.UnregisteredDevices;
    }
}

export function displayRequireMFAOnToRequireMFAOn(val: DisplayRequireMFAOn)
{
    switch (val)
    {
        case DisplayRequireMFAOn.NoDevices:
            return RequireMFAOn.NoDevices;
        case DisplayRequireMFAOn.AllDevices:
            return RequireMFAOn.AllDevices;
        case DisplayRequireMFAOn.UnregisteredDevices:
            return RequireMFAOn.UnregisteredDevices;
    }
}

export enum RequiresMFA
{
    FollowGlobalSettings,
    True,
    False
}

export enum DisplayRequiresMFA
{
    FollowGlobalSettings = "Follow Global Settings",
    True = "True",
    False = "False"
}

export function requiresMFAToDisplay(val: RequiresMFA)
{
    switch (val)
    {
        case RequiresMFA.FollowGlobalSettings:
            return DisplayRequiresMFA.FollowGlobalSettings;
        case RequiresMFA.True:
            return DisplayRequiresMFA.True;
        case RequiresMFA.False:
            return DisplayRequiresMFA.False;
    }
}

export function displayRequiresMFAToRequiresMFA(val: DisplayRequiresMFA)
{
    switch (val)
    {
        case DisplayRequiresMFA.FollowGlobalSettings:
            return RequiresMFA.FollowGlobalSettings;
        case DisplayRequiresMFA.True:
            return RequiresMFA.True;
        case DisplayRequiresMFA.False:
            return RequiresMFA.False;
    }
}

export interface Device
{
    [key: string]: any;
    UserDesktopDeviceID?: number;
    UserMobileDeviceID?: number;
    Name: string;
    Model: string;
    Version: string;
    RequiresMFA: RequiresMFA;
}

type DeviceType = "Desktop" | "Mobile";

export interface ClientDevice extends IIdentifiable
{
    userDesktopDeviceID: Field<number | undefined>;
    userMobileDeviceID: Field<number | undefined>;
    name: Field<string>;
    model: Field<string>;
    version: Field<string>;
    type: Field<DeviceType>;
    requiresMFA: Field<RequiresMFA>;
}

export interface DeviceInfo
{
    deviceName: string;
    model: string;
    version: string;
    platform: string;
    mac: string;
}
