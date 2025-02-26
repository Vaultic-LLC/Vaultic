<template>
    <div class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }" @click.right.stop="copyValue">
        <InputGroup
            :pt="{
                root: 'textInputFieldContainer__inputGroup'
            }">
            <InputGroupAddon v-if="inputGroupAddon" 
                :pt="{
                    root: {
                        class: {
                            'textInputFieldContainer__inputGroupAddon': true,
                            'textInputFieldContainer__inputGroupAddon--invalid': isInvalid
                        }
                    }
                }">{{ inputGroupAddon }}</InputGroupAddon>
            <FloatLabel variant="in" :dt="floatLabelStyle"
                :pt="{
                    root: 'textInputFieldContainer__floatLabel'
                }">
                <IconField 
                    :pt="{
                        root: 'textInputFieldContainer__iconField'
                    }">
                    <InputText :fluid="true" :id="id" v-model="valuePlaceHolder" :dt="inputStyle" :disabled="disabled" :invalid="isInvalid" 
                        @update:model-value="onInput"
                        :pt="{
                            root: {
                                class: {
                                    'textInputFieldContainer__input': true,
                                    'textInputFieldContainer__input--groupAddon': inputGroupAddon 
                                }
                            }
                        }" />
                    <InputIcon ref="inputIcon" v-if="showToolTip" class="pi pi-info-circle"
                        :pt="{
                            root: 'textInputFieldContainer__tooltipIcon'
                        }" />
                </IconField>
                <label class="textInputFieldContainer__label" :for="id">{{ label }}</label>
            </FloatLabel>
        </InputGroup>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
            :pt="{
                root: 'textInputFieldContainer__message',
                text: 'textInputFieldContainer__messageText'
            }">{{ invalidMessage }}</Message>
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

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");
        
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

        function copyValue()
        {
            app.copyToClipboard(valuePlaceHolder.value);
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
            invalidate,
            copyValue
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

:deep(.textInputFieldContainer__input) {
    height: 100%;
    font-size: var(--input-font-size);
}

:deep(.textInputFieldContainer__inputGroup) {
    height: 100%;
}

:deep(.textInputFieldContainer__inputGroupAddon) {
    background: v-bind(background) !important;
    font-size: var(--input-font-size) !important;
    height: 100%;
}

:deep(.textInputFieldContainer__inputGroupAddon--invalid) {
    border-color: v-bind(errorColor) !important;
    color: v-bind(errorColor);
}

:deep(.textInputFieldContainer__input--groupAddon) {
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
}

:deep(.textInputFieldContainer__floatLabel) {
    height: 100%;
}

:deep(.textInputFieldContainer__iconField) {
    height: 100%;
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

:deep(.textInputFieldContainer__label) {
    font-size: var(--input-font-size);
}

:deep(.p-floatlabel-in:has(input:focus) .textInputFieldContainer__label),
:deep(.p-floatlabel-in:has(input.p-filled) .textInputFieldContainer__label) {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.textInputFieldContainer__messageText) {
    font-size: clamp(9px, 1vw, 14px) !important;
}
</style>
