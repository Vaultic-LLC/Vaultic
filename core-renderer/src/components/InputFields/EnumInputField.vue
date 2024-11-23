<template>
    <div class="dropDownContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <Select :pt="selectLabelStyle" :disabled="disabled" ref="container" class="primeVueSelect" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="name" :fluid="true" :labelStyle="{'text-align': 'left'}" 
                @update:model-value="onOptionClick" />
            <label :for="id">{{ label }}</label>
        </FloatLabel>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch, useId } from 'vue';

import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import tippy from 'tippy.js';
import { ValidationFunctionsKey } from '../../Constants/Keys';

import FloatLabel from 'primevue/floatlabel';
import Select from "primevue/select";

export default defineComponent({
    name: "EnumInputField",
    components: 
    {
        FloatLabel,
        Select
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "optionsEnum", "label", "color", 'fadeIn', 'isOnWidget', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth', 'required', 'disabled'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const container: Ref<any> = ref(null);
        const refreshKey: Ref<string> = ref('');

        const options: ComputedRef<any[]> = computed(() => 
        {
            return Object.keys(props.optionsEnum).map((k, i) => { return { name: k, code: i } });
        });

        let selectedValue: Ref<any> = ref();
        let opened: Ref<boolean> = ref(false);
        let focused: Ref<boolean> = ref(false);
        let active: ComputedRef<boolean> = computed(() => !!selectedValue.value || opened.value || focused.value);

        const computedRequired: ComputedRef<boolean> = computed(() => props.required === false ? false : true);

        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        let tippyInstance: any = null;

        const enumOptionCount: Ref<number> = ref(-1);
        const focusedItem: Ref<string> = ref("");
        const focusedIndex: Ref<number> = ref(-1);

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: props.color
                }
            }
        });

        const selectBackgroundColor: Ref<string> = ref(widgetBackgroundHexString()); 
        const selectLabelStyle = computed(() => {
            return {
                option: ({ context }) => {
                    if (context.selected)
                    {
                        return {
                            style: {
                                background: props.color,
                            }
                        }
                    }
                }
            }
        });

        function onSelectorClick()
        {
            if (props.disabled)
            {
                return;
            }

            opened.value = !opened.value;
            if (selectedValue.value == '')
            {
                focused.value = false;
            }

            tippyInstance.hide();
        }

        function onEnter(e: KeyboardEvent)
        {
            // Prevent the popup from capturing the enter handler and trying to save / do whatever its doing
            e.preventDefault();
            e.stopPropagation();

            if (props.disabled)
            {
                return;
            }

            if (!opened.value)
            {
                opened.value = true;
            }
            else
            {
                opened.value = false;
                onOptionClick(focusedItem.value);
                if (selectedValue.value == "")
                {
                    focused.value = false;
                }
            }
        }

        function unFocus()
        {
            opened.value = false;
            focused.value = false;
        }

        function onOptionClick(value: any)
        {
            selectedValue.value = value;
            ctx.emit('update:modelValue', value?.name ?? null)
        }

        function validate()
        {
            if (computedRequired.value && (selectedValue.value == '' || selectedValue.value == undefined))
            {
                invalidate("Please select a value");
                return false;
            }

            return true;
        }

        function invalidate(message: string)
        {
            tippyInstance.setContent(message);
            tippyInstance.show();
        }

        function onKeyUp()
        {
            focusedIndex.value = Math.max(-1, focusedIndex.value - 1);
            if (focusedIndex.value == -1)
            {
                focusedItem.value = "";
            }
            else
            {
                focusedItem.value = Object.values<string>(props.optionsEnum)[focusedIndex.value];
            }
        }

        function onKeyDown()
        {
            focusedIndex.value = Math.min(enumOptionCount.value, focusedIndex.value + 1);
            focusedItem.value = Object.values<string>(props.optionsEnum)[focusedIndex.value];
        }

        watch(() => props.modelValue, (newValue) =>
        {
            if (newValue === undefined)
            {
                onOptionClick('');
                refreshKey.value = Date.now().toString();
            }
        });

        onMounted(() =>
        {
            const initialValue = options.value.filter(v => v.name == props.modelValue);
            if (initialValue.length > 0)
            {
                selectedValue.value = initialValue;
            }

            if (!container.value)
            {
                return;
            }

            validationFunction?.value.push(validate);
            tippyInstance = tippy(container.value.$el, {
                inertia: true,
                animation: 'scale',
                theme: 'material',
                placement: "bottom-start",
                trigger: 'manual',
                hideOnClick: false
            });

            for (let _ in props.optionsEnum)
            {
                enumOptionCount.value += 1;
            }
        });

        onUnmounted(() =>
        {
            tippyInstance?.hide();
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            id,
            selectLabelStyle,
            floatLabelStyle,
            selectBackgroundColor,
            refreshKey,
            options,
            opened,
            active,
            selectedValue,
            backgroundColor,
            container,
            focused,
            focusedItem,
            enumOptionCount,
            onSelectorClick,
            onOptionClick,
            unFocus,
            onKeyUp,
            onKeyDown,
            onEnter
        }
    }
})
</script>

<style scoped>
.dropDownContainer {
    position: relative;
    height: v-bind(height);
    width: v-bind(width);
    max-height: v-bind(maxHeight);
    max-width: v-bind(maxWidth);
    min-height: v-bind(minHeight);
    min-width: v-bind(minWidth);
}

.primeVueSelect {
    background: v-bind(selectBackgroundColor);
}

.primeVueSelect.p-focus {
    border: 1px solid v-bind(color) !important;
}

</style>
