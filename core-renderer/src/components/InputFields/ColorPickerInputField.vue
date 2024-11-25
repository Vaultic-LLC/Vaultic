<template>
    <div ref="container" class="colorPickerInputFieldContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <InputText :pt="{
                root: {
                    'data-coloris': 'true'
                }
            }" :fluid="true" :id="id" v-model="pickedColor" :dt="inputStyle" @update:model-value="onColorSelected" />
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
    </div>
</template>
<script lang="ts">
import { Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId } from 'vue';

import tippy from 'tippy.js';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import { widgetBackgroundHexString } from '../../Constants/Colors';

import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import ColorPicker from 'primevue/colorpicker';
import IconField from 'primevue/iconfield';

export default defineComponent({
    name: "ColorPickerInputField",
    components: 
    {
        FloatLabel,
        InputText,
        ColorPicker,
        IconField
    },
    emits: ["update:modelValue"],
    props: ['modelValue', 'color', 'label', "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const container: Ref<any> = ref(null);

        let defaultColor: Ref<string> = ref(widgetBackgroundHexString());
        let pickedColor: Ref<string> = ref(props.modelValue);

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        let tippyInstance: any = null;

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

        function validate()
        {
            if (pickedColor.value == '' || pickedColor.value == undefined)
            {
                invalidate("Please pick a color");
                return false;
            }

            return true;
        }

        function invalidate(message: string)
        {
            tippyInstance.setContent(message);
            tippyInstance.show();
        }

        function onOpen()
        {
            tippyInstance.hide();
        }

        function onColorSelected(color: string | undefined)
        {
            ctx.emit('update:modelValue', color);
        }

        onMounted(() =>
        {
            if (!container.value)
            {
                return;
            }

            validationFunction?.value.push(validate);
            tippyInstance = tippy(container.value, {
                inertia: true,
                animation: 'scale',
                theme: 'material',
                placement: "bottom-start",
                trigger: 'manual',
                hideOnClick: false
            });
        });

        onUnmounted(() =>
        {
            tippyInstance.hide();
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            id,
            floatLabelStyle,
            inputStyle,
            defaultColor,
            pickedColor,
            container,
            onOpen,
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
</style>
