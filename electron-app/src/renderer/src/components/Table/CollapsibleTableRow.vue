<template>
	<TableRow class="hover" :class="{ shadow: shadow, isOpen: showCollapseRow || stayOpen }" @click="toggleCollapseContent"
		:model="model" :rowNumber="rowNumber" :color="color" :allowPin="true" :allowEdit="true" :allowDelete="true"
		:hideAtRisk="false" :clickable="true" :style="{ 'height': '100px' }">
		<td class="groupCell">
			<GroupIcon v-for="group in currentGroups" :key="group.id" :group="group" />
		</td>
	</TableRow>
	<tr class="collapseRow">
		<slot :authenticationPromise="authPromise" :isShowing="showCollapseRow"></slot>
	</tr>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, Ref, ref } from 'vue';
import GroupIcon from './GroupIcon.vue';
import TableRow from "../Table/Rows/TableRow.vue"
import { Group } from '../../Types/Table';
import { stores } from '../../Objects/Stores';
import { RequestAuthenticationFunctionKey } from '../../Types/Keys';

export default defineComponent({
	name: "CollapsibleTableRow",
	components:
	{
		GroupIcon,
		TableRow
	},
	props: ["groups", "model", "rowNumber", "color", "shadow"],
	setup(props)
	{
		let showCollapseRow: Ref<boolean> = ref(false);
		let stayOpen: Ref<boolean> = ref(false);

		let authPromise: Ref<Promise<string> | undefined> = ref(undefined);
		let reqAuth: Ref<boolean> = ref(false);

		let resolveFunc: (key: string) => void;
		let rejectFunc: () => void;

		let currentGroups: ComputedRef<Group[]> = computed(() => stores.groupStore.groups.filter(g => props.groups.includes(g.id)));

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);

		function toggleCollapseContent()
		{
			if (showCollapseRow.value)
			{
				showCollapseRow.value = false
				setTimeout(() => stayOpen.value = false, 1500);
				return;
			}

			// reqAuth.value = true;
			if (requestAuthFunc)
			{
				requestAuthFunc(onAuthenticationSuccessful, onAuthenticationCanceld);
				authPromise.value = new Promise((resolve, reject) =>
				{
					resolveFunc = resolve;
					rejectFunc = reject;
				});
			}
		}

		function onAuthenticationSuccessful(key: string)
		{
			showCollapseRow.value = true;
			stayOpen.value = true;
			// reqAuth.value = false;

			resolveFunc(key);
		}

		function onAuthenticationCanceld()
		{
			rejectFunc();
		}

		return {
			reqAuth,
			showCollapseRow,
			stayOpen,
			currentGroups,
			authPromise,
			toggleCollapseContent,
			onAuthenticationSuccessful
		};
	}
})
</script>
<style></style>
