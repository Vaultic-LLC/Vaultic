<template>
	<button ref="button" class="popupButton" :disabled="disabled" @click.stop="doOnClick">
		{{ text }}
	</button>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, onUnmounted, ref } from "vue";

export default defineComponent({
	name: "PopupButton",
	emits: ['onClick'],
	props: ['color', 'text', 'width', 'maxWidth', 'minWidth', 'height', 'minHeight', 'fontSize', 'minFontSize', 'maxFontSize',
		'disabled', 'isSubmit'],
	setup(props, ctx)
	{
		const button: Ref<HTMLElement | null> = ref(null);

		function doOnClick()
		{
			button.value?.blur();
			ctx.emit('onClick');
		}

		function onKeyUp(e: KeyboardEvent)
		{
			if (e.key === 'Enter')
			{
				e.stopPropagation();
				doOnClick();
			}
		}

		onMounted(() =>
		{
			if (props.isSubmit)
			{
				window.addEventListener("keyup", onKeyUp);
			}
		});

		onUnmounted(() =>
		{
			if (props.isSubmit)
			{
				window.removeEventListener("keyup", onKeyUp)
			}
		});

		return {
			button,
			doOnClick
		}
	}
})
</script>

<style>
.popupButton {
	width: v-bind(width);
	height: v-bind(height);
	max-width: v-bind(maxWidth);
	min-width: v-bind(minWidth);
	background-color: var(--app-color);
	color: white;
	border: 2px solid v-bind(color);
	border-radius: 10px;
	transition: 0.3s;
	font-size: clamp(v-bind(minFontSize), v-bind(fontSize), v-bind(maxFontSize));
	animation: fadeIn 1s linear forwards;
	cursor: pointer;
	outline: none;
	padding: 2px;
}

.popupButton:hover,
.popupButton:focus {
	box-shadow: 0 0 25px v-bind(color);
}

.popupButton:disabled,
.popupButton.disabled {
	box-shadow: 0 0 0 0;
	border: 2px solid gray;
	color: gray;
}
</style>
