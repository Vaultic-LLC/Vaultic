<template>
	<TableTemplate id="passwordTable" :color="color" :style="{ height: '55%', width: '45%', left: '28%', top: '42%' }">
		<template #header>
			<TableHeader :headers="headers" />
		</template>
		<template #body>
			<CollapsibleTableRow v-slot="props" v-for="(password, index) in passwordsToUse" :key="password.id"
				:groups="password.groups" :table-values="[password.passwordFor, password.login]" :rowNumber="index"
				:color="color">
				<PasswordRow :password="password" :authenticationPromise="props.authenticationPromise" />
			</CollapsibleTableRow>
		</template>
	</TableTemplate>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';
import { PasswordStore } from '../../../Objects/Stores/PasswordStore';
import PasswordRow from './PasswordRow.vue';
import TableHeader from '../TableHeader.vue';
import TableTemplate from '../TableTemplate.vue';
import CollapsibleTableRow from '../CollapsibleTableRow.vue';
import { stores } from '../../../Objects/Stores';

export default defineComponent({
	name: "PasswordTable",
	components: {
		PasswordRow,
		TableHeader,
		TableTemplate,
		CollapsibleTableRow
	},
	props: ["passwords"],
	setup(props)
	{
		// add empty th after all info for gap between info and icons
		const headers: string[] = ["Groups", "For", "Login", ""];
		const passwordsToUse: ComputedRef<PasswordStore[]> = computed(() => props.passwords);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.passwordsColor.primaryColor);

		return {
			headers,
			passwordsToUse,
			color
		}
	}
})
</script>

<style></style>
