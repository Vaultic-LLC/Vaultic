<template>
	<div class="breachedPasswordsContainer">
		<div class="breachedPasswordTitle">Breached Passwords</div>
		<div class="breachedPasswordsContainer__items">
			<div class="breachedItemContainer spinningGlobe">
				<SpinningGlobe />
				<div class="breachedPasswordsContainer__scanner">
				</div>
			</div>
			<div class="breachedItemContainer breeachedPasswordTable">
				<TableTemplate ref="tableRef" :color="color" class="shadow scrollbar" :scrollbar-size="1"
					@scrolledToBottom="tableRowDatas.loadNextChunk()" :style="{ 'position': 'relative' }" :rowGap="10">
					<template #header>
						<TableHeaderRow :model="passwordHeaders" :defaultActiveHeader="1" :backgroundColor="'#121a20'" />
					</template>
					<template #body>
						<TableRow v-for="(model, index) in tableRowDatas.visualValues" :key="model.id" :model="model"
							:rowNumber="index" :allowPin="false" :allowDelete="false" :allowEdit="true" class="shadow hover"
							:style="{ 'height': '70px' }" :color="color" />
					</template>
				</TableTemplate>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import SpinningGlobe from './SpinningGlobe.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import TableRow from '../Table/Rows/TableRow.vue';

import { stores } from '../../Objects/Stores';
import { HeaderDisplayField } from '../../Types/EncryptedData';
import { IGroupableSortedCollection, SortedCollection } from '@renderer/Objects/DataStructures/SortedCollections';
import { PasswordStore } from '@renderer/Objects/Stores/PasswordStore';
import { DataType } from '@renderer/Types/Table';
import { SortableHeaderModel, TableRowData, emptyHeader } from '@renderer/Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { createSortableHeaderModels } from '@renderer/Helpers/ModelHelper';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';

export default defineComponent({
	name: "BreachedPasswords",
	components:
	{
		SpinningGlobe,
		TableTemplate,
		TableHeaderRow,
		TableRow
	},
	setup()
	{
		const tableRef: Ref<HTMLElement | null> = ref(null);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const passwords: SortedCollection<PasswordStore> = new IGroupableSortedCollection(DataType.Passwords, [], "passwordFor");
		const tableRowDatas: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection());

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


		// should request the data breeches once when the app first loads and store them somewhere
		onMounted(() =>
		{
			passwords.updateValues(stores.encryptedDataStore.passwords.filter((_, i) => i < 3));
			setModels();
		});

		watch(() => stores.encryptedDataStore.passwords.length, () =>
		{
			passwords.updateValues(stores.encryptedDataStore.passwords.filter((_, i) => i < 3));
			setModels();
		});

		return {
			color,
			tableRef,
			passwordHeaders,
			tableRowDatas
		}
	}
})
</script>
<style>
.breachedPasswordsContainer {
	position: absolute;
	padding-top: 10px;
	top: 4%;
	left: 33%;
	width: 45%;
	height: 25%;
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

.breachedPasswordsContainer__items {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	height: 100%;
}

.breeachedPasswordTable {
	position: relative;
	width: 50%;
	height: 100%;
}

.breachedPasswordsContainer .spinningGlobe {
	position: relative;
	/* width: 45%; */
	height: 100%;
}

.breachedItemContainer {
	display: flex;
	row-gap: 30px;
	flex-direction: column;
}

.breachedPasswordTitle {
	font-size: 24px;
	color: white;
}

.breachedPasswordsContainer__scanner {
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
}
</style>
