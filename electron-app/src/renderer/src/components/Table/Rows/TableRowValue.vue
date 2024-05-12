<template>
	<td class="tableCell">
		<div class="rowValue" :style="{ 'width': rowValue.width }">
			<slot></slot>
			<div v-if="rowValue.copiable" class="copyIcon" @click.stop="copyText(rowValue.value)">
				<ion-icon name="clipboard-outline"></ion-icon>
			</div>
		</div>
	</td>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import { TextTableRowValue } from '../../../Types/Models';
import clipboard from 'clipboardy';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "TableRowValue",
	props: ["model", "color"],
	setup(props)
	{
		const rowValue: ComputedRef<TextTableRowValue> = computed(() => props.model);
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		function copyText(text: string)
		{
			clipboard.write(text);
			stores.popupStore.showToast(primaryColor.value, "Copied to Clipboard", true);
		}

		return {
			rowValue,
			primaryColor,
			copyText
		};
	},
})
</script>
<style>
.tableCell {
	padding: 0;
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
	font-size: clamp(13px, 1.2vw, 25px);
	cursor: pointer;
	transform: translate(50%, -50%);
}

.rowValue .copyIcon:hover {
	color: v-bind(primaryColor);
	transform: translate(50%, -50%) scale(1.1);
}
</style>
