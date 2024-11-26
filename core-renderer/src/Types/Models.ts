import { ComputedRef, Ref, ref } from "vue";
import { defaultInputColor, defaultInputTextColor } from "./Colors";
import { Device } from "@vaultic/shared/Types/Device";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ImportableDisplayField } from "./Fields";
import { Field } from "@vaultic/shared/Types/Fields";
import { IPrimaryDataObject } from "./DataTypes";

export interface TableColumnModel 
{
    header: string;
    field: string;
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

export interface CollapsibleTableRowModel extends TableRowData
{
    data: Field<IPrimaryDataObject>;
}

export interface SingleSelectorItemModel
{
    title: Ref<string>;
    color: Ref<string>;
    isActive: Ref<boolean>;
    onClick: () => void;
}

export interface TableRowData
{
    id: string;
    isPinned?: boolean;
    values: TableRowValue[];
    atRiskModel?: AtRiskModel;
    onPin?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export interface TableRowValue
{
    component: string;
    copiable: boolean;
    width: string;
    margin?: boolean;
}

export interface AtRiskModel
{
    message: string;
    onClick?: () => void;
}

export interface TextTableRowValue extends TableRowValue
{
    value: string;
}

export interface ColorTableRowValue extends TableRowValue
{
    color: string;
}

export interface SelectableTableRowData extends TableRowData
{
    key: string;
    selectable: boolean;
    isActive?: Ref<boolean>;
    onClick?: () => Promise<void>;
}

export interface SelectorButtonModel
{
    isActive: Ref<boolean>;
    color: Ref<string>;
    onClick: () => void;
}

export interface SortableHeaderModel
{
    isActive: Ref<boolean>;
    name?: string;
    descending?: Ref<boolean>;
    clickable: boolean;
    width: string;
    padding?: string;
    centered?: boolean;
    headerSpaceRight?: string;
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

export function emptyHeader(): SortableHeaderModel
{
    return {
        isActive: ref(false),
        name: '',
        descending: ref(false),
        clickable: false,
        width: 'auto',
        padding: '0',
        onClick: () => { }
    }
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
    iconDisplayText: string;
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