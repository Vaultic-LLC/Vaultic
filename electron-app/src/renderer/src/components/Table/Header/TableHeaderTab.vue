<template>
	<div class="tableHeaderTab">
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import TableHeaderCell from './TableHeaderCell.vue';

import { HeaderTabModel } from '../../../Types/Models';

export default defineComponent({
	name: "TableHeaderTab",
	components:
	{
		TableHeaderCell,
	},
	props: ["model"],
	setup(props)
	{
		const tabModel: ComputedRef<HeaderTabModel> = computed(() => props.model);

		return {
		}
	}
})
</script>

<style></style>
