<template>
	<div class="textAreaInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<div class="textAreaInputFieldContainer__scrollbar">
			<div ref="scrollThumb" class="textAreaInputFieldContainer__scrollthumb"
				:style="{ 'top': thumbTopString, 'height': thumbHeightString }"></div>
		</div>
		<textarea ref="textArea" required="false" class="textAreaInputFieldContainer__input"
			:class="{ 'textAreaInputFieldContainer__input--noBorderRadius': textAreaStraightBorder }" name="text"
			autocomplete="off" :value="modelValue" @input="onInput(($event.target as HTMLInputElement).value)"
			:disabled="disabled" :maxlength="600" />
		<label class="textAreaInputFieldContainer__label">{{ label }}</label>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { InputColorModel } from '@renderer/Types/Models';

export default defineComponent({

	name: "TextAreaInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "width", "height"],
	setup(props, ctx)
	{
		const textArea: Ref<HTMLElement | null> = ref(null);
		const scrollThumb: Ref<HTMLElement | null> = ref(null);

		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
		let invalid: Ref<boolean> = ref(false);

		const textAreaWidth: ComputedRef<string> = computed(() => (props.width ?? 400) + "px");
		const textAreaHeight: ComputedRef<string> = computed(() => (props.height ?? 200) + "px");

		const thumbTopNumber: Ref<number> = ref(0);
		const thumbTopString: ComputedRef<string> = computed(() => thumbTopNumber.value + "px");

		const thumbHeightNumber: Ref<number> = ref(0);
		const thumbHeightString: ComputedRef<string> = computed(() => thumbHeightNumber.value + "px");
		const textAreaStraightBorder: ComputedRef<boolean> = computed(() => thumbHeightNumber.value != 0);

		let body: HTMLElement | null = null;

		function onScroll(e: any)
		{
			e.preventDefault();
			textArea.value!.scrollTop = textArea.value!.scrollTop - e.wheelDeltaY;
			calcScrollbar();
		}

		let dragging: boolean = false;
		let yStart: number = 0;
		let scrollTop: number = 0;

		function onThumbDrag(e: any)
		{
			dragging = true;
			yStart = e.pageY - textArea.value!.offsetTop;
			scrollTop = textArea.value!.scrollTop;

			body?.addEventListener('mouseup', onThumbDoneDrag);
			body?.addEventListener('mousemove', onMouseMove);
		}

		function onThumbDoneDrag(_: any)
		{
			dragging = false;
			lastScroll = 0;

			body?.removeEventListener('mouseup', onThumbDoneDrag);
			body?.removeEventListener('mousemove', onMouseMove);
		}

		let lastScroll: number = 0;
		function onMouseMove(e: any)
		{
			if (!dragging)
			{
				return;
			}

			const y = e.pageY - textArea.value!.offsetTop;
			const scroll = y - yStart;

			textArea.value!.scrollTop = scrollTop + (scroll);

			const thumbToScroll = scroll - lastScroll;

			// dont' let the thumb go past the text area
			if ((thumbTopNumber.value + thumbHeightNumber.value > textArea.value!.clientHeight && thumbToScroll > 0) ||
				(thumbTopNumber.value == 0 && thumbToScroll < 0))
			{
				return;
			}

			lastScroll = scroll;
			calcScrollbar();
		}

		function onInput(value: string)
		{
			ctx.emit("update:modelValue", value);
			calcScrollbar();
		}

		function calcScrollbar()
		{
			if (textArea.value)
			{
				if (textArea.value.scrollHeight == textArea.value.clientHeight)
				{
					thumbTopNumber.value = 0;
					thumbHeightNumber.value = 0;

					return;
				}

				thumbTopNumber.value = Math.floor(textArea.value.scrollTop / textArea.value.scrollHeight * textArea.value.clientHeight);
				thumbHeightNumber.value = Math.floor(textArea.value.clientHeight / textArea.value.scrollHeight * textArea.value.clientHeight);
			}
		}

		onMounted(() =>
		{
			body = document.getElementById('body');
			if (textArea.value)
			{
				textArea.value!.addEventListener("wheel", onScroll);
			}

			if (scrollThumb.value)
			{
				scrollThumb.value.addEventListener("mousedown", onThumbDrag);
				scrollThumb.value.addEventListener("mouseup", onThumbDoneDrag);
				scrollThumb.value.addEventListener("mousemove", onMouseMove);
			}

			calcScrollbar();
		});

		onUnmounted(() =>
		{
			textArea.value?.removeEventListener("wheel", onScroll)
		});

		return {
			shouldFadeIn,
			invalid,
			defaultInputColor,
			defaultInputTextColor,
			textAreaWidth,
			textAreaHeight,
			colorModel,
			thumbTopString,
			thumbHeightString,
			textArea,
			textAreaStraightBorder,
			scrollThumb,
			onInput
		}
	}
})
</script>

<style scoped>
.textAreaInputFieldContainer {
	position: relative;
	height: v-bind(textAreaHeight);
	width: v-bind(textAreaWidth);
	display: flex;
	/* border: solid 1.5px v-bind('colorModel.borderColor');
	border-radius: 1rem;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1); */
}

.textAreaInputFieldContainer.fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

/* .textAreaInputFieldContainer.active {
	border: 1.5px solid v-bind('colorModel.activeBorderColor');
} */

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.textAreaInputFieldContainer__input {
	position: absolute;
	width: inherit;
	height: inherit;
	left: 0;
	color: white;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
	resize: none;
	padding: 5px;
	overflow: hidden;
	border: solid 1.5px v-bind('colorModel.borderColor');
	font-family: Avenir, Helvetica, Arial, sans-serif !important;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.textAreaInputFieldContainer__label {
	position: absolute;
	left: 10px;
	top: 0;
	color: v-bind('colorModel.textColor');
	pointer-events: none;
	transform: translateY(1rem);
	transition: var(--input-label-transition);
}

.textAreaInputFieldContainer__input:focus,
.textAreaInputFieldContainer__input:valid {
	outline: none;
	border: 1.5px solid v-bind('colorModel.activeBorderColor');
}

.textAreaInputFieldContainer__input:focus~label,
.textAreaInputFieldContainer__input:valid~label,
.textAreaInputFieldContainer__input:disabled~label {
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind('colorModel.activeTextColor');
	left: 0px;
}

.textAreaInputFieldContainer__input--noBorderRadius {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.textAreaInputFieldContainer__scrollbar {
	position: absolute;
	height: inherit;
	width: 2.5%;
	left: -2.4%;
	transition: 0.3s;
}

.textAreaInputFieldContainer__scrollthumb {
	position: absolute;
	width: 100%;
	left: -5%;
	background: v-bind('colorModel.activeBorderColor');
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
	transition: 0.3s;
}
</style>
