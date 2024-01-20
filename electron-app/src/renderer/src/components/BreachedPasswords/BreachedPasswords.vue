<template>
	<div class="breachedPasswordsContainer">
		<div class="breachedPasswordsContainer__content">
			<div class="breachedPasswordsContainer__scanButton" :class="{ scanning: scanning }" @click="startScan(true)">
				<span v-if="scanning">Scanning...</span>
				<span v-else>Scan</span>
			</div>
			<div class="breachedPasswordsContainer__title">
				<div>
					Breached Passwords
				</div>
			</div>
			<div class="breachedPasswordsContainer__items">
				<!-- <div class="breachedItemContainer spinningGlobe">
					<SpinningGlobe />
					<div class="breachedPasswordsContainer__scanner">
					</div>
				</div> -->
				<div class="breachedPasswordsContainer__map">
					<WorldMap :scan="scanning" />
				</div>
				<!-- <div class="breachedItemContainer breeachedPasswordTable">
					<TableTemplate ref="tableRef" :color="color" class="shadow scrollbar" :scrollbar-size="1"
						@scrolledToBottom="tableRowDatas.loadNextChunk()"
						:style="{ 'position': 'relative', 'height': '100%' }" :rowGap="10">
						<template #header>
							<TableHeaderRow :model="passwordHeaders" :defaultActiveHeader="1"
								:backgroundColor="'#121a20'" />
						</template>
						<template #body>
							<TableRow v-for="(model, index) in tableRowDatas.visualValues" :key="model.id" :model="model"
								:rowNumber="index" :allowPin="false" :allowDelete="false" :allowEdit="true"
								class="shadow hover" :style="{ 'height': '70px' }" :color="color" />
						</template>
					</TableTemplate>
				</div> -->
				<div class="breachedPasswordsContainer__metric">
					<SmallMetricGauge :model="metricModel" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref, watch } from 'vue';

import SpinningGlobe from './SpinningGlobe.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import TableRow from '../Table/Rows/TableRow.vue';
import WorldMap from './WorldMap.vue';

import { stores } from '../../Objects/Stores';
import { HeaderDisplayField } from '../../Types/EncryptedData';
import { IGroupableSortedCollection, SortedCollection } from '@renderer/Objects/DataStructures/SortedCollections';
import { PasswordStore } from '@renderer/Objects/Stores/PasswordStore';
import { DataType } from '@renderer/Types/Table';
import { SmallMetricGaugeModel, SortableHeaderModel, TableRowData, emptyHeader } from '@renderer/Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { createSortableHeaderModels } from '@renderer/Helpers/ModelHelper';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import SmallMetricGauge from '../Dashboard/SmallMetricGauge.vue';
import { ShowToastFunctionKey } from '@renderer/Types/Keys';

export default defineComponent({
	name: "BreachedPasswords",
	components:
	{
		SpinningGlobe,
		TableTemplate,
		TableHeaderRow,
		TableRow,
		WorldMap,
		SmallMetricGauge
	},
	setup()
	{
		const tableRef: Ref<HTMLElement | null> = ref(null);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.passwordsColor.primaryColor);
		const passwords: SortedCollection<PasswordStore> = new IGroupableSortedCollection(DataType.Passwords, [], "passwordFor");
		const tableRowDatas: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection());
		const scanning: Ref<boolean> = ref(false);

		const showToastFunc: { (toastText: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		const metricModel: Ref<SmallMetricGaugeModel> = ref(updateMetricModel())

		const passwordActiveHeader: Ref<number> = ref(1);
		const passwordHeaderDisplayFields: HeaderDisplayField[] = [
			{
				displayName: "Password For",
				backingProperty: "passwordFor",
				width: '200px'
			},
			{
				displayName: "Login",
				backingProperty: "login",
				width: '200px'
			}
		];

		const passwordHeaders: SortableHeaderModel[] = createSortableHeaderModels(true, passwordActiveHeader, passwordHeaderDisplayFields,
			passwords, undefined, setModels);
		passwordHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		function setModels()
		{
			const temp: TableRowData[] = passwords.calculatedValues.map(p =>
			{
				return {
					id: uuidv4(),
					values: [
						{ value: p.passwordFor, copiable: false, width: '200px' },
						{ value: p.login, copiable: true, width: '200px' }
					]
				}
			});

			tableRowDatas.value.setValues(temp);
			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function updateMetricModel()
		{
			return {
				key: `pbreached${3}${stores.encryptedDataStore.passwords.length}`,
				title: 'Breached',
				filledAmount: 3,
				totalAmount: stores.encryptedDataStore.passwords.length,
				color: color.value,
				active: false,
				pulse: true,
				onClick: function ()
				{
					//
				}
			};
		}

		function resetMetricModels()
		{
			return {
				key: `pbreached${0}${stores.encryptedDataStore.passwords.length}`,
				title: 'Breached',
				filledAmount: 0,
				totalAmount: stores.encryptedDataStore.passwords.length,
				color: color.value,
				active: false,
				pulse: true,
				onClick: function ()
				{
					//
				}
			};
		}

		const minScanTime: number = 10000;
		function startScan(notifyComplete: boolean)
		{
			scanning.value = true;
			metricModel.value = resetMetricModels();

			const minScanPromise: Promise<void> = new Promise((resolve, _) =>
			{
				setTimeout(() => resolve(), minScanTime);
			});

			const getBreechesPromise: Promise<any> = getBreaches();
			Promise.all([minScanPromise, getBreechesPromise]).then(() =>
			{
				scanning.value = false;
				metricModel.value = updateMetricModel();

				if (notifyComplete)
				{
					showToastFunc("Scan Complete", true);
				}
			});
		}

		// hit server to get updated breaches
		function getBreaches(): Promise<any>
		{
			return Promise.resolve();
		}

		// should request the data breeches once when the app first loads and store them somewhere
		onMounted(() =>
		{
			passwords.updateValues(stores.encryptedDataStore.passwords.filter((_, i) => i < 4));
			setModels();
			startScan(false);
		});

		watch(() => stores.encryptedDataStore.passwords.length, () =>
		{
			passwords.updateValues(stores.encryptedDataStore.passwords.filter((_, i) => i < 4));
			setModels();
		});

		return {
			color,
			tableRef,
			passwordHeaders,
			tableRowDatas,
			scanning,
			metricModel,
			startScan
		}
	}
})
</script>
<style>
.breachedPasswordsContainer {
	position: absolute;
	padding-top: 10px;
	top: 4%;
	left: 53%;
	width: 25%;
	height: 25.5%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	border-radius: 20px;
	/* background: linear-gradient(145deg, #121a20, #0f161b);
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630; */
	background: rgb(44 44 51 / 16%);
}

.breachedPasswordsContainer__content {
	width: 100%;
	height: 100%;
}

.breachedPasswordsContainer__title {
	font-size: 24px;
	color: white;
	height: 10%;
	padding-top: 1%;
	padding-bottom: 2%;
}

.breachedPasswordsContainer__items {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	height: 82.5%;
}

.breeachedPasswordTable {
	position: relative;
	width: 60%;
	height: 100%;
}

.breachedPasswordsContainer .spinningGlobe {
	position: relative;
	width: 35%;
	height: 100%;
}

.breachedPasswordsContainer__map {
	position: relative;
	width: 70%;
	height: 100%;
	/* background: rgb(44 44 51 / 16%); */
	border-radius: 20px;
}

.breachedPasswordsContainer__metric {
	width: 30%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	margin-top: 10%;
	transform: translateX(-2%);
}

.breachedItemContainer {
	display: flex;
	row-gap: 30px;
	flex-direction: column;
}

.breachedPasswordsContainer__scanButton {
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

.breachedPasswordsContainer__scanButton.scanning {
	color: grey;
	border: 2px solid grey;
	width: 12%;
}

.breachedPasswordsContainer__scanButton:not(.scanning):hover {
	box-shadow: 0 0 25px v-bind(color);
}

/* .breachedPasswordsContainer__scanner {
	position: absolute;
	z-index: 2;
	top: 0%;
	width: 100%;
	height: 5%;
	filter: blur(10px);
	background-color: v-bind(color);
	animation: scan 5s infinite;
}

@keyframes scan {
	0% {
		top: 0%;
	}

	50% {
		top: 100%;
	}

	100% {
		top: 0%;
	}
} */
</style>
