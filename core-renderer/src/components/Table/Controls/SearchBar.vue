<template>
	<div class="searchBarContainer">
        <FloatLabel variant="in"
            :pt="{
                root: 'searchBarContainer__floatLabel'
            }">
            <IconField 
                :pt="{
                    root: 'searchBarContainer__iconField'
                }">
                <InputIcon class="pi pi-search" 
                    :pt="{
                        root: 'searchBarContainer__inputIcon'
                    }" />
                <InputText size="small" :id="id" v-model="placeholderValue" :fluid="true" autocomplete="off" @update:model-value="onInput"
                    :pt="{
                        root: 'searchBarContainer__inputText'
                    }" />
            </IconField>
            <label class="searchBarContainer__label" :for="id">Search</label>
        </FloatLabel>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, useId } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../../Types/Colors"
import { widgetBackgroundHexString } from '../../../Constants/Colors';

import FloatLabel from "primevue/floatlabel";
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';
import { ComponentSizeModel } from '../../../Types/Models';

export default defineComponent({
	name: "SearchBar",
    components: 
    {
        FloatLabel,
        InputText,
        InputIcon,
        IconField
    },
	emits: ["update:modelValue"],
	props: ["modelValue", "color", "labelBackground", "sizeModel"],
	setup(props, ctx)
	{
        const id = ref(useId());

        const background: Ref<string> = ref(widgetBackgroundHexString());
        const sizeModel: ComputedRef<ComponentSizeModel> = computed(() => props.sizeModel);

		const computedWidth: ComputedRef<string> = computed(() => sizeModel.value?.width ?? "300px");
		const computedHeight: ComputedRef<string> = computed(() => sizeModel.value?.height ?? '4vh');
		const computedMinHeight: ComputedRef<string> = computed(() => sizeModel.value?.minHeight ?? '30px');

        const modelValue: Ref<string> = ref(props.modelValue);
        const placeholderValue: Ref<string> = ref(modelValue.value);

		function onInput(value: string | undefined)
		{
			modelValue.value = value ?? '';
            ctx.emit("update:modelValue", value);
		}

		return {
            id,
            background,
            sizeModel,
            placeholderValue,
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			computedHeight,
			computedMinHeight,
			onInput
		}
	}
})
</script>

<style scoped>
.searchBarContainer {
	position: relative;
	height: v-bind(computedHeight);
	min-height: v-bind(computedMinHeight);
	max-height: 50px;
	width: v-bind('computedWidth');
	min-width: v-bind('sizeModel?.minWidth');
	max-width: v-bind('sizeModel?.maxWidth');
}

:deep(.searchBarContainer__floatLabel) {
    height: 100%;
}

:deep(.searchBarContainer__iconField) {
    height: 100%;
}

:deep(.searchBarContainer__inputIcon) {
    font-size: clamp(9px, 1vw, 14px) !important;
    display: flex !important;
    align-items: center;
}

:deep(.searchBarContainer__inputText) {
    padding-inline-start: clamp(30px, 2vw, 40px) !important;
    height: 100%;
    font-size: var(--input-font-size) !important;
    padding-block-start: clamp(18px, 1.5vw, 24px) !important;
    background: v-bind(background) !important;
}

.searchBarContainer__label {
    font-size: var(--input-font-size) !important;
    inset-inline-start: clamp(30px, 2vw, 40px) !important;
}

:deep(.p-floatlabel-in:has(input:focus) .searchBarContainer__label),
:deep(.p-floatlabel-in:has(input.p-filled) .searchBarContainer__label) {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.p-inputtext:enabled:focus) {
    border-color: v-bind(color) !important;
}

:deep(.p-floatlabel:has(input:focus) .searchBarContainer__label) {
    color: v-bind(color) !important;
}
</style>
