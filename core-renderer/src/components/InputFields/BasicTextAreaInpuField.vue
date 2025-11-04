<template>
    <div class="textAreaFieldContainer" :class="{ fadeIn: shouldFadeIn }" @click.right.stop="copyValue">
        <FloatLabel variant="in"
            :pt="{
                root: 'textAreaFieldContainer__floatLabel'
            }">
                <Textarea :fluid="true" :id="id" v-model="valuePlaceHolder" :disabled="disabled" :invalid="isInvalid" 
                    @update:model-value="onInput"
                    :pt="{
                        root: {
                            class: {
                                'textAreaFieldContainer__input': true,
                                'textAreaFieldContainer__input--invalid': isInvalid,
                            }
                        }
                    }" />
            <label class="textAreaFieldContainer__label" :for="id">{{ label }}</label>
        </FloatLabel>
        <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
            :pt="{
                root: 'textAreaFieldContainer__message',
                text: 'textAreaFieldContainer__messageText'
            }">{{ invalidMessage }}</Message>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import FloatLabel from "primevue/floatlabel";
import Textarea from 'primevue/textarea';
import Message from "primevue/message";

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { ValidationFunctionsKey } from '../../Constants/Keys';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "textAreaField",
    components:
    {
        FloatLabel,
        Textarea,
        Message
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 
    "additionalValidationFunction", "isOnWidget"],
    setup(props, ctx)
    {
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);
        const id = ref(useId());
        const valuePlaceHolder = ref(props.modelValue);
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

        function validate(): boolean
        {
            isInvalid.value = false;

            if (!props.modelValue)
            {
                invalidate("Please enter a value");
                return false;
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
            defaultInputColor,
            defaultInputTextColor,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            labelBackgroundColor,
            onInput,
            invalidate,
            copyValue
        };
    }
})
</script>

<style scoped>
.textAreaFieldContainer {
    position: relative;
    height: v-bind(computedHeight);
    min-height: v-bind(computedMinHeight);
    max-height: v-bind(computedMaxHeight);
    width: v-bind(computedWidth);
    min-width: v-bind(computedMinWidth);
    max-width: v-bind(computedMaxWidth);
}

:deep(.textAreaFieldContainer__input) {
    height: 100%;
    font-size: var(--input-font-size);
    background: v-bind(background) !important;
    padding-block-start: var(--input-padding-block-start) !important;
}

:deep(.textAreaFieldContainer__input--invalid) {
    border-color: v-bind(errorColor) !important;
}

:deep(.textAreaFieldContainer__inputGroup) {
    height: 100%;
}

:deep(.textAreaFieldContainer__inputGroupAddon) {
    background: v-bind(background) !important;
    font-size: var(--input-font-size) !important;
    height: 100%;
}

:deep(.textAreaFieldContainer__inputGroupAddon--invalid) {
    border-color: v-bind(errorColor) !important;
    color: v-bind(errorColor);
}

:deep(.textAreaFieldContainer__input--groupAddon) {
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
}

:deep(.textAreaFieldContainer__input:focus) {
    border-color: v-bind(color) !important;
}

:deep(.textAreaFieldContainer__floatLabel) {
    height: 100%;
}

:deep(.textAreaFieldContainer__iconField) {
    height: 100%;
}

:deep(.textAreaFieldContainer__tooltipIcon) {
    transition: 0.3s;
	will-change: transform;
    color: white;
}

:deep(.textAreaFieldContainer__tooltipIcon:hover) {
    color: v-bind(color);
    transform: scale(1.1);
}

:deep(.textAreaFieldContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}

:deep(.textAreaFieldContainer__label) {
    font-size: var(--input-font-size);
}

:deep(.p-floatlabel-in:has(textarea:focus) textarea.textAreaFieldContainer__label),
:deep(.p-floatlabel-in:has(textarea.p-filled) textarea.textAreaFieldContainer__label) {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.p-floatlabel:has(.p-invalid) .textAreaFieldContainer__label) {
    color: v-bind(errorColor) !important;
}

:deep(.p-floatlabel:has(textarea:focus) .textAreaFieldContainer__label) {
    color: v-bind(color) !important;
}

:deep(.textAreaFieldContainer__messageText) {
    font-size: clamp(9px, 1vw, 14px) !important;
    color: v-bind(errorColor) !important;
}
</style>
