<template>
    <div class="dropDownContainer">
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <Select 
                :pt="{
                    root: {
                        class: { 
                            'dropDownContainer__select--invalid': isInvalid
                        }
                    },
                    option: ({ context }) => {
                        if (context.selected)
                        {
                            return {
                                style: {
                                    background: color,
                                }
                            }
                        }
                    }
                }" class="primeVueSelect" v-model="selectedValue" 
                showClear :inputId="id" :options="options" optionLabel="name" :fluid="true" :labelStyle="{'text-align': 'left'}" 
                @update:model-value="onOptionClick" />
            <label :for="id">{{ label }}</label>
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
            :pt="{
                root: 'dropDownContainer__message'
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
    props: ["modelValue", "displayFieldOptions", "label", "color", 'isOnWidget', 'fadeIn', 'height', 'minHeight', 'maxHeight',
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
        let tippyInstance: any = null;

        const displayFieldCount: Ref<number> = ref(Object.keys(props.displayFieldOptions).length - 1);

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

:deep(.dropDownContainer__select--invalid) {
    border-color: v-bind(errorColor) !important;
}
</style>
