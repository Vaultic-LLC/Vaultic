<template>
	<IconCard :icon="'alert-circle-outline'" :text="'About'" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import IconCard from "../../IconCard.vue"

export default defineComponent({
	name: "AboutIconCard",
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
