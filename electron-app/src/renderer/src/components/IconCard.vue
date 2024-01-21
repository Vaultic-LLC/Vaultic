<template>
	<div class="iconCardContainer">
		<div class="iconCardContainer__items">
			<ion-icon class="iconCardContainer__icon" :name="icon"></ion-icon>
			<div class="iconCardContainer__text">{{ text }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import { getLinearGradientFromColor, mixHexes } from '@renderer/Helpers/ColorHelper';
import { stores } from '@renderer/Objects/Stores';
import { ComputedRef, computed, defineComponent } from 'vue';

export default defineComponent({
	name: "IconCard",
	props: ['icon', 'text'],
	setup()
	{
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(color.value));
		const mixedColor: ComputedRef<string> = computed(() => mixHexes(color.value, "#FFFFFF"));
		return {
			color,
			gradient,
			mixedColor
		}
	}
})
</script>
<style>
.iconCardContainer {
	/* background: var(--widget-background-color); */
	height: 100%;
	border-radius: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
	flex-grow: 1;
	cursor: pointer;
}

.iconCardContainer:hover {
	box-shadow: 0 0 25px v-bind(color);
}

.iconCardContainer__items {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	/* color: white; */
	row-gap: 20px;
}

.iconCardContainer__icon {
	transition: 0.6s;
	font-size: 48px;
	color: v-bind(color);
	transform: translateY(50%);
	/* background-image: v-bind(gradient);
	background-clip: text;
	-webkit-background-clip: text;
	text-fill-color: transparent;
	-webkit-text-fill-color: transparent; */
}

.iconCardContainer:hover .iconCardContainer__items .iconCardContainer__icon {
	transform: translateY(0);
}

.iconCardContainer__text {
	transition: 0.3s;
	opacity: 0;
	font-size: 24px;
	color: v-bind(color);
}

.iconCardContainer:hover .iconCardContainer__items .iconCardContainer__text {
	opacity: 1;
}
</style>
