<template>
    <div class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
        <div class="card flex justify-center">
            <InputGroup>
                <InputGroupAddon v-if="inputGroupAddon" 
                    :pt="{
                        root: {
                            class: {
                                'textInputFieldContainer__inputGroupAddon': true,
                                'textInputFieldContainer__inputGroupAddon--invalid': isInvalid
                            }
                        }
                    }">{{ inputGroupAddon }}</InputGroupAddon>
                <FloatLabel variant="in" :dt="floatLabelStyle">
                    <IconField>
                        <InputText :fluid="true" :id="id" v-model="valuePlaceHolder" :dt="inputStyle" :disabled="disabled" :invalid="isInvalid" 
                            @update:model-value="onInput"
                            :pt="{
                                root: {
                                    class: { 'textInputFieldContainer__input--groupAddon': inputGroupAddon }
                                }
                            }" />
                        <InputIcon ref="inputIcon" v-if="showToolTip" class="pi pi-info-circle"
                            :pt="{
                                root: 'textInputFieldContainer__tooltipIcon'
                            }" />
                    </IconField>
                    <label :for="id">{{ label }}</label>
                </FloatLabel>
            </InputGroup>
            <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
                :pt="{
                    root: 'textInputFieldContainer__message'
                }">{{ invalidMessage }}</Message>
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import FloatLabel from "primevue/floatlabel";
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Message from "primevue/message";

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import tippy from 'tippy.js';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import app from '../../Objects/Stores/AppStore';

// TODO: remplace tippy with PrimeVue invalid functionalty
export default defineComponent({
    name: "TextInputField",
    components:
    {
        FloatLabel,
        InputText,
        InputIcon,
        IconField,
        InputGroupAddon,
        InputGroup,
        Message
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 
    "additionalValidationFunction", "isOnWidget", "showToolTip", 'toolTipMessage', 'toolTipSize', 'isEmailField', 'inputGroupAddon'],
    setup(props, ctx)
    {
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);
        const id = ref(useId());
        const valuePlaceHolder = ref(props.modelValue);
        const inputIcon: Ref<any> = ref();
        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const shouldFadeIn: ComputedRef<boolean> = computed(() => false);
        const background: Ref<string> = ref(widgetBackgroundHexString());

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "50px");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "50px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "55px");
        
        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const additionalValidationFunction: Ref<{ (input: string): [boolean, string]; } | undefined> = ref(props.additionalValidationFunction);
        const labelBackgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: background.value
                },
                focus: 
                {
                    color: props.color,
                },
                invalid:
                {
                    color: errorColor.value
                }
            }
        });

        let inputStyle = computed(() => {
            return {
                focus: 
                {
                    borderColor: props.color
                },
                background: background.value,
                invalid: 
                {
                    borderColor: errorColor.value,
                    placeholderColor: errorColor.value
                }
            }
        });

        function validate(): boolean
        {
            isInvalid.value = false;

            if (!props.modelValue)
            {
                invalidate("Please enter a value");
                return false;
            }

            if (props.isEmailField)
            {
                if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(props.modelValue))
                {
                    invalidate('Please enter a valid email');
                    return false;
                }
            }

            if (additionalValidationFunction.value)
            {
                const [isVaild, invalidMesage] = additionalValidationFunction.value(props.modelValue);
                if (!isVaild)
                {
                    invalidate(invalidMesage);
                    return false;
                }
            }

            return true;
        }

        function invalidate(message: string)
        {
            isInvalid.value = true;
            invalidMessage.value = message;
        }

        function onInput(value: string | undefined)
        {
            isInvalid.value = false;
            ctx.emit("update:modelValue", value);
        }

        watch(() => props.modelValue, (newValue) =>
        {
            valuePlaceHolder.value = newValue;
        });

        onMounted(() =>
        {
            validationFunction?.value.push(validate);
            if (props.showToolTip && inputIcon.value?.$el)
            {
                tippy(inputIcon.value.$el, 
                {
					content: props.toolTipMessage,
					inertia: true,
					animation: 'scale',
					theme: 'material',
                });
            }
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
            background,
            valuePlaceHolder,
            shouldFadeIn,
            floatLabelStyle,
            inputStyle,
            defaultInputColor,
            defaultInputTextColor,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            labelBackgroundColor,
            inputIcon,
            onInput,
            invalidate
        };
    }
})
</script>

<style scoped>
/* .p-inputtext {
    width: 100%;
} */

.textInputFieldContainer {
    position: relative;
    height: v-bind(computedHeight);
    min-height: v-bind(computedMinHeight);
    max-height: v-bind(computedMaxHeight);
    width: v-bind(computedWidth);
    min-width: v-bind(computedMinWidth);
    max-width: v-bind(computedMaxWidth);
}

.textInputFieldContainer.fadeIn {
    color: white;
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

:deep(.textInputFieldContainer__inputGroupAddon) {
    background: v-bind(background) !important;
}

:deep(.textInputFieldContainer__inputGroupAddon--invalid) {
    border-color: v-bind(errorColor) !important;
    color: v-bind(errorColor);
}

:deep(.textInputFieldContainer__input--groupAddon) {
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
}

:deep(.textInputFieldContainer__tooltipIcon) {
    transition: 0.3s;
	will-change: transform;
    color: white;
}

:deep(.textInputFieldContainer__tooltipIcon:hover) {
    color: v-bind(color);
    transform: scale(1.1);
}

:deep(.textInputFieldContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}
</style>
