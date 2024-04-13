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
import { appHexColor, widgetInputLabelBackgroundHexColor } from '@renderer/Constants/Colors';

export default defineComponent({

	name: "TextAreaInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "isOnWidget", "width", 'minWidth', 'maxWidth', "height", 'minHeight', 'maxHeight'],
	setup(props, ctx)
	{
		const textArea: Ref<HTMLElement | null> = ref(null);
		const scrollThumb: Ref<HTMLElement | null> = ref(null);

		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
		let invalid: Ref<boolean> = ref(false);

		const textAreaWidth: ComputedRef<string> = computed(() => props.width ?? "400px");
		const textAreaHeight: ComputedRef<string> = computed(() => props.height ?? "200px");

		const thumbTopNumber: Ref<number> = ref(0);
		const thumbTopString: ComputedRef<string> = computed(() => thumbTopNumber.value + "px");

		const thumbHeightNumber: Ref<number> = ref(0);
		const thumbHeightString: ComputedRef<string> = computed(() => thumbHeightNumber.value + "px");
		const textAreaStraightBorder: ComputedRef<boolean> = computed(() => thumbHeightNumber.value != 0);

		const labelBackgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());
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
			labelBackgroundColor,
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
	min-height: v-bind(minHeight);
	min-width: v-bind(minWidth);
	max-height: v-bind(maxHeight);
	max-width: v-bind(maxWidth);
	display: flex;
}

.textAreaInputFieldContainer.fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

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
	width: 100%;
	height: 100%;
	left: 0;
	color: white;
	border-radius: var(--input-border-radius);
	background: none;
	font-size: clamp(11px, 1.2vh, 25px);
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
	background-color: v-bind(labelBackgroundColor);
	pointer-events: none;
	transform: translateY(min(1vw, 15px));
	transition: var(--input-label-transition);
	font-size: clamp(11px, 1.2vh, 25px);
	will-change: transform;
}

.textAreaInputFieldContainer__input:focus,
.textAreaInputFieldContainer__input:valid {
	outline: none;
	border: 1.5px solid v-bind('colorModel.activeBorderColor');
}

.textAreaInputFieldContainer__input:focus~label,
.textAreaInputFieldContainer__input:valid~label,
.textAreaInputFieldContainer__input:disabled~label {
	transform: translateY(-70%) scale(0.8);
	background-color: v-bind(labelBackgroundColor);
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
