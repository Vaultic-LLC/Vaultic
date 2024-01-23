<template>
	<div class="strengthGraphContainer">
		<div class="strengthGraphContainer__header">
			<div class="strengthGraphContainer__resetButton" @click="updateKey">
				Reset
			</div>
			<h2 class="strengthGraphContainer__title">Security Over Time</h2>
		</div>
		<div ref="chartContainer" class="strengthGraphContainer__chart">
			<Line :key="key" ref="chart" :data="data" :options="options" :style="{ width: width, height: height }">
			</Line>
		</div>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, watch } from 'vue';

import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler } from "chart.js"
import { Line } from "vue-chartjs"
import { DataType } from '../../Types/Table';
import { stores } from '../../Objects/Stores';
import { mixHexes } from '@renderer/Helpers/ColorHelper';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, zoomPlugin)

export default defineComponent({
	name: "PasswordStrengthProgressChart",
	components:
	{
		Line
	},
	setup()
	{
		const key: Ref<string> = ref('');
		const chartContainer: Ref<HTMLElement | null> = ref(null);
		const chart: Ref<HTMLCanvasElement | null> = ref(null);

		const color: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.settingsStore.currentColorPalette.passwordsColor.primaryColor : stores.settingsStore.currentColorPalette.valuesColor.primaryColor);

		let lableArray: Ref<number[]> = ref([...stores.encryptedDataStore.currentAndSafePasswords.current]);
		let chartOneArray: number[] = [...stores.encryptedDataStore.currentAndSafePasswords.safe];

		let table: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")
		let target: Ref<number[]> = ref(stores.encryptedDataStore.currentAndSafePasswords.current.map(_ => stores.encryptedDataStore.passwords.length));
		let max: Ref<number> = ref(Math.max(...stores.encryptedDataStore.currentAndSafePasswords.safe));

		const height: Ref<string> = ref('100%');
		const width: Ref<string> = ref('100%');

		const resizeObserver: ResizeObserver = new ResizeObserver(() => resizeChart());

		let options: Ref<any> = ref({});

		const data: Ref<any> = ref({
			labels: lableArray.value,
			datasets: getDataset()
		});

		function updateKey()
		{
			setData();
			setOptions();
			key.value = Date.now().toString();
		}

		function setData()
		{
			data.value = {
				labels: lableArray.value,
				datasets: getDataset()
			};
		}

		function setOptions()
		{
			options.value = {
				responsive: true,
				elements:
				{
					point:
					{
						radius: 0
					}
				},
				animation:
				{
					duration: 1000,
					easing: 'linear'
				},
				plugins:
				{
					legend: {
						onClick: function (e)
						{
							e.stopPropagation();
						}
					},
					zoom: {
						zoom: {
							wheel: {
								enabled: true,
							},
							pinch: {
								enabled: false
							},
							drag: {
								enabled: false
							},
							mode: 'xy',
						},
						pan: {
							enabled: true,
							scaleMode: 'xy'
						}
					}
				},
				scales: {
					x: {
					},
					y: {
						max: max
					}
				}
			};
		}

		function getDataset()
		{
			return [
				{
					label: table.value + ' Security Rating',
					data: EMACalc(chartOneArray, 2),
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

						// hex value already has opacity
						if (color.value.length > 7)
						{
							gradient.addColorStop(0, color.value);
							gradient.addColorStop(0.35, color.value);
							gradient.addColorStop(1, color.value);
						}
						else
						{
							gradient.addColorStop(0, color.value + "88");
							gradient.addColorStop(0.35, color.value + "44");
							gradient.addColorStop(1, color.value + "00");
						}

						return gradient;
					},
					fill: true,
					borderColor: color,
					pointBackgroundColor: color.value,
					pointRadius: 0,
					// cubicInterpolationMode: 'monotone',
					tension: 0.3
				},
				{
					label: "Target",
					data: target,
					borderColor: mixHexes(color.value, "888888"),
					pointRadius: 0
				}
			]
		}

		function EMACalc(mArray, mRange): number[]
		{
			var k = 2 / (mRange + 1);
			// first item is just the same as the first item in the input
			let emaArray = [mArray[0]];
			// for the rest of the items, they are computed with the previous one
			for (var i = 1; i < mArray.length; i++)
			{
				emaArray.push(mArray[i] * k + emaArray[i - 1] * (1 - k));
			}

			return emaArray;
		}

		function resizeChart()
		{
			key.value = Date.now().toString();
		}

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			switch (newValue)
			{
				case DataType.NameValuePairs:
					lableArray.value = [...stores.encryptedDataStore.currentAndSafeValues.current];
					chartOneArray = [...stores.encryptedDataStore.currentAndSafeValues.safe];
					color.value = stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
					table.value = "Value";
					target.value = stores.encryptedDataStore.currentAndSafeValues.current.map(_ => stores.encryptedDataStore.nameValuePairs.length);
					max.value = Math.max(...stores.encryptedDataStore.currentAndSafeValues.safe)
					break;
				case DataType.Passwords:
				default:
					lableArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.current];
					chartOneArray = [...stores.encryptedDataStore.currentAndSafePasswords.safe];
					color.value = stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
					table.value = "Password";
					target.value = stores.encryptedDataStore.currentAndSafePasswords.current.map(_ => stores.encryptedDataStore.passwords.length);
					max.value = Math.max(...stores.encryptedDataStore.currentAndSafePasswords.safe)
					break;
			}

			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafePasswords.current.length, () =>
		{
			lableArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.current];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafePasswords.safe.length, () =>
		{
			chartOneArray = [...stores.encryptedDataStore.currentAndSafePasswords.safe];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafeValues.current.length, () =>
		{
			lableArray.value = [...stores.encryptedDataStore.currentAndSafeValues.current];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafeValues.safe.length, () =>
		{
			chartOneArray = [...stores.encryptedDataStore.currentAndSafeValues.safe];
			updateKey();
		});

		watch(() => stores.settingsStore.currentPrimaryColor.value, (newValue) =>
		{
			if (color.value == newValue)
			{
				return;
			}

			color.value = newValue;
			updateKey();
		});

		onMounted(() =>
		{
			if (chartContainer.value)
			{
				resizeObserver.observe(chartContainer.value)
			}
		});

		setOptions();

		return {
			chart,
			chartContainer,
			key,
			options,
			data,
			color,
			height,
			width,
			updateKey
		}
	}
})
</script>

<style>
.strengthGraphContainer {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 20px;
	background: rgb(44 44 51 / 16%);
	/* margin: 10px;
	margin-top: 50px;
	padding-top: 1%; */
}

.strengthGraphContainer__header {
	display: flex;
	justify-content: center;
}

.strengthGraphContainer__resetButton {
	position: absolute;
	top: 5%;
	left: 5%;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 5px;
	width: 10%;
	height: 25px;
	color: white;
	border-radius: 20px;
	border: 2px solid v-bind(color);
	transition: 0.3s;
}

.strengthGraphContainer__resetButton:hover {
	box-shadow: 0 0 25px v-bind(color);
}

.strengthGraphContainer__title {
	width: 75%;
	color: white;
}

.strengthGraphContainer__chart {
	position: relative;
	height: 80%;
	width: 100%;
	display: flex;
	justify-content: center;
}
</style>
