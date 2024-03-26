<template>
	<div class="checkboxInputContainer" :class="{ fadeIn: shouldFadeIn }">
		<div class="checkboxInputCheckbox" :class="{ checked: checked, disabled: disabled }" @click="onClick">
			<ion-icon class="checkedIcon" v-if="checked" name="checkmark-outline"></ion-icon>
		</div>
		<label class="checkboxInputFieldLabel" :class="{ disabled: disabled }">{{ label }}</label>
		<input class="checkboxInputField" type="checkbox" />
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"

export default defineComponent({
	name: "CheckboxInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", "height", "minHeight", "maxHeight"],
	setup(props, ctx)
	{
		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		const checked: Ref<boolean> = ref(props.modelValue);

		const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : "auto")
		const computedHeight: ComputedRef<string> = computed(() => props.height ? props.height : "20px");
		const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "5px");
		const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "20px");

		function onClick()
		{
			if (props.disabled)
			{
				return;
			}

			checked.value = !checked.value;
			ctx.emit("update:modelValue", checked.value);
		}

		watch(() => props.modelValue, (newValue) =>
		{
			checked.value = newValue;
		});

		return {
			shouldFadeIn,
			defaultInputColor,
			defaultInputTextColor,
			checked,
			computedWidth,
			computedHeight,
			computedMinHeight,
			computedMaxHeight,
			onClick
		}
	}
})
</script>

<style scoped>
.checkboxInputContainer {
	height: v-bind(computedHeight);
	width: v-bind(computedWidth);
	min-height: v-bind(computedMinHeight);
	max-height: v-bind(computedMaxHeight);
	position: relative;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	column-gap: 10px;
}

.checkboxInputContainer.fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

.checkboxInputCheckbox {
	background-color: var(--app-color);
	border: 1.5px solid white;
	border-radius: 30%;
	height: v-bind(computedHeight);
	min-height: v-bind(computedMinHeight);
	max-height: v-bind(computedMaxHeight);
	aspect-ratio: 1 /1;
	transition: 0.3s;
	display: flex;
	justify-content: center;
	align-items: center;
}

.checkboxInputCheckbox.disabled {
	border: 1.5px solid grey;
}

.checkboxInputCheckbox .checkedIcon {
	color: white;
	font-size: 18px;
}

.checkboxInputCheckbox.checked {
	border: 1.5px solid v-bind(color);
}

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.checkboxInputContainer .checkboxInputFieldLabel {
	color: white;
	font-size: clamp(10px, 1vh, 20px);
}

.checkboxInputContainer .checkboxInputFieldLabel.disabled {
	color: grey;
}

.checkboxInputField {
	position: absolute;
	display: none;
}
</style>
