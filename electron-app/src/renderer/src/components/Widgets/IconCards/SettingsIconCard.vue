<template>
	<IconCard :icon="'settings-outline'" :text="'Settings'" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import IconCard from "../../IconCard.vue"

export default defineComponent({
	name: "SettingsIconCard",
	components:
	{
		IconCard
	},
	setup()
	{
	}
})
</script>
<style></style>
