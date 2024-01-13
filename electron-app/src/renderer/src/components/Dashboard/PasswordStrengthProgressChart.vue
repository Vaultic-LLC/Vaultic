<template>
	<div id="passwordStrenghtProgressContainer" :key="key">
		<h2>Security Over Time</h2>
		<Line ref="chart" :data="data" :options="options">
		</Line>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler } from "chart.js"
import { Line } from "vue-chartjs"
import { DataType } from '../../Types/Table';
import { stores } from '../../Objects/Stores';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler)

export default defineComponent({
	name: "PasswordStrengthProgressChart",
	components:
	{
		Line
	},
	setup()
	{
		const key: Ref<string> = ref('');
		const chart: Ref<HTMLCanvasElement | null> = ref(null);

		const color: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.settingsStore.currentColorPalette.passwordsColor.primaryColor : stores.settingsStore.currentColorPalette.valuesColor.primaryColor);

		let lableArray: Ref<number[]> = ref([...stores.encryptedDataStore.currentAndSafePasswords.current]);
		let chartOneArray: number[] = [...stores.encryptedDataStore.currentAndSafePasswords.safe];

		let table: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")

		function updateKey()
		{
			setData();
			key.value = Date.now().toString();
		}

		function setData()
		{
			if (chart.value)
			{
				//@ts-ignore
				data.value = {
					labels: lableArray.value,
					datasets: [
						{
							label: 'Secure ' + table.value,
							data: chartOneArray,
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
							pointRadius: 3,
							cubicInterpolationMode: 'monotone',
							tension: 0.4
						}
					]
				};
			}
		}

		// onMounted(() =>
		// {
		// 	setData();
		// });

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			switch (newValue)
			{
				case DataType.NameValuePairs:
					lableArray.value = [...stores.encryptedDataStore.currentAndSafeValues.current];
					chartOneArray = [...stores.encryptedDataStore.currentAndSafeValues.safe];
					color.value = stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
					table.value = "Values";
					break;
				case DataType.Passwords:
				default:
					lableArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.current];
					chartOneArray = [...stores.encryptedDataStore.currentAndSafePasswords.safe];
					color.value = stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
					table.value = "Passwords";
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

		const options: any = {
			responsive: true,
			elements:
			{
				// point:
				// {
				// 	radius: 0
				// }
			},
			animation:
			{
				duration: 1000,
				easing: 'linear'
			},
		};

		const data: Ref<any> = ref({
			labels: lableArray.value,
			datasets: [
				{
					label: 'Secure ' + table.value,
					data: chartOneArray,
					borderColor: color,
					cubicInterpolationMode: 'monotone',
					tension: 0.4
				}
			]
		});

		return {
			chart,
			key,
			options,
			data
		}
	}
})
</script>

<style>
#passwordStrenghtProgressContainer {
	position: relative;
	width: 100%;
	border-radius: 20px;
	background: rgb(44 44 51 / 16%);
	margin: 10px;
	margin-top: 50px;
	padding-top: 1%;
}

#passwordStrenghtProgressContainer h2 {
	color: white;
}
</style>
