import { Ref, ref } from "vue";
import { v4 as uuidv4 } from 'uuid';

export interface SmallMetricGaugeModel
{
    key: string;
    title: string;
    filledAmount: number;
    totalAmount: number;
    color: string;
    style?: { [style: string]: string; };
    active: boolean;
    onClick: () => void;
}

export interface CollapsibleTableRowModel extends TableRowData
{
    data: any;
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
    values: TableRowValues[];
    atRiskMessage?: string;
    onPin?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export interface TableRowValues 
{
    value: string;
    copiable: boolean;
    width: string;
}

export interface SelectableTableRowData extends TableRowData
{
    key: string;
    selectable: boolean;
    isActive?: Ref<boolean>;
    onClick?: () => void;
}

export interface SelectorButtonModel 
{
    isActive: Ref<boolean>;
    color: Ref<string>;
    onClick: () => void;
}

export interface ObjectSelectorInputFieldModel
{
    text: string;
    selectorButtonModel: SelectorButtonModel;
}

export interface SortableHeaderModel
{
    id: string;
    isActive: Ref<boolean>;
    name?: string;
    descending?: boolean;
    clickable: boolean;
    width: string;
    onClick: () => void;
}

export interface HeaderTabModel 
{
    id: string;
    name: string;
}

export function emptyHeader(): SortableHeaderModel
{
    return {
        id: uuidv4(),
        isActive: ref(false),
        name: '',
        descending: false,
        clickable: false,
        width: 'auto',
        onClick: () => { }
    }
}

export interface AtRiskModel
{
    title: string;
    checked: boolean;
    message: string;
}

export interface GridDefinition
{
    rows: number;
    rowHeight: string;
    columns: number;
    columnWidth: string;
}