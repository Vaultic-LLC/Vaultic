<template>
	<div class="strengthGraphContainer">
		<div class="strengthGraphContainer__header">
			<div class="strengthGraphContainer__resetButton" @click="reset">
				Reset
			</div>
			<h2 class="strengthGraphContainer__title">Security Over Time</h2>
		</div>
		<div ref="chartContainer" class="strengthGraphContainer__chart">
			<Transition name="fade" mode="out-in">
				<div :key="key" v-if="showNoData" class="strengthGraphContainer__noData">
					{{ noDataMessage }}
				</div>
			</Transition>
			<Line ref="lineChart" :data="data" :options="options" :style="{ width: width, height: height }">
			</Line>
		</div>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, watch, toRaw, ComputedRef, computed, onUnmounted } from 'vue';

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
		Line
	},
	setup()
	{
		const refreshKey: Ref<string> = ref('');
		const key: Ref<string> = ref('');
		const chartContainer: Ref<HTMLElement | null> = ref(null);
		const lineChart: Ref<any> = ref(null);

		const color: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.settingsStore.currentColorPalette.passwordsColor.primaryColor : stores.settingsStore.currentColorPalette.valuesColor.primaryColor);

		let lableArray: Ref<number[]> = ref([...stores.encryptedDataStore.currentAndSafePasswords.current]);
		let chartOneArray: Ref<number[]> = ref([...stores.encryptedDataStore.currentAndSafePasswords.safe]);

		let table: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")
		let target: Ref<(number | undefined)[]> = ref(stores.encryptedDataStore.currentAndSafePasswords.current.map(_ => stores.encryptedDataStore.passwords.length));
		let max: Ref<number> = ref(Math.max(...stores.encryptedDataStore.currentAndSafePasswords.safe));

		const height: Ref<string> = ref('100%');
		const width: Ref<string> = ref('100%');

		const resizeObserver: ResizeObserver = new ResizeObserver(() => refreshChart());

		let options: Ref<any> = ref({});

		const showNoData: ComputedRef<boolean> = computed(() => chartOneArray.value.length == 0);
		const noDataMessage: ComputedRef<string> = computed(() => `No data. Add a ${stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Password" : "Value"} to get started.`);

		const data: Ref<any> = ref({
			labels: toRaw(lableArray.value),
			datasets: getDataset()
		});

		function updateData(newColor?: string, oldColor?: string)
		{
			lineChart.value.chart.options.animation.duration = 1000;
			lineChart.value.chart.update();

			lineChart.value.chart.data.labels = toRaw(lableArray.value);
			lineChart.value.chart.data.datasets[0].data = chartOneArray.value;
			lineChart.value.chart.data.datasets[0].label = table.value + ' Security Rating';

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
			const from: RGBColor | null = hexToRgb(oldColor);
			const to: RGBColor | null = hexToRgb(newColor);

			lineChart.value.chart.options.animation.duration = length;
			lineChart.value.chart.update();

			tween<RGBColor>(from!, to!, 500, (object) =>
			{
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
			options.value = {
				responsive: true,
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
					// legend: {
					// 	onClick: function (e)
					// 	{
					// 		e.stopPropagation();
					// 	}
					// },
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
					label: table.value + ' Security Rating',
					data: EMACalc(chartOneArray.value, 2),
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
					data: target,
					borderColor: mixHexes(color.value, "888888"),
					fill: false,
					pointBackgroundColor: mixHexes(color.value, "888888"),
					pointRadius: 0,
					tension: 0.4,
				}
			]
		}

		function EMACalc(mArray: number[], mRange: number): number[]
		{
			if (mArray.length == 0)
			{
				return [];
			}

			var k = 2 / (mRange + 1);
			let emaArray = [mArray[0]];

			for (var i = 1; i < mArray.length; i++)
			{
				emaArray.push(mArray[i] * k + emaArray[i - 1] * (1 - k));
			}

			return emaArray;
		}

		function refreshChart()
		{
			refreshKey.value = Date.now().toString();
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
		}

		function recalcData()
		{
			let newColor: string = "";
			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				newColor = stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
				lableArray.value = stores.encryptedDataStore.currentAndSafePasswords.current.map((_, i) => i);
				chartOneArray.value = EMACalc([...stores.encryptedDataStore.currentAndSafePasswords.safe], 2);
				table.value = "Password";

				// show the target at the last 1/3 of the data unless we are less than 4. Les than 4 means a third won't give us 2 data points so just show the whole line
				const targetPoint: number = stores.encryptedDataStore.currentAndSafePasswords.current.length < 4
					? 0 :
					Math.floor(stores.encryptedDataStore.currentAndSafePasswords.current.length - stores.encryptedDataStore.currentAndSafePasswords.current.length / 3);

				// if the user has all safe passwords, make sure the two graphs are at the same point so that it looks like they can't make them any safer
				if (stores.encryptedDataStore.currentAndSafePasswords.safe[stores.encryptedDataStore.currentAndSafePasswords.safe.length - 1] ==
					stores.encryptedDataStore.currentAndSafePasswords.current[stores.encryptedDataStore.currentAndSafePasswords.current.length - 1])
				{
					target.value = stores.encryptedDataStore.currentAndSafePasswords.current.map((_, i) => i >= targetPoint ? chartOneArray.value[chartOneArray.value.length - 1] : undefined)
				}
				else
				{
					target.value = stores.encryptedDataStore.currentAndSafePasswords.current.map((_, i) => i >= targetPoint ? stores.encryptedDataStore.passwords.length : undefined)
				}

				max.value = Math.max(...[...chartOneArray.value, ...(target.value.filter(v => v != undefined) as number[])]) + 0.5;
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				newColor = stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
				lableArray.value = stores.encryptedDataStore.currentAndSafeValues.current.map((_, i) => i);
				chartOneArray.value = EMACalc([...stores.encryptedDataStore.currentAndSafeValues.safe], 2);
				table.value = "Value";

				const targetPoint: number = stores.encryptedDataStore.currentAndSafeValues.current.length < 4
					? 0 :
					Math.floor(stores.encryptedDataStore.currentAndSafeValues.current.length - stores.encryptedDataStore.currentAndSafeValues.current.length / 3);
				target.value = stores.encryptedDataStore.currentAndSafeValues.current.map((_, i) => i >= targetPoint ? stores.encryptedDataStore.nameValuePairs.length : undefined)

				// if the user has all safe values, make sure the two graphs are at the same point so that it looks like they can't make them any safer
				if (stores.encryptedDataStore.currentAndSafeValues.safe[stores.encryptedDataStore.currentAndSafeValues.safe.length - 1] ==
					stores.encryptedDataStore.currentAndSafeValues.current[stores.encryptedDataStore.currentAndSafeValues.current.length - 1])
				{
					target.value = stores.encryptedDataStore.currentAndSafeValues.current.map((_, i) => i >= targetPoint ? chartOneArray.value[chartOneArray.value.length - 1] : undefined)
				}
				else
				{
					target.value = stores.encryptedDataStore.currentAndSafeValues.current.map((_, i) => i >= targetPoint ? stores.encryptedDataStore.nameValuePairs.length : undefined)
				}

				max.value = Math.max(...[...chartOneArray.value, ...(target.value.filter(v => v != undefined) as number[])]) + 0.5;
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

		watch(() => stores.appStore.authenticated, () =>
		{
			recalcData();
		});


		// don't think these work well since updating one will mess up the chart since the data arrays now have different lengths i.e. x and y axis
		// watch(() => stores.encryptedDataStore.currentAndSafePasswords.current.length, () =>
		// {
		// 	//lableArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.current];
		// 	lableArray.value = stores.encryptedDataStore.currentAndSafePasswords.current.map((_, i) => i);
		// 	target.value = EMACalc([...stores.encryptedDataStore.currentAndSafePasswords.current], 2);

		// 	// resizeChart();
		// 	updateData();
		// });

		// watch(() => stores.encryptedDataStore.currentAndSafePasswords.safe.length, () =>
		// {
		// 	chartOneArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.safe];
		// 	max.value = Math.max(...stores.encryptedDataStore.currentAndSafePasswords.safe);

		// 	//resizeChart();
		// 	updateData();
		// });

		// watch(() => stores.encryptedDataStore.currentAndSafeValues.current.length, () =>
		// {
		// 	lableArray.value = [...stores.encryptedDataStore.currentAndSafeValues.current];
		// 	target.value = EMACalc(stores.encryptedDataStore.currentAndSafeValues.current, 2);

		// 	//resizeChart();
		// 	updateData();
		// });

		// watch(() => stores.encryptedDataStore.currentAndSafeValues.safe.length, () =>
		// {
		// 	chartOneArray.value = [...stores.encryptedDataStore.currentAndSafeValues.safe];
		// 	max.value = Math.max(...stores.encryptedDataStore.currentAndSafeValues.safe);

		// 	//resizeChart();
		// 	updateData();
		// });

		watch(() => stores.settingsStore.currentColorPalette, (newValue, oldValue) =>
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
			// if (color.value == newValue)
			// {
			// 	return;
			// }

			// color.value = newValue;
			// updateColors(newValue, oldValue);
		});

		watch(() => noDataMessage.value, () =>
		{
			key.value = Date.now().toString();
		});

		onMounted(() =>
		{
			if (chartContainer.value)
			{
				resizeObserver.observe(chartContainer.value)
			}

			stores.encryptedDataStore.addEvent("onPasswordChange", onDataChange);
			stores.encryptedDataStore.addEvent("onValueChange", onDataChange);
		});

		onUnmounted(() =>
		{
			stores.encryptedDataStore.removeEvent("onPasswordChange", onDataChange);
			stores.encryptedDataStore.removeEvent("onValueChange", onDataChange);
		});

		setOptions(1000);

		return {
			lineChart,
			chartContainer,
			key,
			options,
			data,
			color,
			height,
			width,
			showNoData,
			noDataMessage,
			refreshKey,
			updateData,
			reset
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

.strengthGraphContainer__noData {
	position: absolute;
	color: gray;
	text-align: center;
	font-size: 24px;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 60%;
}
</style>
