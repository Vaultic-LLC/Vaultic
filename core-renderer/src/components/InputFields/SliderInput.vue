<template>
    <div class="sliderContainer">
        <div class="sliderContainer__label">{{ label }}</div>
        <Slider :dt="sliderStyle" class="sliderContainer__slider" v-model="valueHolder" @update:model-value="onInput" :min="minValue" :max="maxValue" 
            :pt="{
                handle: 'sliderContainer__sliderHandle'
            }"/>
        <div class="sliderContainer__textContainer">
            <InputText :dt="inputStyle" :fluid="true" v-model.number="valueHolder" :color="color" @update:model-value="onInput"
                :pt="{
                root: {
                    class: {
                        'sliderContainer__input': true,
                    }
                }
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

        let sliderStyle = computed(() => {
            return {
                range: 
                {
                    background: props.color
                },
                handle: 
                {
                    width: 'clamp(12px, 0.8vw, 20px)',
                    height: 'clamp(12px, 0.8vw, 20px)'
                }
            }
        });

        let inputStyle = computed(() => {
            return {
                focus: 
                {
                    borderColor: props.color
                },
                background: background.value
            }
        });

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
            sliderStyle,
            inputStyle,
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
}

:deep(.sliderContainer__sliderHandle) {
    border: clamp(1px, 0.1vw, 3px) solid #3f3f46;
    background: black;
}

:deep(.sliderContainer__sliderHandle::before) {
    content: none !important;
}
</style>
