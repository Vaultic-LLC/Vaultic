<template>
	<div class="iconCardContainer">
		<div class="iconCardContainer__items">
			<ion-icon class="iconCardContainer__icon" :name="icon"></ion-icon>
			<div class="iconCardContainer__text">{{ text }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import { stores } from '@renderer/Objects/Stores';
import { ComputedRef, computed, defineComponent } from 'vue';

export default defineComponent({
	name: "IconCard",
	props: ['icon', 'text'],
	setup()
	{
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		return {
			color
		}
	}
})
</script>
<style>
.iconCardContainer {
	background: var(--widget-background-color);
	border-radius: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
}

.iconCardContainer:hover {
	box-shadow: 0 0 25px v-bind(color);
}

.iconCardContainer__items {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	color: white;
	row-gap: 20px;
}

.iconCardContainer__icon {
	font-size: 48px;
}

.iconCardContainer__text {
	font-size: 24px;
}
</style>
