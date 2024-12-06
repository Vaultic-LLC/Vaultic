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
                }" :invalid="isInvalid" :disabled="disabled" class="primeVueSelect" v-model="selectedValue" 
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
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch, useId } from 'vue';

import FloatLabel from 'primevue/floatlabel';
import Select from "primevue/select";
import Message from "primevue/message";

import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "EnumInputField",
    components: 
    {
        FloatLabel,
        Select,
        Message
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "optionsEnum", "label", "color", 'fadeIn', 'isOnWidget', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth', 'required', 'disabled'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const refreshKey: Ref<string> = ref('');

        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);
        const selectBackgroundColor: Ref<string> = ref(widgetBackgroundHexString()); 

        const options: ComputedRef<any[]> = computed(() => 
        {
            return Object.values(props.optionsEnum).map((k, i) => { return { name: k, code: i } });
        });

        let selectedValue: Ref<any> = ref();

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const computedRequired: ComputedRef<boolean> = computed(() => props.required === false ? false : true);
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const enumOptionCount: Ref<number> = ref(-1);

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
            ctx.emit('update:modelValue', value?.name ?? null)
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
        });

        onMounted(() =>
        {
            const initialValue = options.value.filter(v => v.name == props.modelValue);
            if (initialValue.length > 0)
            {
                selectedValue.value = initialValue[0];
            }

            validationFunction?.value.push(validate);
            for (let _ in props.optionsEnum)
            {
                enumOptionCount.value += 1;
            }
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
            onOptionClick,
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

:deep(.dropDownContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}

:deep(.dropDownContainer__select--invalid) {
    border-color: v-bind(errorColor) !important;
}
</style>
