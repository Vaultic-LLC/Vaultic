import { ComputedRef, Ref, ref } from "vue";
import { v4 as uuidv4 } from 'uuid';
import { defaultInputColor, defaultInputTextColor } from "./Colors";

export interface SmallMetricGaugeModel
{
	key: string;
	title: string;
	filledAmount: number;
	totalAmount: number;
	color: string;
	style?: { [style: string]: string; };
	active: boolean;
	pulse?: boolean;
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
	values: TableRowValue[];
	atRiskMessage?: string;
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
	descending?: Ref<boolean>;
	clickable: boolean;
	width: string;
	onClick: () => void;
}

export interface HeaderTabModel
{
	id: string;
	name: string;
	active: ComputedRef<boolean>;
	color: ComputedRef<string>;
	size?: 'small' | 'regular';
	onClick?: () => void;
}

export function emptyHeader(): SortableHeaderModel
{
	return {
		id: uuidv4(),
		isActive: ref(false),
		name: '',
		descending: ref(false),
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
