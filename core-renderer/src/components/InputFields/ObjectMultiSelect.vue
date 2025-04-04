<template>
    <div class="objectMultiSelectContainer">
        <FloatLabel variant="in"
            :pt="{
                root: 'objectMultiSelectContainer__floatLabel'
            }">
            <MultiSelect :fluid="true" :id="id" v-model="selectedItemsPlaceHolder" :options="options" :optionLabel="'label'" :optionValue="'id'"
                filter :virtualScrollerOptions="{ itemSize: 50 }" @selectall-change="onSelectAllChange($event)" @change="onChange($event)" :appendTo="'self'"
                :emptyMessage="computedEmptyMessage" 
                :pt="{
                    root: ({state}) =>{
                        return {
                            class: {
                                'objectMultiSelectContainer__multiSelect': true,
                                'objectMultiSelectContainer__multiSelect--focus': state.focused
                            }
                        }
                    },
                    virtualScroller: {
                        root: 'objectMultiSelectContainer__virtualScroller',
                        spacer: 'objectMultiSelectContainer__virtualScrollerSpacer'
                    },
                    labelContainer: 'objectMultiSelectContainer__multiSelectLabelContainer',
                    label: 'objectMultiSelectContainer__multiSelectLabel',
                    emptyMessage: 'objectMultiSelectContainer__emptyMessage',
                    // @ts-ignore
                    dropDownIcon: ({ state }) => {
                        let className = 'objectMultiSelectContainer__multiSelectDropDownIcon';
                        if (state.overlayVisible)
                        {
                            className += ' objectMultiSelectContainer__multiSelectDropDownIcon--overlayVisible';
                        }

                        return className;
                    },   
                    pcFilter: {
                        root:  'objectMultiSelectContainer__searchBar',
                    },
                    filterIcon: 'objectMultiSelectContainer__filterIcon',
                    pcHeaderCheckbox: {
                        root: 'objectMultiSelectContainer__checkboxContainer',
                        box: 'objectMultiSelectContainer__checkbox'
                    },
                    pcOptionCheckbox: {
                        root: 'objectMultiSelectContainer__checkboxContainer',
                        box: 'objectMultiSelectContainer__checkbox'
                    },
                    option: 'objectMultiSelectContainer__optionItem'
                }">
                <template #option="slotProps">
                    <div class="objectMultiSelectContainer__option">
                        <div v-if="slotProps.option.icon" class="objectMultiSelectContainer__iconContianer">
                            <i :class='`pi ${slotProps.option.icon} objectMultiSelectContainer__optionIcon`' :style="{color: slotProps.option.color ?? '#FFFFFF'}"></i>
                        </div>
                        <div class="objectMultiSelectContainer__optionLabel">{{ slotProps.option.label }}</div>
                        <div v-if="detailsView" class="objectMultiSelectContainer__objectDetails" @mouseover="(e) => onViewHover(e, slotProps.index)" 
                            @mouseleave="(e) => onViewUnhover(e, slotProps.index)">
                            <i :class='`pi pi-external-link`' :style="{color: slotProps.option.color ?? '#FFFFFF'}"></i>
                            <Popover ref="popoverRefs">
                                <!-- <component :is="detailsView" :model="slotProps.option.backingObject" /> -->
                            </Popover>
                        </div>
                    </div>
                </template>
            </MultiSelect>
            <label class="objectMultiSelectContainer__label" :for="id">{{ label }}</label>
        </FloatLabel>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import FloatLabel from "primevue-vaultic/floatlabel";
import InputText from 'primevue-vaultic/inputtext';
import Popover from 'primevue-vaultic/popover';
import MultiSelect, { MultiSelectAllChangeEvent, MultiSelectChangeEvent } from 'primevue-vaultic/multiselect';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { widgetBackgroundHexString } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import { ObjectSelectOptionModel } from '../../Types/Models';

export default defineComponent({
    name: "ObjectMultiSelect",
    components:
    {
        FloatLabel,
        InputText,
        MultiSelect,
        Popover
    },
    emits: ["update:modelValue", "onOptionSelect"],
    props: ["modelValue", "options", "label", "color", "disabled", "detailsView", 
        "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'emptyMessage'],
    setup(props, ctx)
    {
        const popoverRefs: Ref<any[]> = ref([]);
        const id = ref(useId());
        const selectedItemsPlaceHolder = ref(props.modelValue);
        const options: ComputedRef<ObjectSelectOptionModel[]> = computed(() => props.options)
        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const selectAll = ref(false);
        const background: Ref<string> = ref(widgetBackgroundHexString());

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const computedEmptyMessage: ComputedRef<string> = computed(() => props.emptyMessage ? props.emptyMessage : "No available options");

        const onSelectAllChange = (event: MultiSelectAllChangeEvent) => 
        {
            selectedItemsPlaceHolder.value = event.checked ? options.value : [];
            selectAll.value = event.checked;
        };

        const onChange = (event: MultiSelectChangeEvent) => 
        {
            selectAll.value = event.value.length === options.value.length;
            ctx.emit("update:modelValue", selectedItemsPlaceHolder.value);
            ctx.emit("onOptionSelect", event.value);
        }

        function validate(): boolean
        {
            return true;
        }

        function onViewHover(event: any, index: number)
        {
            popoverRefs.value?.[index].toggle(event);
        }

        function onViewUnhover(event: any, index: number)
        {
            popoverRefs.value?.[index].toggle(event);
        }

        watch(() => props.modelValue, (newValue) =>
        {
            selectedItemsPlaceHolder.value = newValue;
        });

        watch(() => props.modelValue.length, () =>
        {
            selectedItemsPlaceHolder.value = props.modelValue;
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
            popoverRefs,
            id,
            selectedItemsPlaceHolder,
            selectAll,
            defaultInputColor,
            defaultInputTextColor,
            background,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            computedEmptyMessage,
            onSelectAllChange,
            onChange,
            onViewHover,
            onViewUnhover
        };
    }
})
</script>

<style scoped>
.objectMultiSelectContainer {
    height: v-bind(computedHeight);
    width: v-bind(computedWidth);
    max-height: v-bind(computedMaxHeight);
    max-width: v-bind(computedMaxWidth);
    min-height: v-bind(computedMinHeight);
    min-width: v-bind(computedMinWidth);
}

:deep(.objectMultiSelectContainer__floatLabel) {
    height: 100%;
}

:deep(.objectMultiSelectContainer__multiSelect) {
    height: 100%;
    background: v-bind(background) !important;
}

:deep(.objectMultiSelectContainer__multiSelect--focus) {
    border-color: v-bind(color) !important;
}

:deep(.objectMultiSelectContainer__multiSelectLabelContainer) {
    height: 100%;
}

:deep(.objectMultiSelectContainer__virtualScroller) {
    height: clamp(150px, 16vh, 225px) !important;
}

:deep(.objectMultiSelectContainer__virtualScrollerSpacer) {
    height: auto !important;
}

:deep(.objectMultiSelectContainer__multiSelectLabel) {
    height: 100% !important;
    font-size: var(--input-font-size) !important;
    padding-block-start: clamp(17px, 1vw, 24px) !important;
    padding-block-end: clamp(2px, 0.4vw, 5px) !important;
}

:deep(.objectMultiSelectContainer__label) {
    font-size: var(--input-font-size) !important;
}

:deep(.p-floatlabel-in:has(.p-inputwrapper-focus)) label.objectMultiSelectContainer__label, 
:deep(.p-floatlabel-in:has(.p-inputwrapper-filled)) label.objectMultiSelectContainer__label {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.p-floatlabel:has(input:focus) .objectMultiSelectContainer__label) {
    color: v-bind(color) !important;
}

:deep(.objectMultiSelectContainer__optionItem) {
    height: clamp(30px, 4vh, 50px) !important;
}

.objectMultiSelectContainer__option {
    display: flex;
    column-gap: 10px;
}

.objectMultiSelectContainer__iconContianer {
    padding-left: 5px;
}

.objectMultiSelectContainer__optionIcon {
    font-size: clamp(15px, 1vw, 19px);
}

:deep(.objectMultiSelectContainer__checkboxContainer) {
    width: clamp(15px, 1.2vw, 20px) !important;
    height: clamp(15px, 1.2vw, 20px) !important;
}

:deep(.objectMultiSelectContainer__checkbox) {
    background: v-bind(background) !important;
    width: 100% !important;
    height: 100% !important;
}

:deep(.objectMultiSelectContainer__searchBar) {
    background: v-bind(background) !important;
    padding-block-start: 0.5rem !important;
    /* padding-block-start: clamp(6px, 0.3vw, 8px) !important;
    padding-block-end: clamp(6px, 0.3vw, 8px) !important; */
    font-size: var(--input-font-size) !important;

}

:deep(.objectMultiSelectContainer__searchBar:focus) {
    border-color: v-bind(color) !important;
}

:deep(.p-checkbox-checked .objectMultiSelectContainer__checkbox) {
    background: v-bind(color) !important;
    border-color: v-bind(color) !important;
}

:deep(.objectMultiSelectContainer__multiSelectDropDownIcon) {
    transition: 0.3s;
    width: clamp(12px, 1vw, 16px) !important;
    height: clamp(12px, 1vw, 16px) !important;
}

:deep(.objectMultiSelectContainer__multiSelectDropDownIcon--overlayVisible) {
    transform: rotate(180deg);
}

:deep(.objectMultiSelectContainer__filterIcon) {
    width: clamp(12px, 0.8vw, 16px) !important;
    height: clamp(12px, 0.8vw, 16px) !important;
}

.objectMultiSelectContainer__optionLabel {
    font-size: clamp(14px, 1vw, 16px);
}

.objectMultiSelectContainer__emptyMessage {
    font-size: clamp(14px, 1vw, 16px);
}
</style>
