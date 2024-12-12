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
                }" :invalid="isInvalid" :disabled="disabled" class="primeVueSelect" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="label" :fluid="true" :labelStyle="{'text-align': 'left'}" 
                @update:model-value="onOptionClick">
                <template #option="slotProps">
                    <div class="dropDownContainer__option">
                        <div v-if="slotProps.option.icon" class="dropDownContainer__iconContianer">
                            <i :class='`pi ${slotProps.option.icon} dropDownContainer__optionIcon`' :style="{color: slotProps.option.color ?? '#FFFFFF'}"></i>
                        </div>
                        <div class="dropDownContainer__optionLabel">{{ slotProps.option.label }}</div>
                    </div>
                </template>
            </Select>
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
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch, useId } from 'vue';

import FloatLabel from 'primevue/floatlabel';
import Select from "primevue/select";
import Message from "primevue/message";

import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import app from '../../Objects/Stores/AppStore';
import { ObjectSelectOptionModel } from '../../Types/Models';

export default defineComponent({
    name: "ObjectSingleSelect",
    components: 
    {
        FloatLabel,
        Select,
        Message
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "options", "label", "color", 'isOnWidget', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth', 'required', 'disabled'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const refreshKey: Ref<string> = ref('');

        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);
        const selectBackgroundColor: Ref<string> = ref(widgetBackgroundHexString()); 

        const options: ComputedRef<ObjectSelectOptionModel[]> = computed(() => props.options)

        let selectedValue: Ref<any> = ref(props.modelValue);

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const computedRequired: ComputedRef<boolean> = computed(() => props.required === false ? false : true);
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const enumOptionCount: Ref<number> = ref(-1);

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

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

        function onOptionClick(value: any)
        {
            isInvalid.value = false;
            selectedValue.value = value;
            ctx.emit('update:modelValue', value)
        }

        function validate()
        {
            isInvalid.value = false;
            if (computedRequired.value && (selectedValue.value == '' || selectedValue.value == undefined))
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

        watch(() => props.modelValue, (newValue) =>
        {
            if (newValue === undefined)
            {
                onOptionClick('');
                refreshKey.value = Date.now().toString();
            }
            else 
            {
                selectedValue.value = newValue;
            }
        });

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
            errorColor,
            floatLabelStyle,
            selectBackgroundColor,
            refreshKey,
            options,
            selectedValue,
            backgroundColor,
            isInvalid,
            invalidMessage,
            enumOptionCount,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            onOptionClick,
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
}

.primeVueSelect {
    background: v-bind(selectBackgroundColor);
}

.primeVueSelect.p-focus {
    border: 1px solid v-bind(color) !important;
}

:deep(.dropDownContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
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
    width: clamp(12px, 1.5vw, 16px) !important;
    height: clamp(12px, 1.5vw, 16px) !important;
}

.p-floatlabel-in:has(.p-inputwrapper-focus) .dropDownContainer__label, 
.p-floatlabel-in:has(.p-inputwrapper-filled) .dropDownContainer__label {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.dropDownContainer__messageText) {
    font-size: clamp(9px, 1vw, 14px) !important;
}

.dropDownContainer__option {
    display: flex;
    column-gap: 10px;
}

.dropDownContainer__iconContianer {
    padding-left: 5px;
}

.dropDownContainer__optionIcon {
    font-size: clamp(15px, 1vw, 19px);
}

.dropDownContainer__optionLabel {
    font-size: clamp(14px, 1vw, 16px);
}
</style>
