<template>
	<button class="popupButton" :disabled="disabled" @click.stop="onClick">
		{{ text }}
	</button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
	name: "PopupButton",
	emits: ['onClick'],
	props: ['color', 'text', 'width', 'height', 'fontSize', 'disabled'],
	setup(_, ctx)
	{
		function onClick()
		{
			ctx.emit('onClick');
		}

		return {
			onClick
		}
	}
})
</script>

<style>
.popupButton {
	width: v-bind(width);
	height: v-bind(height);
	background-color: var(--app-color);
	color: white;
	border: 2px solid v-bind(color);
	border-radius: 10px;
	transition: 0.3s;
	font-size: v-bind(fontSize);
	animation: fadeIn 1s linear forwards;
	cursor: pointer;
	outline: none;
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
