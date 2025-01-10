<template>
    <div class="sliderContainer">
        <Slider v-model="valueHolder" @update:model-value="onInput" :min="minValue" :max="maxValue" />
        <TextInputField v-model.number="valueHolder" :color="color" :width="'5vw'" :minWidth="''" :maxWidth="''" 
            @update:model-value="onInput" />
    </div>
</template>
<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';

import Slider from 'primevue/slider';
import TextInputField from './TextInputField.vue';

export default defineComponent({
	name: "SliderInput",
    components: 
    {
        Slider,
        TextInputField
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "minValue", "maxValue", "width",
        'minWidth', 'maxWidth', "height", 'minHeight', 'maxHeight'],
	setup(props, ctx)
	{
        const valueHolder: Ref<number | number[]> = ref(props.modelValue);

        function onInput(value: number | number[])
        {
            valueHolder.value = value;
            ctx.emit('update:modelValue', value);
        }

		return {
            valueHolder,
            onInput
		}
	}
})
</script>

<style>
</style>
