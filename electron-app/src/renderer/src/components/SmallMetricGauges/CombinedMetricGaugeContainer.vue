<template>
	<div class="combinedMetricGaugeContainer">
		<Transition name="fade" mode="out-in">
			<h2 :key="rKey" class="combinedMetricGaugeContainer__atRiskTitle">{{ title }}</h2>
		</Transition>
		<div class="combinedMetricGaugeContainer__metrics" :key="rKey">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';

export default defineComponent({
	name: "CombinedMetricGaugeContainer",
	props: ['title', 'refreshKey'],
	setup(props)
	{
		const rKey: Ref<string> = ref('');

		watch(() => props.refreshKey, (newValue) =>
		{
			rKey.value = newValue;
		});

		return {
			rKey
		}
	}
})
</script>
<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s linear;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.combinedMetricGaugeContainer {
	display: flex;
	flex-direction: column;
	background-color: var(--widget-background-color);
	border-radius: 20px;
	padding-left: 50px;
	padding-bottom: 60px;
	padding-right: 50px;
}

.combinedMetricGaugeContainer__metrics {
	display: grid;
	column-gap: 40px;
	row-gap: 55px;
}

.combinedMetricGaugeContainer__atRiskTitle {
	color: white;
	margin-bottom: 10%;
}
</style>
