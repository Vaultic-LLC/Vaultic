<template>
    <div class="objectSingleSelectContainer">
        <FloatLabel variant="in"
            :pt="{
                root: 'objectSingleSelectContainer__floatLabel'
            }">
            <Select 
                :pt="{
                    root: {
                        class: { 
                            'objectSingleSelectContainer__select': true,
                            'objectSingleSelectContainer__select--invalid': isInvalid
                        }
                    },
                    pcFilter: {
                        root: () =>
                        {
                            return {
                                class: 'objectSingleSelectContainer__searchBar',
                                style: {
                                    '--objectSingleSelectContainer__searchBarColor': color
                                }
                            }
                        }
                    },
                    clearIcon: 'objectSingleSelectContainer__clearIcon',
                    // @ts-ignore
                    dropDownIcon: ({ state }) => {
                        let className = 'objectSingleSelectContainer__dropDownicon';
                        if (state.overlayVisible)
                        {
                            className += ' objectSingleSelectContainer__dropDownicon--overlayVisible';
                        }

                        return className;
                    },                     
                    label: 'objectSingleSelectContainer__selectLabel',
                    emptyMessage: 'objectSingleSelectContainer__emptyMessage',
                    option: ({ context }) => {
                        const style: { [key: string]: any} = 
                        {
                            'font-size': 'var(--input-font-size)',
                            padding: 'clamp(3px, 0.5vw, 8px) 12px',
                            height: 'unset !important'  // sometimes the option has a height of 50px, override that
                        };

                        if (context.selected)
                        {
                            style['background'] = `color-mix(in srgb, ${color} ,transparent 84%)`;
                        }

                        return {
                            style
                        };
                    }
                }" :invalid="isInvalid" :filter="true" :disabled="disabled" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="label" :fluid="true" :labelStyle="{'text-align': 'left'}"
                :loading="loading" :placeHolder="loading === true ? 'Loading...' : undefined" :emptyMessage="emptyMessage"
                :emptyFilterMessage="noResultsMessage" :virtualScrollerOptions="{ itemSize: 50 }" 
                @update:model-value="onOptionClick" @filter="(e) => $.emit('onSearch', e.value)">
                <template #option="slotProps">
                    <div class="objectSingleSelectContainer__option">
                        <div v-if="slotProps.option.icon" class="objectSingleSelectContainer__iconContianer">
                            <i :class='`pi ${slotProps.option.icon} objectSingleSelectContainer__optionIcon`' :style="{color: slotProps.option.color ?? '#FFFFFF'}"></i>
                        </div>
                        <div class="objectSingleSelectContainer__optionLabel">{{ slotProps.option.label }}</div>
                    </div>
                </template>
            </Select>
            <label class="objectSingleSelectContainer__label" :for="id">{{ label }}</label>
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
            :pt="{
                root: 'objectSingleSelectContainer__message',
                text: 'objectSingleSelectContainer__messageText'
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
    emits: ["update:modelValue", "onSearch"],
    props: ["modelValue", "options", "label", "color", 'isOnWidget', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth', 'required', 'disabled', 'loading', 'emptyMessage', 'noResultsMessage'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const refreshKey: Ref<string> = ref('');

        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);
        const selectBackgroundColor: Ref<string> = ref(widgetBackgroundHexString()); 

        const computedEmptyMessage: ComputedRef<string> = computed(() => props.emptyMessage ? props.emptyMessage : 'No available options');
        const computedNoResultsMessage: ComputedRef<string> = computed(() => props.noResultsMessage ? props.noResultsMessage : 'No results found');

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
            computedEmptyMessage,
            computedNoResultsMessage,
            onOptionClick,
            invalidate
        }
    }
})
</script>

<style>
.objectSingleSelectContainer {
    position: relative;
    height: v-bind(computedHeight);
    width: v-bind(computedWidth);
    max-height: v-bind(computedMaxHeight);
    max-width: v-bind(computedMaxWidth);
    min-height: v-bind(computedMinHeight);
    min-width: v-bind(computedMinWidth);
}

.objectSingleSelectContainer__message {
    transform: translateX(5px);
    margin-top: 1px;
}

.objectSingleSelectContainer__select--invalid {
    border-color: v-bind(errorColor) !important;
}

.objectSingleSelectContainer__floatLabel {
    height: 100%;
}

.objectSingleSelectContainer__select {
    height: 100%;
    background: v-bind(selectBackgroundColor) !important;
}

.objectSingleSelectContainer__select.p-focus {
    border: 1px solid v-bind(color) !important;
}

.objectSingleSelectContainer__selectLabel {
    font-size: var(--input-font-size) !important;
    padding-block-start: clamp(13px, 1vw, 24px) !important;
    padding-block-end: clamp(5px, 0.4vw, 5px) !important;
}

.objectSingleSelectContainer__label {
    font-size: var(--input-font-size);
}

.objectSingleSelectContainer__clearIcon {
    margin: 0 !important;
}

.objectSingleSelectContainer__clearIcon,
.objectSingleSelectContainer__dropDownicon {
    transition: 0.3s;
    width: clamp(12px, 1vw, 16px) !important;
    height: clamp(12px, 1vw, 16px) !important;
}

.objectSingleSelectContainer__dropDownicon--overlayVisible {
    transform: rotate(180deg);
}

.p-floatlabel-in:has(.p-inputwrapper-focus) label.objectSingleSelectContainer__label, 
.p-floatlabel-in:has(.p-inputwrapper-filled) label.objectSingleSelectContainer__label {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

.p-floatlabel:has(.p-inputwrapper-focus) .objectSingleSelectContainer__label {
    color: v-bind(color) !important;
}

.p-floatlabel:has(.p-invalid) .objectSingleSelectContainer__label {
    color: v-bind(errorColor) !important;
}

.objectSingleSelectContainer__messageText {
    font-size: clamp(9px, 1vw, 14px) !important;
    color: v-bind(errorColor) !important;
}

.objectSingleSelectContainer__option {
    display: flex;
    column-gap: 10px;
}

.objectSingleSelectContainer__iconContianer {
    padding-left: 5px;
}

.objectSingleSelectContainer__optionIcon {
    font-size: clamp(15px, 1vw, 19px);
}

.objectSingleSelectContainer__optionLabel {
    font-size: clamp(14px, 1vw, 16px);
}

.objectSingleSelectContainer__searchBar {
    background: v-bind(selectBackgroundColor) !important;
    padding-block-start: 0.5rem !important;
    font-size: var(--input-font-size) !important;
}

.objectSingleSelectContainer__searchBar:focus {
    border-color: var(--objectSingleSelectContainer__searchBarColor) !important;
}

.objectSingleSelectContainer__emptyMessage {
    font-size: clamp(14px, 1vw, 16px);
}
</style>
