<template>
	<div class="searchBarContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText :dt="inputStyle" size="small" :id="id" v-model="placeholderValue" :fluid="true" autocomplete="off" @update:model-value="onInput" />
            </IconField>
            <label :for="id">Search</label>
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

        const sizeModel: ComputedRef<ComponentSizeModel> = computed(() => props.sizeModel);

		const computedWidth: ComputedRef<string> = computed(() => sizeModel.value?.width ?? "300px");
		const computedHeight: ComputedRef<string> = computed(() => sizeModel.value?.height ?? '4vh');
		const computedMinHeight: ComputedRef<string> = computed(() => sizeModel.value?.minHeight ?? '30px');

        const modelValue: Ref<string> = ref(props.modelValue);
        const placeholderValue: Ref<string> = ref(modelValue.value);

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: props.color,
                }
            }
        });

        let inputStyle = computed(() => {
            return {
                focus: 
                {
                    borderColor: props.color
                },
                background: widgetBackgroundHexString()
            }
        });

		function onInput(value: string | undefined)
		{
			modelValue.value = value ?? '';
            ctx.emit("update:modelValue", value);
		}

		return {
            id,
            sizeModel,
            placeholderValue,
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			computedHeight,
			computedMinHeight,
            floatLabelStyle,
            inputStyle,
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

</style>
