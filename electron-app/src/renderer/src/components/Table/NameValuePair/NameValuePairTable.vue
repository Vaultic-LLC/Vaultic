<template>
	<TableTemplate :color="color" :style="{ height: '55%', width: '45%', left: '28%', top: '42%' }">
		<template #header>
			<TableHeader :headers="headers" />
		</template>
		<template #body>
			<CollapsibleTableRow v-slot="props" v-for="(nvp, index) in nameValuePairs" :key="nvp.id" :groups="nvp.groups"
				:table-values="[nvp.name]" :rowNumber="index" :color="color">
				<NameValuePairRow :nameValuePair="nvp" :authenticationPromise="props.authenticationPromise" />
			</CollapsibleTableRow>
		</template>
	</TableTemplate>
</template>


<script lang="ts">
import { defineComponent, computed, ComputedRef } from 'vue';
import TableHeader from '../TableHeader.vue';
import TableTemplate from '../TableTemplate.vue';
import CollapsibleTableRow from '../CollapsibleTableRow.vue';
import NameValuePairRow from './NameValuePairRow.vue';
import { NameValuePairStore } from '../../../Objects/Stores/NameValuePairStore';
import { stores } from '../../../Objects/Stores';

export default defineComponent({
	name: "NameValuePairTable",
	components: {
		NameValuePairRow,
		TableHeader,
		TableTemplate,
		CollapsibleTableRow
	},
	props: ["nameValuePairs"],
	setup(props)
	{
		const headers: string[] = ["Groups", "Name", ""];
		let nameValuePairsToUse: ComputedRef<NameValuePairStore[]> = computed(() => props.nameValuePairs);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.valuesColor.primaryColor);

		return {
			headers,
			nameValuePairsToUse,
			color
		}
	}
})
</script>
