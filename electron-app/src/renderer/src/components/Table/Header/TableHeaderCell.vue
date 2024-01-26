<template>
	<div class="tableHeaderCell" @click="onClick()" :class="{ clickable: headerModel.clickable }">
		<div class="tableHeaderContent">
			<span v-if="showIcon" class="iconContainer"
				:class="{ descending: descending, active: isActive, hover: hoveringIcon || hoveringText }"
				@mouseover="hoveringIcon = true" @mouseleave="hoveringIcon = false">
				<ion-icon class="sortIcon" name="arrow-up-outline"></ion-icon>
			</span>
			<span class="tableHeaderText" :class="{ hover: hoveringIcon || hoveringText }" @mouseover="hoveringText = true"
				@mouseleave="hoveringText = false">{{
					headerModel.name }}</span>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import { SortableHeaderModel } from '../../../Types/Models';

export default defineComponent({
	name: "TableHeaderCell",
	props: ["model", "backgroundColor"],
	setup(props)
	{
		const headerModel: ComputedRef<SortableHeaderModel> = computed(() => props.model);
		const isActive: Ref<boolean> = ref(headerModel.value.isActive);
		const descending: Ref<boolean> = ref(headerModel.value.descending ?? true)
		const background: Ref<string> = ref(props.backgroundColor);
		const showIcon: Ref<boolean> = ref(headerModel.value.clickable);

		let hoveringIcon: Ref<boolean> = ref(false);
		let hoveringText: Ref<boolean> = ref(false);

		watch(() => headerModel.value.isActive, (newValue) =>
		{
			if (typeof newValue !== "boolean")
			{
				isActive.value = newValue.value;
			}
			else
			{
				isActive.value = (newValue as boolean);
			}
		});

		function onClick()
		{
			if (!headerModel.value.clickable)
			{
				return;
			}

			if (isActive.value)
			{
				headerModel.value.descending = !headerModel.value.descending
				descending.value = headerModel.value.descending;
			}

			headerModel.value.onClick();
		}

		return {
			headerModel,
			isActive,
			descending,
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
	padding-top: 20px;
	padding-bottom: 20px;
	transition: 0.6s;
	animation: fadeIn 1s linear forwards;
	z-index: 1;
	/* background-color: v-bind(background); */
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

.tableHeaderText {
	opacity: 1;
	transform: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}

.tableHeaderCell.clickable .tableHeaderContent .tableHeaderText {
	cursor: pointer;
}

.iconContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	opacity: 0;
	width: 20px;
	transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
	transform: rotate(0);
	margin-left: 5px;
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
