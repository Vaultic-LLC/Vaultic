<template>
    <div ref="container" class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
        <div class="card flex justify-center">
            <FloatLabel variant="in" :dt="floatLabelStyle">
                <InputText :fluid="true" :id="id" v-model="valuePlaceHolder" :dt="inputStyle" :disabled="disabled" @update:model-value="onInput" />
                <label :for="id">{{ label }}</label>
            </FloatLabel>
        </div>
        <div v-if="showToolTip" class="textInputFieldContainer__tooltipContainer">
            <ToolTip :color="color" :message="toolTipMessage" :size="toolTipSize" />
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import tippy from 'tippy.js';
import ToolTip from '../ToolTip.vue';
import { ValidationFunctionsKey } from '../../Constants/Keys';

import FloatLabel from "primevue/floatlabel";
import InputText from 'primevue/inputtext';

export default defineComponent({
    name: "TextInputField",
    components:
    {
        ToolTip,
        FloatLabel,
        InputText
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 
    "additionalValidationFunction", "isOnWidget", "showToolTip", 'toolTipMessage', 'toolTipSize', 'isEmailField'],
    setup(props, ctx)
    {
        const id = ref(useId());
        const valuePlaceHolder = ref(props.modelValue);
        const container: Ref<HTMLElement | null> = ref(null);
        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "50px");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "50px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const additionalValidationFunction: Ref<{ (input: string): [boolean, string]; } | undefined> = ref(props.additionalValidationFunction);
        const labelBackgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());
        let tippyInstance: any = null;

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
                background: widgetBackgroundHexString()
            }
        });

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

        function onInput(value: string | undefined)
        {
            tippyInstance.hide();
            ctx.emit("update:modelValue", value);
        }

        watch(() => props.modelValue, (newValue) =>
        {
            valuePlaceHolder.value = newValue;
        })

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
            id,
            valuePlaceHolder,
            shouldFadeIn,
            floatLabelStyle,
            inputStyle,
            container,
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

.textInputFieldContainer__tooltipContainer {
    position: absolute;
    top: 50%;
    right: -20%;
    transform: translateY(-50%);
}
</style>
