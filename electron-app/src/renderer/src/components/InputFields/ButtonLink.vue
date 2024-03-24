<template>
	<button class="buttonLink" @click="doOnClick">
		{{ text }}
	</button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: "CheckboxInputField",
	emits: ["onClick"],
	props: ["color", "text"],
	setup(_, ctx)
	{
		function doOnClick()
		{
			ctx.emit("onClick");
		}

		return {
			doOnClick
		}
	}
})
</script>

<style>
.buttonLink {
	background-color: var(--app-color);
	color: v-bind(color);
	text-decoration: underline;
	border: none;
	cursor: pointer;
	font-size: clamp(13px, 1vw, 20px);
	padding: 0;
}

.buttonLink:hover {
	opacity: 0.8;
}
</style>
