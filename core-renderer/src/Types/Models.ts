import { ComputedRef, Ref } from "vue";
import { defaultInputColor, defaultInputTextColor } from "./Colors";
import { Device } from "@vaultic/shared/Types/Device";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ImportableDisplayField } from "./Fields";
import { Field, IIdentifiable } from "@vaultic/shared/Types/Fields";
import { SortedCollection } from "../Objects/DataStructures/SortedCollections";

export interface ComponentSizeModel 
{
    height?: string;
    minHeight?: string;
    maxHeight?: string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
}

export interface TableColumnModel 
{
    header: string;
    field: string;
    startingWidth?: string;
    component?: string;
    isGroupIconCell?: boolean;
    data?: { [key: string]: any };
}

export interface TableRowModel
{
    id: string;
    isPinned?: boolean;
    atRiskModel?: AtRiskModel;
    backingObject?: Field<IIdentifiable & { [key: string]: any }>;
    state?: any;
}

export interface SelectableBackingObject extends IIdentifiable
{
    isActive: Field<boolean>;
}

export interface TableDataSouce 
{
    friendlyDataTypeName: string;
    collection: SortedCollection;
    pinnedCollection?: SortedCollection;
}

export interface TableDataSources 
{
    activeIndex: () => number;
    dataSources: TableDataSouce[];
}

export interface TableDataSource
{
    active: ComputedRef<boolean>;
    color: ComputedRef<string>;
    values: ComputedRef<any[]>;
    pinnedValues?: ComputedRef<any[]>;
    columns: ComputedRef<TableColumnModel[]>;
}

export interface ObjectMultiSelectOptionModel
{
    icon?: string;
    color?: string;
    label: string;
    backingObject: Field<IIdentifiable>;
}

export interface SmallMetricGaugeModel
{
    key: string;
    title: string;
    filledAmount: number;
    totalAmount: number;
    color: string;
    active: boolean;
    pulse?: boolean;
    pulseColor?: string;
    onClick: () => void;
}

export interface SingleSelectorItemModel
{
    title: Ref<string>;
    color: Ref<string>;
    isActive: Ref<boolean>;
    onClick: () => void;
}

export interface AtRiskModel
{
    message: string;
    onClick?: () => void;
}

export interface SelectorButtonModel
{
    isActive: Ref<boolean>;
    color: Ref<string>;
    onClick: () => void;
}

export interface HeaderTabModel
{
    name: string;
    active: ComputedRef<boolean>;
    color: ComputedRef<string>;
    size?: 'small' | 'regular';
    onClick?: () => void;
}

export interface GridDefinition
{
    rows: number;
    rowHeight: string;
    columns: number;
    columnWidth: string;
}

export interface GroupIconModel
{
    icon: string;
    toolTipText: string;
    color: string;
}

export interface InputColorModel
{
    color: string;
    textColor: string;
    activeTextColor: string;
    borderColor: string;
    activeBorderColor: string;
}

export function defaultInputColorModel(color: string): InputColorModel
{
    return {
        color: color,
        textColor: defaultInputTextColor,
        activeTextColor: color,
        borderColor: defaultInputColor,
        activeBorderColor: color
    }
}

export enum AccountSetupView
{
    NotSet,
    SignIn,
    CreateAccount,
    SetupPayment,
    UpdatePayment,
    ReActivate,
    CreateMasterKey,
    DownloadDeactivationKey
}

export interface AccountSetupModel
{
    currentView: AccountSetupView;
    updateDevicesLeft?: number;
    devices?: Device[];
    infoMessage?: string;
    reloadAllDataIsToggled?: boolean;
}

export interface ButtonModel
{
    text: string;
    onClick: () => void;
}

interface ToggleRadioButton
{
    text: string;
    active: boolean;
}

export interface ToggleRadioButtonModel
{
    buttonOne: ToggleRadioButton;
    buttonTwo: ToggleRadioButton;
}

export interface CSVHeaderPropertyMapperModel
{
    property: ImportableDisplayField;
    csvHeader: string | undefined;
}

export interface TreeNodeModel
{
    id: number;
    text: string;
    depth: number;
    icon?: string;
    selected: ComputedRef<boolean>;
    isParent: boolean;
    display: boolean;
    buttons: TreeNodeButton[];
    data: Dictionary<any>;
    onClick: () => void;
}

export interface TreeNodeButton 
{
    icon: string;
    onClick: (data: Dictionary<any>) => Promise<any>;
}

export interface Account
{
    firstName: string;
    lastName: string;
    email: string;
    masterKey: string;
}