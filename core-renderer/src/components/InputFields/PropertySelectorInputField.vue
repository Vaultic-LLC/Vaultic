<template>
    <div class="dropDownContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle"
            :pt="{
                root: 'dropDownContainer__floatLabel'
            }">
            <Select 
                :pt="{
                    root: {
                        class: {
                            'dropDownContainer__select': true,
                            'dropDownContainer__select--invalid': isInvalid
                        }
                    },
                    clearIcon: 'dropDownContainer__clearIcon',
                    dropdownIcon: 'dropDownContainer__dropDownicon',
                    label: 'dropDownContainer__selectLabel',
                    option: ({ context }) => {
                        const style: { [key: string]: any} = 
                        {
                            'font-size': 'var(--input-font-size)',
                            padding: 'clamp(3px, 0.5vw, 8px) 12px'
                        };

                        if (context.selected)
                        {
                            style['background'] = `color-mix(in srgb, ${color} ,transparent 84%)`;
                        }

                        return {
                            style
                        };
                    }
                }" class="primeVueSelect" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="name" :fluid="true" :labelStyle="{'text-align': 'left'}" 
                @update:model-value="onOptionClick" />
            <label class="dropDownContainer__label" :for="id">{{ label }}</label>
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
            :pt="{
                root: 'dropDownContainer__message',
                text: 'dropDownContainer__messageText'
            }">
            {{ invalidMessage }}
        </Message>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId } from 'vue';

import FloatLabel from 'primevue/floatlabel';
import Select from "primevue/select";
import Message from "primevue/message";

import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import { PropertyType, PropertySelectorDisplayFields } from '../../Types/Fields';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "PropertySelectorInputField",
    components: 
    {
        FloatLabel,
        Select,
        Message
    },
    emits: ["update:modelValue", "propertyTypeChanged"],
    props: ["modelValue", "displayFieldOptions", "label", "color", 'isOnWidget', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth'],
    setup(props, ctx)
    {
        const id = ref(useId());

        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);
        const selectBackgroundColor: Ref<string> = ref(widgetBackgroundHexString()); 

        const options: ComputedRef<any[]> = computed(() => 
        {
            return (props.displayFieldOptions as PropertySelectorDisplayFields[]).map((k, i) => { return { name: k.displayName, code: i, df: k } });
        });

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');
        
        let selectedValue: Ref<any> = ref();
        let selectedPropertyType: PropertyType = PropertyType.String;
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const displayFieldCount: Ref<number> = ref(Object.keys(props.displayFieldOptions).length - 1);

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        function onOptionClick(option: any)
        {
            isInvalid.value = false;
            selectedValue.value = option;
            ctx.emit('update:modelValue', option?.df?.backingProperty ?? null);

            if (option?.df?.type && option?.df?.type != selectedPropertyType)
            {
                selectedPropertyType = option.df.type;
                if (selectedPropertyType == PropertyType.Enum)
                {
                    ctx.emit("propertyTypeChanged", selectedPropertyType, option.df.enum);
                }
                else
                {
                    ctx.emit("propertyTypeChanged", selectedPropertyType);
                }
            }
        }

        function validate()
        {
            isInvalid.value = false;
            if (selectedValue.value == '' || selectedValue.value == undefined)
            {
                invalidate("Please select a value");
                return false;
            }

            return true;
        }

        function invalidate(message: string)
        {
            isInvalid.value = true;
            invalidMessage.value = message;
        }

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: props.color
                },
                invalid: 
                {
                    color: errorColor.value
                }
            }
        });

        onMounted(() =>
        {
            const initialValue = options.value.filter(v => v.df.backingProperty == props.modelValue);
            if (initialValue.length > 0)
            {
                selectedValue.value = initialValue[0];
            }

            validationFunction?.value.push(validate);
        });

        onUnmounted(() =>
        {
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            id,
            errorColor,
            isInvalid,
            invalidMessage,
            floatLabelStyle,
            selectBackgroundColor,
            options,
            selectedValue,
            backgroundColor,
            displayFieldCount,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            onOptionClick
        }
    }
})
</script>

<style scoped>
.dropDownContainer {
    position: relative;
    height: v-bind(computedHeight);
    width: v-bind(computedWidth);
    max-height: v-bind(computedMaxHeight);
    max-width: v-bind(computedMaxWidth);
    min-height: v-bind(computedMinHeight);
    min-width: v-bind(computedMinWidth);

    cursor: pointer;
}

.primeVueSelect {
    background: v-bind(selectBackgroundColor);
}

.primeVueSelect.p-focus {
    border: 1px solid v-bind(color) !important;
}

:deep(.dropDownContainer__select--invalid) {
    border-color: v-bind(errorColor) !important;
}

:deep(.dropDownContainer__floatLabel) {
    height: 100%;
}

:deep(.dropDownContainer__select) {
    height: 100%;
}

:deep(.dropDownContainer__selectLabel) {
    font-size: var(--input-font-size);
    padding-block-start: clamp(17px, 1vw, 24px) !important;
    padding-block-end: clamp(2px, 0.4vw, 5px) !important;
}

:deep(.dropDownContainer__label) {
    font-size: var(--input-font-size);
}

:deep(.dropDownContainer__clearIcon) {
    margin: 0 !important;
    transform: translateY(-50%);
}

:deep(.dropDownContainer__clearIcon),
:deep(.dropDownContainer__dropDownicon) {
    width: clamp(12px, 1vw, 16px) !important;
    height: clamp(12px, 1vw, 16px) !important;
}

.p-floatlabel-in:has(.p-inputwrapper-focus) .dropDownContainer__label, 
.p-floatlabel-in:has(.p-inputwrapper-filled) .dropDownContainer__label {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.dropDownContainer__messageText) {
    font-size: clamp(9px, 1vw, 14px) !important;
}
</style>
