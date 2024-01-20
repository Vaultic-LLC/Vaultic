<template>
	<div class="tableTemplate">
		<div class="tableTemplate__header">
			<slot name="header"></slot>
		</div>
		<div class="tableContainer scrollbar" ref="tableContainer"
			:class="{ small: scrollbarSize == 0, medium: scrollbarSize == 1 }" @scroll="checkScrollHeight">
			<table class="tableContent">
				<!-- Just used to force table row cell widths -->
				<tr>
					<th v-for="(header, index) in headers" :key="index" :style="{ width: header.width, height: 0 }"></th>
				</tr>
				<slot name="body">
				</slot>
			</table>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, onUpdated, Ref, ref, watch } from 'vue';

import { SortableHeaderModel } from '@renderer/Types/Models';
import { stores } from '../../Objects/Stores';

export default defineComponent({
	name: "TableTemplate",
	emits: ['scrolledToBottom'],
	props: ['color', 'scrollbarSize', 'rowGap', 'headerModels'],
	setup(props, ctx)
	{
		const tableContainer: Ref<HTMLElement | null> = ref(null);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const rowGapValue: ComputedRef<string> = computed(() => `${props.rowGap}px`);
		const headers: ComputedRef<SortableHeaderModel[]> = computed(() => props.headerModels);

		let scrollbarColor: Ref<string> = ref(primaryColor.value);
		function calcScrollbarColor()
		{
			if (!primaryColor?.value)
			{
				return;
			}

			if (tableContainer.value?.scrollHeight && tableContainer.value.clientHeight)
			{
				if (tableContainer.value?.scrollHeight <= tableContainer.value?.clientHeight)
				{
					scrollbarColor.value = primaryColor.value;
				}
				else
				{
					scrollbarColor.value = '#0f111d';
				}
			}
		}

		let lastCallTime: number = 0;
		function checkScrollHeight()
		{
			const debounce: number = 100;
			if (Date.now() - lastCallTime < debounce)
			{
				return;
			}

			const loadMoreRowsThreshold: number = Math.max(1 / (0.000009 * ((tableContainer.value?.scrollHeight ?? 2) - (tableContainer.value?.offsetHeight ?? 1))), 200);
			if (!tableContainer.value?.offsetHeight || (tableContainer.value?.scrollTop + loadMoreRowsThreshold) >= (tableContainer.value?.scrollHeight - tableContainer.value?.offsetHeight))
			{
				ctx.emit('scrolledToBottom');
			}

			lastCallTime = Date.now();
		}

		function scrollToTop()
		{
			if (tableContainer.value)
			{
				tableContainer.value.scrollTop = 0;
			}
		}

		watch(() => primaryColor.value, () =>
		{
			calcScrollbarColor();
		});

		// we want to resize after authenticating since we are going from hidden to visible
		watch(() => stores.appStore.reloadMainUI, (newValue) =>
		{
			if (newValue)
			{
				calcScrollbarColor();
			}
		});

		onMounted(() =>
		{
			calcScrollbarColor();
		})

		onUpdated(() =>
		{
			calcScrollbarColor();
		});

		return {
			tableContainer,
			primaryColor,
			scrollbarColor,
			rowGapValue,
			headers,
			checkScrollHeight,
			scrollToTop
		}
	},
})
</script>

<style scoped>
.tableTemplate {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	border-top-right-radius: 20px;
	border-top-left-radius: 20px;
}

.tableTemplate__header {
	width: calc(100% - 10px);
	border-top-right-radius: 20px;
	border-top-left-radius: 20px;
}

.tableContainer {
	overflow-x: hidden;
	margin-left: auto;
	margin-right: 1.1%;
	direction: rtl;
	overflow-y: scroll;
	width: 100%;
	height: 90%;
	background-color: rgb(44 44 51 / 16%);
	border-bottom-left-radius: 20px;
	border-bottom-right-radius: 20px;
}

.tableContainer.small {
	border-bottom-left-radius: 10px;
	border-bottom-right-radius: 10px;
}

.tableContainer.medium {
	border-bottom-left-radius: 20px;
	border-bottom-right-radius: 20px;
}

.tableContainer.shadow {
	/* background-color: #121a20;
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630; */
	background-color: rgb(44 44 51 / 16%);
}

.tableContainer.border {
	border: 3px solid v-bind(primaryColor);
}

.tableContent {
	margin-left: auto;
	margin-right: 2%;
	border-spacing: 0 v-bind(rowGapValue);

	width: 98%;
	direction: ltr;

	border-collapse: separate;
	/* border-spacing: 10px; */
}

.tableContainer.small::-webkit-scrollbar {
	width: 5px;
}

.tableContainer.medium::-webkit-scrollbar {
	width: 10px;
}

.tableContainer.border::-webkit-scrollbar-track {
	background: transparent;
}

.tableContainer.scrollbar::-webkit-scrollbar-track {
	transition: 0.3s;
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableContainer.scrollbar::-webkit-scrollbar-thumb {
	transition: 0.3s;
	background: v-bind(primaryColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}
</style>
