<template>
    <div class="objectMultiSelectContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <MultiSelect :fluid="true" :dt="inputStyle" :id="id" v-model="selectedItemsPlaceHolder" :options="options" optionLabel="label"
                filter :virtualScrollerOptions="{ itemSize: 50 }" @selectall-change="onSelectAllChange($event)" @change="onChange($event)" :appendTo="'self'"
                :pt="{
                    pcFilter: {
                        root:  'objectMultiSelectContainer__searchBar'
                    },
                    pcHeaderCheckbox: {
                        box: 'objectMultiSelectContainer__checkbox'
                    },
                    pcOptionCheckbox: {
                        box: 'objectMultiSelectContainer__checkbox'
                    }
                }">
                <template #option="slotProps">
                    <div class="objectMultiSelectContainer__option">
                        <div v-if="slotProps.option.icon" class="objectMultiSelectContainer__iconContianer">
                            <i :class='`pi ${slotProps.option.icon} objectMultiSelectContainer__optionIcon`' :style="{color: slotProps.option.color ?? '#FFFFFF'}"></i>
                        </div>
                        <div>{{ slotProps.option.label }}</div>
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
            <label :for="id">{{ label }}</label>
        </FloatLabel>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import FloatLabel from "primevue/floatlabel";
import InputText from 'primevue/inputtext';
import Popover from 'primevue/popover';
import MultiSelect, { MultiSelectAllChangeEvent, MultiSelectChangeEvent } from 'primevue/multiselect';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { widgetBackgroundHexString } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import { ObjectMultiSelectOptionModel } from '../../Types/Models';

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
    props: ["modelValue", "options", "label", "color", "disabled", "detailsView"],
    setup(props, ctx)
    {
        const popoverRefs: Ref<any[]> = ref([]);
        const id = ref(useId());
        const selectedItemsPlaceHolder = ref(props.modelValue);
        const options: ComputedRef<ObjectMultiSelectOptionModel[]> = computed(() => props.options)
        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const selectAll = ref(false);
        const background: Ref<string> = ref(widgetBackgroundHexString());

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
                background: widgetBackgroundHexString(),
            }
        });

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
        })

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
            floatLabelStyle,
            inputStyle,
            defaultInputColor,
            defaultInputTextColor,
            background,
            onSelectAllChange,
            onChange,
            onViewHover,
            onViewUnhover
        };
    }
})
</script>

<style scoped>
.objectMultiSelectContainer__option {
    display: flex;
    column-gap: 10px;
}

.objectMultiSelectContainer__iconContianer {
    padding-left: 5px;
}

.objectMultiSelectContainer__optionIcon {
    font-size: 1.2rem;
}

:deep(.objectMultiSelectContainer__checkbox) {
    background: v-bind(background) !important;
}

:deep(.objectMultiSelectContainer__searchBar) {
    background: v-bind(background) !important;
    padding-block-start: 0.5rem !important;
}

:deep(.objectMultiSelectContainer__searchBar:focus) {
    border-color: v-bind(color) !important;
}

:deep(.p-checkbox-checked .objectMultiSelectContainer__checkbox) {
    background: v-bind(color) !important;
    border-color: v-bind(color) !important;
}
</style>
