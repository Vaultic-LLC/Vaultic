<template>
    <div ref="container" class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
        <input required="false" class="textInputFieldInput" type="text" name="text" autocomplete="off"
            :value="modelValue" @input="onInput(($event.target as HTMLInputElement).value)" @keypress="validateType"
            :disabled="disabled" :maxlength="200" />
        <label class="textInputFieldLable">{{ label }}</label>
        <div v-if="showToolTip" class="textInputFieldContainer__tooltipContainer">
            <ToolTip :color="color" :message="toolTipMessage" :size="toolTipSize" />
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import tippy from 'tippy.js';
import ToolTip from '../ToolTip.vue';
import { ValidationFunctionsKey } from '../../Constants/Keys';

export default defineComponent({
    name: "TextInputField",
    components:
    {
        ToolTip
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
        "inputType", "additionalValidationFunction", "isOnWidget", "showToolTip", 'toolTipMessage', 'toolTipSize', 'isEmailField'],
    setup(props, ctx)
    {
        const container: Ref<HTMLElement | null> = ref(null);
        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "50px");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "50px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const type: ComputedRef<string> = computed(() => props.inputType ? props.inputType : "text");
        const additionalValidationFunction: Ref<{ (input: string): [boolean, string]; } | undefined> = ref(props.additionalValidationFunction);
        const labelBackgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());
        let tippyInstance: any = null;

        function validate(): boolean
        {
            if (!props.modelValue)
            {
                invalidate("Pleas enter a value");
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
            tippyInstance.setContent(message);
            tippyInstance.show();
        }

        function validateType(event: KeyboardEvent)
        {
            if (type.value === "number")
            {
                var charCode = event.key;
                if (!/\d/.test(charCode))
                {
                    event.preventDefault();
                    return false;
                }
            }
            return true;
        }

        function onInput(value: string)
        {
            tippyInstance.hide();
            ctx.emit("update:modelValue", value);
        }

        onMounted(() =>
        {
            if (!container.value)
            {
                return;
            }

            validationFunction?.value.push(validate);
            tippyInstance = tippy(container.value, {
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
            shouldFadeIn,
            container,
            defaultInputColor,
            defaultInputTextColor,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            type,
            labelBackgroundColor,
            validateType,
            onInput,
            invalidate
        };
    }
})
</script>

<style scoped>
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
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

.textInputFieldContainer .textInputFieldInput {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    border: solid 1.5px v-bind(defaultInputColor);
    color: white;
    border-radius: var(--responsive-border-radius);
    background: none;
    font-size: var(--input-font-size);
    transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.textInputFieldContainer .textInputFieldLable {
    position: absolute;
    left: var(--input-label-left);
    top: 50%;
    color: v-bind(defaultInputTextColor);
    pointer-events: none;
    transform: translateY(-40%);
    transition: var(--input-label-transition);
    font-size: clamp(11px, 1.2vh, 25px);
    will-change: transform;
}

.textInputFieldContainer .textInputFieldInput:focus,
.textInputFieldContainer .textInputFieldInput:valid,
.textInputFieldContainer .textInputFieldInput:disabled {
    outline: none;
    border: 1.5px solid v-bind(color);
}

.textInputFieldContainer .textInputFieldInput:focus~label,
.textInputFieldContainer .textInputFieldInput:valid~label,
.textInputFieldContainer .textInputFieldInput:disabled~label {
    top: 10%;
    transform-origin: left;
    transform: translateY(-80%) scale(0.8);
    background-color: v-bind(labelBackgroundColor);
    padding: 0 .2em;
    color: v-bind(color);
}

.textInputFieldContainer__tooltipContainer {
    position: absolute;
    top: 50%;
    right: -20%;
    transform: translateY(-50%);
}
</style>
