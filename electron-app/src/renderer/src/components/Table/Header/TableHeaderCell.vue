<template>
	<div class="tableHeaderCell" @click="onClick()" :class="{ clickable: headerModel.clickable }">
		<Transition name="fade" mode="out-in">
			<div :key="key" class="tableHeaderContent" :style="{ 'padding-left': headerModel.padding ?? '0' }">
				<span class="tableHeaderText" :class="{ hover: hoveringIcon || hoveringText }"
					@mouseover="hoveringText = true" @mouseleave="hoveringText = false">
					{{ headerModel.name }}</span>
				<span v-if="showIcon" class="iconContainer"
					:class="{ descending: headerModel.descending?.value, active: headerModel.isActive.value, hover: hoveringIcon || hoveringText }"
					@mouseover="hoveringIcon = true" @mouseleave="hoveringIcon = false">
					<ion-icon class="sortIcon" name="arrow-up-outline"></ion-icon>
				</span>
			</div>
		</Transition>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import { SortableHeaderModel } from '../../../Types/Models';

export default defineComponent({
	name: "TableHeaderCell",
	props: ["model", "backgroundColor", 'index'],
	setup(props)
	{
		const key: Ref<string> = ref('');
		const headerModel: ComputedRef<SortableHeaderModel> = computed(() => props.model);
		const background: Ref<string> = ref(props.backgroundColor);
		const showIcon: Ref<boolean> = ref(headerModel.value.clickable);

		let hoveringIcon: Ref<boolean> = ref(false);
		let hoveringText: Ref<boolean> = ref(false);

		watch(() => headerModel.value.name, () =>
		{
			key.value = Date.now().toString();
		});

		function onClick()
		{
			headerModel.value.onClick();
		}

		return {
			key,
			headerModel,
			hoveringIcon,
			hoveringText,
			background,
			showIcon,
			onClick
		}
	}
})
</script>

<style>
.tableHeaderCell {
	top: 0;
	position: sticky;
	color: white;
	text-align: left;
	user-select: none;
	padding-top: clamp(5px, 0.7vw, 20px);
	padding-bottom: clamp(5px, 0.7vw, 20px);
	transition: 0.6s;
	animation: fadeIn 1s linear forwards;
	z-index: 1;
	opacity: 1;
	width: v-bind('headerModel.width');
}

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.tableHeaderContent {
	display: flex;
	align-items: center;
}

.tableHeaderContent.padding {
	padding-left: 25px;
}

.tableHeaderText {
	opacity: 1;
	transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
	font-size: clamp(10px, 0.8vw, 18px);
}

.tableHeaderCell.clickable .tableHeaderContent .tableHeaderText {
	cursor: pointer;
}

.iconContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	opacity: 0;
	width: clamp(5px, 1vw, 20px);
	transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
	transform: rotate(0);
	cursor: pointer;
	/* margin-left: 5px; */
}

.iconContainer.active {
	opacity: 1;
}

.iconContainer.descending {
	transform: rotate(-180deg);
}

.tableHeaderText.hover,
.tableHeaderCell.clickable .tableHeaderContent .iconContainer.hover,
.tableHeaderCell.clickable .tableHeaderContent .iconContainer.active.hover {
	opacity: 0.7;
}
</style>
