<template>
	<th class="sizingHeaderCell">
	</th>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// component used to force the table cell widths.
export default defineComponent({
	name: "TableTemplate",
	props: ['width'],
	setup()
	{
		return {

		}
	},
})
</script>

<style scoped>
.sizingHeaderCell {
	width: v-bind(width);
	height: 0;
	padding: 0;
}
</style>
