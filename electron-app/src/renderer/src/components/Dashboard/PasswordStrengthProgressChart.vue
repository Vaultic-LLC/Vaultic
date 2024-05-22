<template>
	<div class="strengthGraphContainer">
		<div class="strengthGraphContainer__header">
			<div class="strengthGraphContainer__resetButton" @click="reset">
				Reset
			</div>
			<div class="strengthGraphContainer__title">
				<h2>Security Over Time</h2>
			</div>
		</div>
		<div ref="chartContainer" class="strengthGraphContainer__chart">
			<Transition name="fade" mode="out-in">
				<div :key="key" v-if="showStatusMessage" class="strengthGraphContainer__noData">
					{{ statusMessage }}
				</div>
			</Transition>
			<Transition name="fade" mode="out-in">
				<div v-if="loading" class="strengthGraphContainer__loadingIndicator">
					<div>Loading</div>
					<LoadingIndicator :color="color" />
				</div>
			</Transition>
			<Line v-if="!showStatusMessage" class="strengthGraphContainer__chartCanvas" :key="refreshKey"
				ref="lineChart" :data="data" :options="options">
			</Line>
		</div>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, watch, toRaw, onUnmounted } from 'vue';

import LoadingIndicator from '../Loading/LoadingIndicator.vue';

import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler } from "chart.js"
import { Line } from "vue-chartjs"
import { DataType } from '../../Types/Table';
import { hexToRgb, mixHexes, rgbToHex, toSolidHex } from '@renderer/Helpers/ColorHelper';
import zoomPlugin from 'chartjs-plugin-zoom';
import { tween } from '@renderer/Helpers/TweenHelper';
import { RGBColor } from '@renderer/Types/Colors';
import { stores } from '@renderer/Objects/Stores';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, zoomPlugin)

export default defineComponent({
	name: "PasswordStrengthProgressChart",
	components:
	{
		Line,
		LoadingIndicator
	},
	setup()
	{
		const loading: Ref<boolean> = ref(false);
		const refreshKey: Ref<string> = ref('');
		const key: Ref<string> = ref('');
		const chartContainer: Ref<HTMLElement | null> = ref(null);
		const lineChart: Ref<any> = ref(null);

		const color: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor : stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor);

		let lableArray: Ref<number[]> = ref([...stores.passwordStore.currentAndSafePasswords.current]);
		let chartOneArray: Ref<number[]> = ref([...stores.passwordStore.currentAndSafePasswords.safe]);

		let table: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")
		let target: Ref<(number | undefined)[]> = ref(stores.passwordStore.currentAndSafePasswords.current.map(_ => stores.passwordStore.passwords.length));
		let max: Ref<number> = ref(Math.max(...stores.passwordStore.currentAndSafePasswords.safe));

		const resizeObserver: ResizeObserver = new ResizeObserver(refreshChart);

		let options: Ref<any> = ref({});

		const showStatusMessage: Ref<boolean> = ref(false);
		const statusMessage: Ref<string> = ref('');

		const data: Ref<any> = ref({
			labels: toRaw(lableArray.value),
			datasets: getDataset()
		});

		function updateData(newColor?: string, oldColor?: string)
		{
			if (!lineChart.value)
			{
				return;
			}

			lineChart.value.chart.options.animation.duration = 1000;
			lineChart.value.chart.update();

			lineChart.value.chart.data.labels = toRaw(lableArray.value);
			lineChart.value.chart.data.datasets[0].data = chartOneArray.value;
			lineChart.value.chart.data.datasets[0].label = 'Secure ' + table.value;

			lineChart.value.chart.data.datasets[1].data = target.value;

			lineChart.value.chart.options.scales.y.max = max.value;

			if (newColor && oldColor)
			{
				updateColors(newColor, oldColor, 500);
			}
			else
			{
				lineChart.value.chart.update();
			}
		}

		function updateColors(newColor: string, oldColor: string, length: number)
		{
			if (!lineChart.value)
			{
				return;
			}

			const from: RGBColor | null = hexToRgb(oldColor);
			const to: RGBColor | null = hexToRgb(newColor);

			lineChart.value.chart.options.animation.duration = length;
			lineChart.value.chart.update();

			tween<RGBColor>(from!, to!, 500, (object) =>
			{
				// this becomes null for some reason on first load
				if (!lineChart.value)
				{
					return;
				}

				object.r = Math.round(object.r);
				object.g = Math.round(object.g);
				object.b = Math.round(object.b);

				const hexColor: string = rgbToHex(object.r, object.g, object.b);

				lineChart.value.chart.data.datasets[0].borderColor = `rgba(${object.r}, ${object.g}, ${object.b}, ${object.alpha})`;
				lineChart.value.chart.data.datasets[1].borderColor = mixHexes(hexColor, "888888");

				lineChart.value.chart.data.datasets[0].backgroundColor = getGradient(lineChart.value.chart, hexColor);

				lineChart.value.chart.update();
			});
		}

		// should only be called when first loading. Otherwise just update the options through the line chart
		function setOptions(animationTime: number)
		{
			let boxSize = getBoxWidthAndHeight();
			if (!boxSize)
			{
				boxSize = [defaultLegendBoxWidth, defaultLegendBoxHeight];
			}

			options.value = {
				responsive: true,
				maintainAspectRatio: false,
				elements:
				{
					point:
					{
						radius: 10
					}
				},
				animation:
				{
					duration: animationTime,
					easing: 'linear'
				},
				plugins:
				{
					tooltip: {
						enabled: false
					},
					legend: {
						labels: {
							boxWidth: boxSize[0],
							boxHeight: boxSize[1],
							padding: 10
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
							scaleMode: 'xy'
						},
						pan: {
							enabled: true,
							scaleMode: 'xy'
						}
					}
				},
				scales: {
					x: {
						grid: {
							// color: appHexColor()
						}
					},
					y: {
						max: max.value,
						min: -0.1,
						grid: {
							// color: appHexColor()
						}
					}
				}
			};
		}

		function getDataset()
		{
			return [
				{
					label: 'Secure ' + table.value,
					data: [],
					backgroundColor: function (context)
					{
						const chart = context.chart;
						return getGradient(chart, color.value);
					},
					fill: true,
					borderColor: color.value,
					pointBackgroundColor: color.value,
					pointRadius: 0,
					tension: 0.4
				},
				{
					label: "Target",
					data: [],
					borderColor: mixHexes(color.value, "888888"),
					fill: false,
					pointBackgroundColor: mixHexes(color.value, "888888"),
					pointRadius: 0,
					tension: 0.4,
					hidden: true,
				}
			]
		}

		const defaultLegendBoxWidth = 35;
		const defaultLegendBoxHeight = 10;
		const maxChartContainerWidth = 538;

		function getBoxWidthAndHeight(): [number, number] | undefined
		{
			const info = chartContainer.value?.getBoundingClientRect();
			if (info)
			{
				const ratio = info.width / maxChartContainerWidth;
				return [defaultLegendBoxWidth * ratio, defaultLegendBoxHeight * ratio]
			}

			return undefined;
		}

		async function refreshChart()
		{
			// this fixes the bug where the graph won't resize correctly when clicking the minimize / expand button in the top toolbar
			await new Promise((resolve) => setTimeout(resolve, 100));
			const info = chartContainer.value?.getBoundingClientRect();
			if (info)
			{
				const boxSize = getBoxWidthAndHeight();
				if (boxSize)
				{
					lineChart.value.chart.options.plugins.legend.labels.boxWidth = boxSize[0];
					lineChart.value.chart.options.plugins.legend.labels.boxHeight = boxSize[1];
					reset();
				}
			}
		}

		function getGradient(chart: any, hexColor: string)
		{
			const { ctx, chartArea } = chart;

			if (!chartArea)
			{
				// This case happens on initial chart load
				return;
			}

			let gradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);

			// hex value already has opacity, remove it
			hexColor = toSolidHex(hexColor);

			gradient.addColorStop(0, hexColor + "88");
			gradient.addColorStop(0.35, hexColor + "44");
			gradient.addColorStop(1, hexColor + "00");

			return gradient;
		}

		function reset()
		{
			setOptions(500);
			updateData(color.value, color.value);
		}

		async function recalcData()
		{
			if (!stores.appStore.isOnline)
			{
				return;
			}

			let newColor: string = "";
			let requestData: any = {};
			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				requestData.Values = stores.passwordStore.currentAndSafePasswords;
				newColor = stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor;
				table.value = "Passwords";
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				requestData.Values = stores.valueStore.currentAndSafeValues;
				newColor = stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor;
				table.value = "Values";
			}

			loading.value = true;
			const response = await window.api.server.user.getChartData(JSON.stringify(requestData));
			loading.value = false;

			if (response.Success)
			{
				showStatusMessage.value = false;
				statusMessage.value = "";

				lableArray.value = response.ChartData!.Y;
				chartOneArray.value = response.ChartData!.DataX;
				target.value = response.ChartData!.TargetX;
				max.value = response.ChartData!.Max;
			}
			else
			{
				showStatusMessage.value = true;
				statusMessage.value = "Unable to load data";
			}

			updateData(newColor, color.value);
			color.value = newColor;
		}

		function onDataChange()
		{
			recalcData();
		}

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			recalcData();
		});

		watch(() => stores.userPreferenceStore.currentColorPalette, (newValue, oldValue) =>
		{
			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				updateColors(newValue.passwordsColor.primaryColor, oldValue.passwordsColor.primaryColor, 0);
				color.value = newValue.passwordsColor.primaryColor;
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				updateColors(newValue.valuesColor.primaryColor, oldValue.valuesColor.primaryColor, 0);
				color.value = newValue.valuesColor.primaryColor;
			}
		});

		watch(() => statusMessage.value, () =>
		{
			key.value = Date.now().toString();
		});

		watch(() => chartOneArray.value.length, (newValue) =>
		{
			if (newValue <= 1)
			{
				showStatusMessage.value = true;
				statusMessage.value = `Not enough data. Add at least 2 ${stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values"} to get started.`;
			}
		});

		onMounted(() =>
		{
			// TODO: we should only be doing anyting if we are online. hide widgets when we are offline since they won't work? This and breached passwords
			if (chartContainer.value)
			{
				resizeObserver.observe(chartContainer.value)
			}

			stores.passwordStore.addEvent("onChanged", onDataChange);
			stores.valueStore.addEvent("onChanged", onDataChange);
		});

		onUnmounted(() =>
		{
			stores.passwordStore.removeEvent("onChanged", onDataChange);
			stores.valueStore.removeEvent("onChanged", onDataChange);
		});

		setOptions(1000);

		return {
			lineChart,
			chartContainer,
			key,
			options,
			data,
			color,
			showStatusMessage,
			statusMessage,
			refreshKey,
			loading,
			updateData,
			reset
		}
	}
})
</script>

<style>
.strengthGraphContainer {
	width: 100%;
	height: 100%;
	border-radius: 20px;
	background: rgb(44 44 51 / 16%);
	padding-top: 0.7vw;
}

.strengthGraphContainer__header {
	display: flex;
	justify-content: center;
}

.strengthGraphContainer__resetButton {
	position: absolute;
	top: 5%;
	left: 2%;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 5px;
	width: 10%;
	height: 7%;
	color: white;
	border-radius: min(1vw, 1rem);
	border: clamp(1.5px, 0.1vw, 2px) solid v-bind(color);
	transition: 0.3s;
	font-size: clamp(10px, 0.7vw, 17px);
	cursor: pointer;
}

.strengthGraphContainer__resetButton:hover {
	box-shadow: 0 0 25px v-bind(color);
}

.strengthGraphContainer__title {
	width: 75%;
	color: white;
	font-size: clamp(10px, 0.8vw, 17px);
}

.strengthGraphContainer__chart {
	position: relative;
	height: 80%;
	width: 100%;
	display: flex;
	justify-content: center;
	margin-top: 0.3vw;
}

.strengthGraphContainer__noData {
	position: absolute;
	color: gray;
	text-align: center;
	font-size: clamp(12px, 1.3vw, 25px);
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 80%;
}

.strengthGraphContainer__loadingIndicator {
	color: white;
	width: 50%;
	height: 50%;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.strengthGraphContainer__chartCanvas {
	width: 100% !important;
	height: 100% !important;
}
</style>
