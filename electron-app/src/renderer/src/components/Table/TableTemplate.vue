<template>
	<div class="tableTemplate">
		<div class="tableTemplate__header">
			<slot name="header"></slot>
		</div>
		<div class="tableContainer scrollbar" ref="tableContainer"
			:class="{ small: scrollbarSize == 0, medium: scrollbarSize == 1, border: applyBorder }"
			@scroll="checkScrollHeight">
			<table class="tableContent">
				<!-- Just used to force table row cell widths -->
				<tr v-if="headers.length > 0">
					<th v-for="(header, index) in headers" :key="index" :style="{ width: header.width, height: 0 }">
					</th>
				</tr>
				<slot name="body">
				</slot>
			</table>
			<Transition name="fade" mode="out-in">
				<div v-if="showEmptyMessage == true" class="tableContainer__emptyMessageContainer">
					<Transition name="fade" mode="out-in">
						<div :key="key" class="tableContainer__emptyMessage">
							{{ emptyMessage }}
						</div>
					</Transition>
				</div>
			</Transition>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, onUpdated, Ref, ref, watch } from 'vue';

import { SortableHeaderModel } from '@renderer/Types/Models';
import { widgetBackgroundHexString } from '@renderer/Constants/Colors';
import { RGBColor } from '@renderer/Types/Colors';
import { hexToRgb } from '@renderer/Helpers/ColorHelper';
import { tween } from '@renderer/Helpers/TweenHelper';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "TableTemplate",
	emits: ['scrolledToBottom'],
	props: ['color', 'scrollbarSize', 'rowGap', 'headerModels', 'border', 'showEmptyMessage', 'emptyMessage', 'backgroundColor'],
	setup(props, ctx)
	{
		const resizeObserver: ResizeObserver = new ResizeObserver(calcScrollbarColor);
		const key: Ref<string> = ref('');
		const tableContainer: Ref<HTMLElement | null> = ref(null);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const rowGapValue: ComputedRef<string> = computed(() => props.rowGap ?? "0px");
		const headers: ComputedRef<SortableHeaderModel[]> = computed(() => props.headerModels ?? []);
		const applyBorder: ComputedRef<boolean> = computed(() => props.border == true);
		const backgroundColor: ComputedRef<string> = computed(() => props.backgroundColor ? props.backgroundColor : widgetBackgroundHexString());

		let scrollbarColor: Ref<string> = ref(primaryColor.value);
		let thumbColor: Ref<string> = ref(primaryColor.value);

		let lastColor: Ref<string> = ref(primaryColor.value);
		let lastScrollHeight: number = Number.MAX_VALUE;
		function calcScrollbarColor()
		{
			if (!primaryColor?.value)
			{
				return;
			}

			if (tableContainer.value?.scrollHeight && tableContainer.value.clientHeight)
			{
				const from: RGBColor | null = hexToRgb(lastColor.value);
				const to: RGBColor | null = hexToRgb(primaryColor.value);
				stores.settingsStore.currentPrimaryColor.value;
				if (tableContainer.value?.scrollHeight <= tableContainer.value?.clientHeight)
				{
					scrollbarColor.value = lastColor.value;
					tween<RGBColor>(from!, to!, 500, (object) =>
					{
						scrollbarColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
					});
				}
				else
				{
					if (primaryColor.value != lastColor.value || tableContainer.value?.scrollHeight < lastScrollHeight ||
						tableContainer.value?.scrollHeight > lastScrollHeight)
					{
						thumbColor.value = lastColor.value;
						tween<RGBColor>(from!, to!, 500, (object) =>
						{
							thumbColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
						});

						// only transition the scrollbar if there was no thumb aka if it took up the full track, otherwise it'll
						// flash the from color
						if (primaryColor.value != lastColor.value && tableContainer.value?.clientHeight == lastScrollHeight)
						{
							tween<RGBColor>(from!, hexToRgb('#0f111d')!, 500, (object) =>
							{
								scrollbarColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
							});
						}
						else
						{
							scrollbarColor.value = '#0f111d';
						}
					}
				}

				lastScrollHeight = tableContainer.value?.scrollHeight;
			}

			lastColor.value = primaryColor.value;
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

		// we want to resize after authenticating since we are going from hidden to visible
		// watch(() => stores.appStore.reloadMainUI, (newValue) =>
		// {
		// 	if (newValue)
		// 	{
		// 		calcScrollbarColor();
		// 	}
		// });

		watch(() => props.emptyMessage, () =>
		{
			key.value = Date.now().toString();
		});

		onMounted(() =>
		{
			if (tableContainer.value)
			{
				resizeObserver.observe(tableContainer.value);
			}
		});

		onUpdated(() =>
		{
			calcScrollbarColor();
		});

		return {
			key,
			tableContainer,
			primaryColor,
			scrollbarColor,
			thumbColor,
			rowGapValue,
			headers,
			applyBorder,
			backgroundColor,
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
	position: relative;
	overflow-x: hidden;
	margin-left: auto;
	margin-right: 1.1%;
	direction: rtl;
	overflow-y: scroll;
	width: 100%;
	height: 100%;
	background-color: v-bind(backgroundColor);
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

.tableContainer.border {
	border-bottom: 3px solid v-bind(color);
	border-right: 3px solid v-bind(color);
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
	background: v-bind(thumbColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableContainer__emptyMessageContainer {
	position: absolute;
	width: 80%;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -60%);
}

.tableContainer__emptyMessage {
	color: grey;
	font-size: clamp(12px, 1.4vw, 24px);
	text-align: center;
}
</style>
