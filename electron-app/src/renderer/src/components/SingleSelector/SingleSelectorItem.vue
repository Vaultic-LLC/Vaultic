<template>
	<div class="tableSelectorButton" @click="selectorItem.onClick()"
		:class="{ active: selectorItem.isActive.value, first: isFirst, last: isLast }">
		<Transition name="fade" mode="out-in">
			<h2 class="tableSelectorButtonText">
				{{ selectorItem.title.value }}
			</h2>
		</Transition>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { SingleSelectorItemModel } from '../../Types/Models'
import { getLinearGradientFromColor } from '@renderer/Helpers/ColorHelper';

export default defineComponent({
	name: "TableSelector",
	props: ["item", "isFirst", "isLast"],
	setup(props)
	{
		const selectorItem: ComputedRef<SingleSelectorItemModel> = computed(() => props.item);
		const backgroundColor: ComputedRef<string> = computed(() => getLinearGradientFromColor(selectorItem.value.color.value));

		return {
			selectorItem,
			backgroundColor
		}
	}
})
</script>

<style>
.tableSelectorButton {
	width: 50%;
	display: flex;
	position: relative;
	overflow: hidden;
	animation: tableSelectorOneNotHover .2s linear forwards;
}

.tableSelectorButton.first {
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableSelectorButton.last {
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
}

.tableSelectorButton .tableSelectorButtonText {
	margin: auto;
	color: white;
	user-select: none;
}

.tableSelectorButton:hover {
	animation: tableSelectorOneHover .2s linear forwards;
}

.tableSelectorButton.active {
	transition: 0.6s;
	background: v-bind(backgroundColor);
}

@keyframes tableSelectorOneHover {

	0% {
		/* border: 5px solid transparent; */
		box-shadow: 0 0 0 v-bind('selectorItem.color.value');
	}

	100% {
		/* border: 5px solid v-bind('selectorItem.color.value'); */
		box-shadow: 0 0 25px v-bind('selectorItem.color.value');
	}
}

@keyframes tableSelectorOneNotHover {
	0% {
		/* border: 5px solid v-bind('selectorItem.color.value'); */
		box-shadow: 0 0 25px v-bind('selectorItem.color.value');
	}

	100% {
		/* border: 5px solid transparent; */
		box-shadow: 0 0 0 v-bind('selectorItem.color.value');
	}
}
</style>
