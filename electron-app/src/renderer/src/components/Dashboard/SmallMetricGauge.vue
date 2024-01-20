<template>
	<div>
		<div class="smallMetricContainer2" ref="smallMetricContainer" :key="key" @click="model.onClick"
			:class="{ active: active, pulse: pulse }">
			<div class="title">
				<h2>{{ amountOutOfTotal }}</h2>
				<p>{{ model.title }}</p>
			</div>
			<Doughnut :data="data" :options="options" />
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { stores } from '../../Objects/Stores';

ChartJS.register(ArcElement, Tooltip, Legend)

export default defineComponent({
	name: "SmallMetricGauge",
	props: ['model'],
	components:
	{
		Doughnut
	},
	setup(props)
	{
		const key: Ref<string> = ref('');
		const primaryColor: Ref<string> = ref(props.model.color);
		const gauge: Ref<HTMLElement | null> = ref(null);
		const smallMetricContainer: Ref<HTMLElement | null> = ref(null);
		const active: ComputedRef<boolean> = computed(() => props.model.active);
		const pulse: ComputedRef<boolean> = computed(() => props.model.pulse == true && props.model.filledAmount > 0);

		let authenticated: Ref<boolean> = ref(stores.appStore.authenticated);
		let fillAmount: ComputedRef<number> = computed(() => props.model.filledAmount / props.model.totalAmount * 100);
		let amountOutOfTotal: ComputedRef<string> = computed(() => `${props.model.filledAmount} / ${props.model.totalAmount}`);
		const textColor: Ref<string> = computed(() => fillAmount.value == 0 ? "white" : "white");

		const options: any =
		{
			resposive: false,
			animation:
			{
				duration: 1000,
				easing: 'linear'
			},
			plugins: {
				legend:
				{
					display: false
				},
				tooltip:
				{
					enabled: false
				}
			},
			cutout: '90%'
		};

		const data: Ref<any> =
			ref({
				labels: [props.model.title, ""],
				datasets: [
					{
						data: [props.model.filledAmount, props.model.totalAmount - props.model.filledAmount],
						//backgroundColor: [primaryColor.value, '#191919'],
						backgroundColor: function (context)
						{
							const chart = context.chart;
							const { ctx, chartArea } = chart;

							if (!chartArea)
							{
								// This case happens on initial chart load
								return;
							}

							let gradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);
							// gradient.addColorStop(0, mixHexes(primaryColor.value, '#363131'));
							// gradient.addColorStop(fillAmount.value / 100 / 2, primaryColor.value);
							// gradient.addColorStop(fillAmount.value / 100, mixHexes(primaryColor.value, '#363131'));
							gradient.addColorStop(1, primaryColor.value);
							// hex value already has opacity
							// if (primaryColor.value.length > 7)
							// {
							// 	gradient.addColorStop(0, primaryColor.value);
							// 	gradient.addColorStop(0.35, primaryColor.value);
							// 	gradient.addColorStop(1, primaryColor.value);
							// }
							// else
							// {
							// 	gradient.addColorStop(0, primaryColor.value + "88");
							// 	gradient.addColorStop(0.35, primaryColor.value + "44");
							// 	gradient.addColorStop(1, primaryColor.value + "00");
							// }

							return [gradient, '#191919'];
						},
						borderColor: 'transparent',
					}
				]

			});

		function updateKey()
		{
			key.value = Date.now().toString();
		}

		watch(() => stores.appStore.authenticated, (newValue) =>
		{
			authenticated.value = newValue;
		});

		watch(() => props.model.color, (newValue) =>
		{
			primaryColor.value = newValue;
			data.value = {
				labels: [props.model.title, ""],
				datasets: [
					{
						data: [props.model.filledAmount, props.model.totalAmount - props.model.filledAmount],
						backgroundColor: [primaryColor.value, '#191919'],
						borderColor: 'transparent'
					}
				]

			};

			updateKey();
		});

		return {
			key,
			active,
			smallMetricContainer,
			gauge,
			primaryColor,
			authenticated,
			fillAmount,
			amountOutOfTotal,
			textColor,
			options,
			data,
			pulse
		}
	}
})
</script>

<style scoped>
.smallMetricContainer2 {
	position: relative;
	/* width: 50%; */
	/* height: auto; */
	width: 150px;
	height: 150px;
	aspect-ratio: 1 / 1;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px;
	border-radius: 50%;
	cursor: pointer;
	transition: 0.3s;
	box-shadow: 0 0 0 v-bind(primaryColor);
}

.smallMetricContainer2.active {
	box-shadow: 0 0 25px v-bind(primaryColor);
}

.smallMetricContainer2:not(.active).pulse {
	animation: pulseMetricGauge 1s infinite;
}

.smallMetricContainer2:hover {
	box-shadow: 0 0 25px v-bind(primaryColor);
}

.smallMetricGaugeProgress {
	position: relative;
	height: auto;
	width: 100%;
	aspect-ratio: 1 /1;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.6s;
}

.smallMetricGaugeProgress::before {
	content: "";
	position: absolute;
	height: 84%;
	width: 84%;
	background-color: var(--app-color);
	border-radius: inherit;
}

@keyframes pulseMetricGauge {
	0% {
		box-shadow: 0 0 0 v-bind(primaryColor);
	}

	50% {
		box-shadow: 0 0 25px v-bind(primaryColor);
	}

	100% {
		box-shadow: 0 0 0 v-bind(primaryColor);
	}
}

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.title {
	position: absolute;
	inset: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	opacity: 0;
	animation: fadeIn 1s linear forwards;
	animation-delay: 1s;
}


.title h2 {
	display: flex;
	justify-content: center;
	align-items: center;
	color: v-bind(textColor);
	font-weight: 700;
	font-size: 2.5em;
	transform: translateY(20px);
	transition: 0.2s;
	user-select: none;
}

/* .smallMetricContainer2:hover .title h2 {
    font-size: 2.6em;
} */

.title p {
	font-weight: 300;
	font-size: 0.75em;
	letter-spacing: 2px;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.75);
	transform: translateY(50px);
	transition: 0.2s;
	user-select: none;
}

/* .smallMetricContainer2:hover .title p {
    font-size: 0.85em;
} */
</style>
