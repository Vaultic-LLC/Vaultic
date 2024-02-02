<template>
	<tr class="tableRow"
		:class="{ clickable: clickable, pinned: isPinned, zIndexing: zIndexing, deletingRow: deletingRow }">
		<slot></slot>
		<component v-for="(rowValue, index) in tableRowData.values" :key="index" :is="rowValue.component" :model="rowValue"
			:color="color" />
		<td class="gapRow" :style="{ 'width': 'auto' }"></td>
		<td v-if="allowPin || allowEdit || allowDelete" class="gapData"></td>
		<td v-if="!hideAtRiskCell" class="tableRowIconCell" :class="{ hideCell: !tableRowData.atRiskMessage }">
			<AtRiskIndicator :color="color" :message="tableRowData.atRiskMessage" />
		</td>
		<td v-if="allowPin" @click.stop="onPin" class="magnetCell tableRowIconCell">
			<ion-icon class="rowIcon magnet" name="magnet-outline"></ion-icon>
		</td>
		<td v-if="allowEdit" @click.stop="onEdit" class="tableRowIconCell">
			<ion-icon class="rowIcon edit" name="create-outline"></ion-icon>
		</td>
		<td v-if="allowDelete" @click.stop="onDelete" class="tableRowIconCell">
			<ion-icon class="rowIcon delete" name="trash-outline"></ion-icon>
		</td>
	</tr>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, Ref, ref } from 'vue';

import AtRiskIndicator from '../AtRiskIndicator.vue';
import TableRowTextValue from './TableRowTextValue.vue';
import TableRowColorValue from './TableRowColorValue.vue';

import { TableRowData } from '../../../Types/Models';
import { stores } from '../../../Objects/Stores/index';
import { ColorPalette } from '../../..//Types/Colors';
import clipboard from 'clipboardy';
import { ShowToastFunctionKey } from '../../../Types/Keys';

export default defineComponent({
	name: "TableRow",
	components:
	{
		AtRiskIndicator,
		TableRowTextValue,
		TableRowColorValue
	},
	props: ["model", "rowNumber", "color", "allowPin", "allowEdit", "allowDelete",
		'clickable', 'hideAtRisk', 'zIndexing', 'animateDelete'],
	setup(props)
	{
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		const tableRowData: ComputedRef<TableRowData> = computed(() => props.model);
		const isPinned: Ref<boolean> = ref(tableRowData.value.isPinned ?? false);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const rowNumb: ComputedRef<number> = computed(() => props.rowNumber);
		const rowColor: ComputedRef<string> = computed(() => rowNumb.value % 2 == 0 ? "" : "#0f111d");
		const animationDelay: Ref<string> = ref('');
		setAnimationDelay(rowNumb.value);
		const hideAtRiskCell: ComputedRef<boolean> = computed(() => props.hideAtRisk === true);
		const deletingRow: Ref<boolean> = ref(false);

		const showToastFunction: { (title: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		function setAnimationDelay(numb: number)
		{
			animationDelay.value = `${(numb % stores.settingsStore.rowChunkAmount) / 8}s`;
		}

		function onPin()
		{
			// make the animation delay very short or else pinning a row that is further down will take a while to show up
			setAnimationDelay(1);

			isPinned.value = !isPinned.value;
			if (tableRowData.value.onPin)
			{
				tableRowData.value.onPin();
			}

			// reset animation delay in case the table is re rendered (filter, sorting, etc.)
			setTimeout(() => setAnimationDelay(rowNumb.value), 800);
		}

		function onEdit()
		{
			if (tableRowData.value.onEdit)
			{
				tableRowData.value.onEdit();
			}
		}

		function onDelete()
		{
			if (props.animateDelete == true)
			{
				deletingRow.value = true;
				setTimeout(() =>
				{
					if (tableRowData.value.onDelete)
					{
						tableRowData.value.onDelete();
					}
				}, 350);
			}
			else
			{
				if (tableRowData.value.onDelete)
				{
					tableRowData.value.onDelete();
				}
			}
		}

		function copyText(text: string)
		{
			clipboard.write(text);
			showToastFunction("Copied to Clipboard", true);
		}

		return {
			currentColorPalette,
			tableRowData,
			isPinned,
			primaryColor,
			rowColor,
			animationDelay,
			hideAtRiskCell,
			deletingRow,
			onPin,
			onEdit,
			onDelete,
			copyText
		};
	},
})
</script>
<style>
.tableRow {
	position: relative;
	width: 80%;
	opacity: 0;
	animation: fadeIn 1s linear forwards;
	animation-delay: v-bind(animationDelay);
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	transition: box-shadow 0.3s;

	border: 10px solid transparent;
	/* background-color: #121a20; */
}

.tableRow.zIndexing {
	z-index: calc(999999 - v-bind(rowNumber));
}

.tableRow.shadow.pinned {
	border: 10px solid v-bind(primaryColor);
	box-shadow: 0 0px 10px v-bind(primaryColor);
}

.tableRow.clickable {
	cursor: pointer;
}

.tableRow.shadow {
	transition: 0.3s;
	/* box-shadow: -5px 5px 10px #070a0c,
		5px -5px 10px #1b2630; */
	/* background: rgb(44 44 51 / 16%); */
}

.tableRow.isOpen {
	border-bottom-right-radius: 0;
	/* box-shadow: 5px -5px 10px #1b2630; */
	box-shadow: -5px 5px 10px #070a0c,
		5px -5px 10px #1b2630;
}

.tableRow.deletingRow {
	animation: 0.3s deleteRow linear;
}

@keyframes rotate {
	0% {
		--angle: 0deg;
	}

	100% {
		--angle: 360deg;
	}
}

@keyframes deleteRow {
	0% {
		opacity: 1;
	}

	99% {
		opacity: 0;
	}

	100% {
		display: none;
	}
}

.tableRow.hover:hover {
	transition: 0.3s;
	border: 10px solid v-bind(primaryColor);
	box-shadow: 0 0px 10px v-bind(primaryColor);
	/* transform: scale(1.01, 1.1); */
	/* animation: rowHover 2s linear forwards; */
}

@keyframes rowHover {
	0% {
		border: 10px solid transparent;
	}

	100% {
		border: 10px solid v-bind(primaryColor);
	}
}

.tableRow td {
	color: white;
	text-align: left;
	z-index: 2;
}

.tableRow td.hideCell {
	opacity: 0;
}

.tableRow .groupCell {
	display: flex;
	height: inherit;
	width: 100px;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	flex-wrap: wrap;
}

.tableRow .rowIcon {
	color: white;
	transition: 0.3s;
	font-size: 28px;
	cursor: pointer;
}

.tableRow .rowIcon:hover {
	transform: scale(1.1);
}

.tableRow .rowIcon.magnet {
	transform: rotate(134deg)
}

.tableRow.pinned .rowIcon.magnet {
	color: v-bind(primaryColor);
}

.tableRow .rowIcon.magnet:hover {
	color: v-bind(primaryColor);
	transform: rotate(134deg) scale(1.05);
}

.tableRow .rowIcon.edit:hover {
	color: v-bind(primaryColor);
}

.tableRow .rowIcon.delete:hover {
	color: v-bind('color');
}

.rowValue {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	width: 100px;
}

.rowValue .rowValueValue {
	overflow: hidden;
	text-overflow: ellipsis;
}

.rowValue .copyIcon {
	color: white;
	transition: 0.3s;
	font-size: 20px;
	cursor: pointer;
	transform: translate(50%, -50%);
}

.rowValue .copyIcon:hover {
	color: v-bind(primaryColor);
	transform: translate(50%, -50%) scale(1.1);
}

.tableRow .tableRowIconCell {
	text-align: center;
	width: 10%
}
</style>
