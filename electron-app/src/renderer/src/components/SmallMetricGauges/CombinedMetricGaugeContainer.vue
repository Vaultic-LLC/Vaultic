<template>
	<div class="combinedMetricGaugeContainer">
		<Transition name="fade" mode="out-in">
			<div :key="rKey" class="combinedMetricGaugeContainer__atRiskTitle">
				<h2>{{ title }}</h2>
			</div>
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
.combinedMetricGaugeContainer {
	display: flex;
	flex-direction: column;
	background-color: var(--widget-background-color);
	border-radius: 20px;
	padding-left: clamp(15px, 2vw, 50px);
	padding-right: clamp(15px, 2vw, 50px);
	padding-bottom: clamp(5px, 4vh, 60px);
}

.combinedMetricGaugeContainer__metrics {
	display: grid;
	column-gap: 1.5vw;
	row-gap: 4vh;
}

.combinedMetricGaugeContainer__atRiskTitle {
	color: white;
	margin-top: 5%;
	margin-bottom: 5%;
	font-size: clamp(10px, 0.8vw, 17px);
}
</style>
