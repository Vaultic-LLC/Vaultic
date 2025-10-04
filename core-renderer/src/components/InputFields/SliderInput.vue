<template>
    <div class="sliderContainer">
        <div class="sliderContainer__label">{{ label }}</div>
        <Slider class="sliderContainer__slider" v-model="valueHolder" @update:model-value="onInput" :min="minValue" :max="maxValue" 
            :pt="{
                handle: 'sliderContainer__sliderHandle',
                range: 'sliderContainer__sliderRange',
            }"/>
        <div class="sliderContainer__textContainer">
            <InputText :fluid="true" v-model.number="valueHolder" :color="color" @update:model-value="onInput"
                :pt="{
                root: {
                    class: {
                        'sliderContainer__input': true,
                    }
                },
            }" />
        </div>
    </div>
</template>
<script lang="ts">
import { computed, defineComponent, Ref, ref, watch } from 'vue';

import Slider from 'primevue/slider';
import InputText from 'primevue/inputtext';
import { widgetBackgroundHexString } from '../../Constants/Colors';

export default defineComponent({
	name: "SliderInput",
    components: 
    {
        Slider,
        InputText
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "minValue", "maxValue", "width",
        'minWidth', 'maxWidth', "height", 'minHeight', 'maxHeight'],
	setup(props, ctx)
	{
        const valueHolder: Ref<any> = ref(props.modelValue);
        const background: Ref<string> = ref(widgetBackgroundHexString());

        function onInput(value: any)
        {
            valueHolder.value = value;
            ctx.emit('update:modelValue', value);
        }

        watch(() => props.modelValue, () =>
        {
            valueHolder.value = props.modelValue;
        });

		return {
            valueHolder,
            background,
            onInput
		}
	}
})
</script>

<style scoped>
.sliderContainer {
    display: flex;
    width: 100%;
    color: white;
    justify-content: center;
    align-items: center;
    column-gap: 20px;
}

.sliderContainer__label {
    font-size: clamp(10px, 0.7vw, 16px);
}

.sliderContainer__slider {
    flex-grow: 1;
}

.sliderContainer__textContainer {
    position: relative;
    width: clamp(20px, 2.5vw, 50px);
    height: clamp(20px, 2.5vw, 50px);
}

:deep(.sliderContainer__input) {
    height: 100%;
    font-size: var(--input-font-size);
    padding-inline: clamp(5px, 0.45vw, 12px);
    padding-block: clamp(2px, 0.3vw, 8px);
    background: v-bind(background) !important;
}

:deep(.sliderContainer__input:focus) {
    border-color: v-bind(color) !important;
}

:deep(.sliderContainer__sliderHandle) {
    border: clamp(1px, 0.1vw, 3px) solid #3f3f46;
    background: black;
    width: clamp(12px, 0.8vw, 20px) !important;
    height: clamp(12px, 0.8vw, 20px) !important;
    margin-block-start: calc(-1 * calc(clamp(12px, 0.8vw, 20px) / 2)) !important;
    margin-inline-start: calc(-1 * calc(clamp(12px, 0.8vw, 20px) / 2)) !important;
}

:deep(.sliderContainer__sliderHandle::before) {
    content: none !important;
}

:deep(.sliderContainer__sliderHandle:focus-visible) {
    outline-offset: 0;
    outline: v-bind(color) solid;
}

:deep(.sliderContainer__sliderRange) {
    background: v-bind(color);
}
</style>
