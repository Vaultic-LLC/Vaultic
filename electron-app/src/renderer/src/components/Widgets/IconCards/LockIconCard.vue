<template>
	<IconCard :icon="'lock-closed-outline'" :text="'Lock'" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import IconCard from "../../IconCard.vue"

export default defineComponent({
	name: "LockIconCard",
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
