<template>
	<button ref="button" class="buttonLink" @click="doOnClick">
		{{ text }}
	</button>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

export default defineComponent({
	name: "ButtonLink",
	emits: ["onClick"],
	props: ["color", "text", "fontSize"],
	setup(props, ctx)
	{
		const button: Ref<HTMLElement | null> = ref(null);
		const computedFontSize: ComputedRef<string> = computed(() => props.fontSize ? props.fontSize : 'clamp(13px, 1vw, 20px)');

		function doOnClick()
		{
			ctx.emit("onClick");
			button.value?.blur();
		}

		return {
			button,
			computedFontSize,
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
	font-size: v-bind(computedFontSize);
	padding: 0;
	outline: none;
	will-change: opacity;
}

.buttonLink:hover,
.buttonLink:focus {
	opacity: 0.8;
}
</style>
