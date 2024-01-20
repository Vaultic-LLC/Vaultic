<template>
	<IconCard :icon="'expand-outline'" :text="'Layout'" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import IconCard from "../../IconCard.vue"

export default defineComponent({
	name: "LayoutIconCard",
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
