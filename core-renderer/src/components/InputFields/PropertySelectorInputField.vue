<template>
    <div class="dropDownContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <Select :pt="selectLabelStyle" ref="container" class="primeVueSelect" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="name" :fluid="true" :labelStyle="{'text-align': 'left'}" 
                @update:model-value="onOptionClick" />
            <label :for="id">{{ label }}</label>
        </FloatLabel>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId } from 'vue';

import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import tippy from 'tippy.js';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import { PropertyType, PropertySelectorDisplayFields } from '../../Types/Fields';

import FloatLabel from 'primevue/floatlabel';
import Select from "primevue/select";

export default defineComponent({
    name: "PropertySelectorInputField",
    components: 
    {
        FloatLabel,
        Select
    },
    emits: ["update:modelValue", "propertyTypeChanged"],
    props: ["modelValue", "displayFieldOptions", "label", "color", 'isOnWidget', 'fadeIn', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const container: Ref<any> = ref(null);

        const options: ComputedRef<any[]> = computed(() => 
        {
            return (props.displayFieldOptions as PropertySelectorDisplayFields[]).map((k, i) => { return { name: k.displayName, code: i, df: k } });
        });
        
        let selectedValue: Ref<any> = ref();
        let selectedPropertyType: PropertyType = PropertyType.String;
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        let tippyInstance: any = null;

        const displayFieldCount: Ref<number> = ref(Object.keys(props.displayFieldOptions).length - 1);

        function onOptionClick(option: any)
        {
            selectedValue.value = option;
            ctx.emit('update:modelValue', option?.df?.backingProperty ?? null);

            if (option.df.type != selectedPropertyType)
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
            if (selectedValue.value == '' || selectedValue.value == undefined)
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
                // @ts-ignore
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

        onMounted(() =>
        {
            const initialValue = options.value.filter(v => v.backingProperty == props.modelValue);
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
        });

        onUnmounted(() =>
        {
            tippyInstance.hide();
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            id,
            floatLabelStyle,
            selectBackgroundColor,
            selectLabelStyle,
            options,
            selectedValue,
            backgroundColor,
            container,
            displayFieldCount,
            onOptionClick
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

    cursor: pointer;
}

.dropDownContainer.shouldFadeIn {
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

.primeVueSelect {
    background: v-bind(selectBackgroundColor);
}

.primeVueSelect.p-focus {
    border: 1px solid v-bind(color) !important;
}
</style>
