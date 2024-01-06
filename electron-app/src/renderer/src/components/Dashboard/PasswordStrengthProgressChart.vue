<template>
	<div id="passwordStrenghtProgressContainer" :key="key">
		<h2>Security Over Time</h2>
		<Line :data="data" :options="options">
		</Line>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from "chart.js"
import { Line } from "vue-chartjs"
import { DataType } from '../../Types/Table';
import { stores } from '../../Objects/Stores';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale)

export default defineComponent({
	name: "PasswordStrengthProgressChart",
	components:
	{
		Line
	},
	setup()
	{
		const key: Ref<string> = ref('');

		const color: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.settingsStore.currentColorPalette.passwordsColor.primaryColor : stores.settingsStore.currentColorPalette.valuesColor.primaryColor);

		let lableArray: Ref<number[]> = ref([...stores.encryptedDataStore.currentAndSafePasswords.current]);
		let chartOneArray: number[] = [...stores.encryptedDataStore.currentAndSafePasswords.safe];

		let table: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")

		function updateKey()
		{
			data.value = {
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
			};

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

		watch(() => stores.encryptedDataStore.currentAndSafePasswords.current.length, (newValue) =>
		{
			lableArray.value = [...stores.encryptedDataStore.currentAndSafePasswords.current];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafePasswords.safe.length, (newValue) =>
		{
			chartOneArray = [...stores.encryptedDataStore.currentAndSafePasswords.safe];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafeValues.current.length, (newValue) =>
		{
			lableArray.value = [...stores.encryptedDataStore.currentAndSafeValues.current];
			updateKey();
		});

		watch(() => stores.encryptedDataStore.currentAndSafeValues.safe.length, (newValue) =>
		{
			chartOneArray = [...stores.encryptedDataStore.currentAndSafeValues.safe];
			updateKey();
		});

		watch(() => stores.settingsStore.currentPrimaryColor.value, (newValue) =>
		{
			color.value = newValue;
			updateKey();
		});

		const options: any = {
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
			key,
			options,
			data
		}
	}
})
</script>

<style>
#passwordStrenghtProgressContainer {
	margin: 10px;
	margin-top: 50px;
}

#passwordStrenghtProgressContainer h2 {
	color: white;
}
</style>
