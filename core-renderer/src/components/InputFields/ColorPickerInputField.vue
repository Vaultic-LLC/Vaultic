<template>
    <div class="colorPickerInputFieldContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <InputText :pt="{
                root: {
                    'data-coloris': 'true'
                }
            }" :fluid="true" :invalid="isInvalid" :id="id" v-model="pickedColor" :dt="inputStyle" @update:model-value="onColorSelected" />
            <label :for="id">{{ label }}</label>
            <ColorPicker :pt="{
                root: 'colorPickerIcon',
                preview: {
                    style: {
                        opacity: '1 !important'
                    }
                }
            }" v-model="pickedColor" :disabled="true" :defaultColor="defaultColor" />
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
                :pt="{
                    root: 'colorPickerInputFieldContainer__message'
                }">{{ invalidMessage }}
        </Message>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId } from 'vue';

import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import ColorPicker from 'primevue/colorpicker';
import IconField from 'primevue/iconfield';
import Message from "primevue/message";

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
        
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);
        let defaultColor: Ref<string> = ref(widgetBackgroundHexString());
        let pickedColor: Ref<string> = ref(props.modelValue);

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: props.color,
                },
                invalid:
                {
                    color: errorColor.value
                }
            }
        });

        let inputStyle = computed(() => {
            return {
                focus: 
                {
                    borderColor: props.color
                },
                background: widgetBackgroundHexString(),
                invalid: 
                {
                    borderColor: errorColor.value,
                    placeholderColor: errorColor.value
                }
            }
        });

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
            floatLabelStyle,
            inputStyle,
            defaultColor,
            pickedColor,
            isInvalid,
            invalidMessage,
            onColorSelected
        }
    }
})
</script>

<style>
.colorPickerInputFieldContainer {
    position: relative;
    height: v-bind(height);
    width: v-bind(width);
    max-height: v-bind(maxHeight);
    max-width: v-bind(maxWidth);
    min-height: v-bind(minHeight);
    min-width: v-bind(minWidth);
    background: none;
}

.colorPickerInputFieldContainer.active {
    outline: none;
    border: 1.5px solid v-bind(color);
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
</style>
