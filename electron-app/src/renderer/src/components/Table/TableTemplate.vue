<template>
	<div class="tableContainer" ref="tableContainer" :class="{ small: scrollbarSize == 0, medium: scrollbarSize == 1 }"
		@scroll="checkScrollHeight">
		<table class="tableContent">
			<slot name="header"></slot>
			<slot name="body">
			</slot>
		</table>
	</div>
</template>

<script lang="ts">
import { stores } from '../../Objects/Stores';
import { computed, ComputedRef, defineComponent, onMounted, onUpdated, Ref, ref, watch } from 'vue';

export default defineComponent({
	name: "TableTemplate",
	emits: ['scrolledToBottom'],
	props: ['color', 'scrollbarSize', 'rowGap'],
	setup(props, ctx)
	{
		const tableContainer: Ref<HTMLElement | null> = ref(null);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const rowGapValue: ComputedRef<string> = computed(() => `${props.rowGap}px`);

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
			checkScrollHeight,
			scrollToTop
		}
	},
})
</script>

<style scoped>
.tableContainer {
	position: absolute;
	overflow-x: hidden;
	border-radius: 20px;
	margin-left: auto;
	margin-right: 1.1%;

	direction: rtl;

	overflow-y: scroll;
	/* background: linear-gradient(145deg, #121a20, #0f161b); */
}

.tableContainer.small {
	border-radius: 10px;
}

.tableContainer.medium {
	border-radius: 20px;
}

.tableContainer.shadow {
	background-color: #121a20;
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630;
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
	transition: 0.6s;
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableContainer.scrollbar::-webkit-scrollbar-thumb {
	transition: 0.6s;
	background: v-bind(primaryColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}
</style>
