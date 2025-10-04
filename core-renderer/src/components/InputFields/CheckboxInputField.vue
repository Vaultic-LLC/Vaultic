<template>
    <div class="checkboxInputContainer">
        <Checkbox :inputId="id" v-model="checked" binary :disabled="disabled" @update:modelValue="onClick"
            :pt="{
                root: 'checkboxInputContainer__checkbox',
                box: 'checkboxInputContainer__box',
                icon: 'checkboxInputContainer__icon'
            }" />
        <label :for="id" class="checkboxInputFieldLabel">{{ label }}</label>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch, useId } from 'vue';

import Checkbox from 'primevue/checkbox';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { widgetBackgroundHexString } from '../../Constants/Colors';

export default defineComponent({
    name: "CheckboxInputField",
    components:
    {
        Checkbox
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", "height", "minHeight", "maxHeight", "fontSize"],
    setup(props, ctx)
    {
        const id = ref(useId());
        const checked: Ref<boolean> = ref(props.modelValue);

        const backgroundColor: Ref<string> = ref(widgetBackgroundHexString());
        const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : "auto")
        const computedHeight: ComputedRef<string> = computed(() => props.height ? props.height : "20px");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "5px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "20px");
        const computedFontSize: ComputedRef<string> = computed(() => props.fontSize ? props.fontSize : "clamp(10px, 1vh, 20px)")

        function onClick()
        {
            if (props.disabled)
            {
                return;
            }

            ctx.emit("update:modelValue", checked.value);
        }

        watch(() => props.modelValue, (newValue) =>
        {
            checked.value = newValue;
        });

        return {
            id,
            defaultInputColor,
            defaultInputTextColor,
            checked,
            computedWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            computedFontSize,
            backgroundColor,
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
    column-gap: clamp(5px, 0.4vw, 10px);
}

.checkboxInputContainer .checkboxInputFieldLabel {
    color: white;
    font-size: v-bind(computedFontSize);
}

:deep(.checkboxInputContainer__checkbox) {
    height: 100% !important;
    aspect-ratio: 1 / 1 !important;
    width: auto !important;
}

:deep(.checkboxInputContainer__icon) {
    color: white !important;
}

:deep(.checkboxInputContainer__box) {
    background: v-bind(backgroundColor) !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: 3px !important;
}

:deep(.p-checkbox-checked .p-checkbox-box.checkboxInputContainer__box) {
    border-color: v-bind(color) !important;
}

:deep(.p-checkbox:not(.p-disabled):has(.p-checkbox-input:focus-visible) .checkboxInputContainer__box) {
    outline: none !important;
    box-shadow: 0 0 15px v-bind(color) !important;
}
</style>
