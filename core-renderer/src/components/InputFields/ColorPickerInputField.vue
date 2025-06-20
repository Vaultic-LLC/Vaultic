<template>
    <div class="colorPickerInputFieldContainer">
        <FloatLabel variant="in"
            :pt="{
                root: 'colorPickerInputFieldContainer__floatLabel'
            }">
            <InputText :pt="{
                root: {
                    'data-coloris': 'true',
                    class: {
                        'colorPickerInputFieldContainer__inputText': true
                    }
                }
            }" :fluid="true" :invalid="isInvalid" :id="id" v-model="pickedColor" @update:model-value="onColorSelected" />
            <label class="colorPickerInputFieldContainer__label" :for="id">{{ label }}</label>
            <ColorPicker :pt="{
                root: 'colorPickerIcon',
                preview: {
                    style: {
                        opacity: '1 !important'
                    },
                    class: 'colorPickerInputFieldContainer__colorPreview'
                }
            }" v-model="pickedColor" :disabled="true" :defaultColor="defaultColor" :format="'hex'" />
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
                :pt="{
                    root: 'colorPickerInputFieldContainer__message',
                    text: 'colorPickerInputFieldContainer__messageText'
                }">{{ invalidMessage }}
        </Message>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId } from 'vue';

import FloatLabel from 'primevue-vaultic/floatlabel';
import InputText from 'primevue-vaultic/inputtext';
import ColorPicker from 'primevue-vaultic/colorpicker';
import IconField from 'primevue-vaultic/iconfield';
import Message from "primevue-vaultic/message";

import { ValidationFunctionsKey } from '../../Constants/Keys';
import { widgetBackgroundHexString } from '../../Constants/Colors';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "ColorPickerInputField",
    components: 
    {
        FloatLabel,
        InputText,
        ColorPicker,
        IconField,
        Message
    },
    emits: ["update:modelValue"],
    props: ['modelValue', 'color', 'label', "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight'],
    setup(props, ctx)
    {
        const id = ref(useId());
        
        const backgroundColor: Ref<string> = ref(widgetBackgroundHexString());
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);
        let defaultColor: Ref<string> = ref(widgetBackgroundHexString());
        let pickedColor: Ref<string> = ref(props.modelValue);

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));

        function validate()
        {
            isInvalid.value = false;
            if (pickedColor.value == '' || pickedColor.value == undefined)
            {
                invalidate("Please pick a color");
                return false;
            }

            return true;
        }

        function invalidate(message: string)
        {
            isInvalid.value = true;
            invalidMessage.value = message;
        }

        function onColorSelected(color: string | undefined)
        {
            isInvalid.value = false;
            ctx.emit('update:modelValue', color);
        }

        onMounted(() =>
        {
            validationFunction?.value.push(validate);
        });

        onUnmounted(() =>
        {
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            id,
            backgroundColor,
            defaultColor,
            pickedColor,
            errorColor,
            isInvalid,
            invalidMessage,
            onColorSelected,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight
        }
    }
})
</script>

<style scoped>
.colorPickerInputFieldContainer {
    position: relative;
    height: v-bind(computedHeight);
    width: v-bind(computedWidth);
    max-height: v-bind(computedMaxHeight);
    max-width: v-bind(computedMaxWidth);
    min-height: v-bind(computedMinHeight);
    min-width: v-bind(computedMinWidth);
    background: none;
}

.colorPickerInputFieldContainer.active {
    outline: none;
    border: 1.5px solid v-bind(color);
}

:deep(.colorPickerInputFieldContainer__floatLabel) {
    height: 100%;
}

:deep(.colorPickerInputFieldContainer__inputText) {
    height: 100%;
    font-size: var(--input-font-size) !important;
    background: v-bind(backgroundColor) !important;
    padding-block-start: var(--input-padding-block-start) !important;
}

:deep(.colorPickerInputFieldContainer__inputText:focus) {
    border-color: v-bind(color) !important;
}

:deep(.colorPickerInputFieldContainer__inputText.p-invalid) {
    border-color: v-bind(errorColor) !important;
}

:deep(.colorPickerInputFieldContainer__label) {
    font-size: var(--input-font-size) !important;
}

:deep(.p-floatlabel-in:has(input:focus) .colorPickerInputFieldContainer__label),
:deep(.p-floatlabel-in:has(input.p-filled) .colorPickerInputFieldContainer__label) {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.p-floatlabel:has(input:focus) .colorPickerInputFieldContainer__label) {
    color: v-bind(color) !important;
}

:deep(.p-floatlabel:has(.p-invalid) .colorPickerInputFieldContainer__label) {
    color: v-bind(errorColor);
}

.colorPickerIcon {
    position: absolute !important;
    top: 50%;
    transform: translateY(-50%);
    right: 5%;
}

:deep(.colorPickerInputFieldContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}

:deep(.colorPickerInputFieldContainer__colorPreview) {
    height: clamp(15px, 1vw, 24px) !important;
    width: clamp(15px, 1vw, 24px) !important;
    background: v-bind(pickedColor) !important;
}

:deep(.colorPickerInputFieldContainer__messageText) {
    color: v-bind(errorColor);
    font-size: clamp(9px, 1vw, 14px) !important;
}
</style>
