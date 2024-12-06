<template>
    <div ref="container" class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }" @mouseenter="hovering = true" 
        @mouseleave="onContainerMouseLeave">
        <div class="textInuptContainer">
            <FloatLabel variant="in" :dt="floatLabelStyle">
                <Password
                    :pt=" 
                    { 
                        root: ({state}) => 
                        {
                            isFocused = state.focused;
                            state.unmasked = isUnmasked;
                        }, 
                        pcInputText:
                        { 
                            root: ({ instance, context}) => 
                            {
                                textFieldInstance = instance;
                                return {
                                    class: { 'encryptedInputFieldContainer__input--invalid': isInvalid }
                                }
                            }
                        } 
                    }"
                    :fluid="true" class="primeVuePasswordField" name="password" v-model="inputText" :inputId="id" :disabled="isDisabled" toggleMask :feedback="computedFeedback" 
                    :invalid="isInvalid" @update:model-value="onInput">
                    <template #maskicon="slotProps">
                        <ion-icon class="p-password-toggle-mask-icon encryptedInputIcon" name="eye-off-outline" @click="toggleMask(true)"></ion-icon>
                    </template>
                    <template #unmaskicon="slotProps">
                        <ion-icon v-if="isLocked && showUnlock" class="p-password-toggle-mask-icon encryptedInputIcon" name="lock-open-outline" @click="unlock"></ion-icon>
                        <ion-icon v-else class="p-password-toggle-mask-icon encryptedInputIcon" name="eye-outline" @click="toggleMask(false)"></ion-icon>
                    </template>
                    <template #content>
                        <div></div>
                    </template>
                </Password>
                <label :for="id">{{ label }}</label>
            </FloatLabel>
            <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
                :pt="{
                    root: 'textInputFieldContainer__message'
                }">
                {{ invalidMessage }}
            </Message>
            <Popover ref="popover" @mouseenter="popoverHover = true" @mouseleave="onPopoverMouseLeave"
                :pt="{
                    root: ({state}) =>
                    {
                        popupIsShowing = state.visible;
                    }
                }">
                <div>
                    TODO
                </div>
            </Popover>
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch, useId, nextTick } from 'vue';

import Password from "primevue/password";
import FloatLabel from 'primevue/floatlabel';
import Popover from 'primevue/popover';
import Message from "primevue/message";

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import clipboard from 'clipboardy';
import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { InputColorModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import cryptHelper from '../../Helpers/cryptHelper';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';
import { ValidationFunctionsKey, DecryptFunctionsKey, RequestAuthorizationKey } from '../../Constants/Keys';

export default defineComponent({
    name: "EncryptedInputField",
    components: 
    {
        Password,
        FloatLabel,
        Popover,
        Message
    },
    emits: ["update:modelValue", "onDirty"],
    props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "initialLength", "isInitiallyEncrypted",
        "showRandom", "showUnlock", "showCopy", "additionalValidationFunction", "required", "width", "minWidth", "maxWidth", "height",
        "minHeight", "maxHeight", 'isOnWidget', 'randomValueType', 'feedback'],
    setup(props, ctx)
    {        
        const id = ref(useId());
        const textFieldInstance: Ref<any> = ref(undefined);
        const container: Ref<HTMLElement | null> = ref(null);
        const popover: Ref<any> = ref();
        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));
        const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor?.value);

        const hovering: Ref<boolean> = ref(false);
        const popoverHover: Ref<boolean> = ref(false);
        const isFocused: Ref<boolean> = ref(false);
        const popupIsShowing: Ref<boolean> = ref(false);
        const showPopup: ComputedRef<boolean> = computed(() => props.showRandom === true && isLocked.value === false && 
            isDisabled.value === false && (hovering.value || isFocused.value || popoverHover.value));

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "50px");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "50px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');
        const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const computedFeedback: ComputedRef<boolean> = computed(() => props.feedback != undefined ? props.feedback : false);

        const shouldFadeIn: ComputedRef<boolean> = computed(() => false);
        let inputType: Ref<string> = ref("password");

        let isDisabled: Ref<boolean> = ref(props.isInitiallyEncrypted || props.disabled);
        let isLocked: Ref<boolean> = ref(props.isInitiallyEncrypted);
        let inputText: Ref<string> = ref(props.initialLength > 0 ? "*".repeat(props.initialLength) : props.modelValue);

        const isUnmasked: Ref<boolean> = ref(false);

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const additionalValidationFunction: Ref<{ (input: string): [boolean, string] }> = ref(props.additionalValidationFunction);
        const inputBackgroundColor: ComputedRef<string> = computed(() => widgetBackgroundHexString());

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: colorModel.value.color
                },
                invalid:
                {
                    color: errorColor.value
                }
            }
        });

        function unlock()
        {
            requestAuthorization.value = true;
        }

        function validate(): boolean
        {
            isInvalid.value = false;
            if (!props.modelValue && props.required)
            {
                invalidate("Please enter a value");
                return false;
            }

            if (additionalValidationFunction.value)
            {
                const [valid, invalidMessage] = additionalValidationFunction.value(inputText.value);
                if (!valid)
                {
                    invalidate(invalidMessage);
                    return false;
                }
            }

            return true;
        }

        async function onAuthenticationSuccessful(key: string)
        {
            const result = await cryptHelper.decrypt(key, props.modelValue);
            if (!result.success)
            {
                return;
            }

            inputText.value = result.value ?? "";
            isLocked.value = false;
            isDisabled.value = false;
        }

        function onInput(value: string)
        {
            isInvalid.value = false;
            inputText.value = value;

            ctx.emit("update:modelValue", value);
            ctx.emit("onDirty");
        }

        async function generateRandomValue()
        {
            if (props.randomValueType == 0)
            {
                app.popups.showLoadingIndicator(colorModel.value.color, "Generating Phrase");
                const response = await api.server.value.generateRandomPhrase(app.settings.value.randomPhraseLength.value);
                app.popups.hideLoadingIndicator();

                if (response.Success)
                {
                    onInput(response.Phrase!);
                }
                else
                {
                    defaultHandleFailedResponse(response);
                }

                return;
            }

            onInput(await api.utilities.generator.randomPassword(app.settings.value.randomValueLength.value));
        }

        function copyValue()
        {
            clipboard.write(inputText.value);
            app.popups.showToast(colorModel.value.color, "Copied", true);
        }

        function focus()
        {
            if (textFieldInstance.value.$el)
            {
                // need next tick to work
                nextTick(() => {
                    textFieldInstance.value.$el.focus();
                });
            }
        }

        function invalidate(message: string)
        {
            isInvalid.value = true;
            invalidMessage.value = message;
        }

        function toggleMask(mask: boolean)
        {
            if (mask)
            {
                isUnmasked.value = false;
                inputType.value = "password";
            }
            else
            {
                isUnmasked.value = true;
                inputType.value = "text"
            }
        }

        // delay it so that there isn't any jitter when moving from hovering over the container to the 
        // popover
        function onContainerMouseLeave()
        {
            setTimeout(() => 
            {
                hovering.value = false;
            }, 50);
        }

        // delay it so that there isn't any jitter when moving from hovering over the container to the 
        // popover
        function onPopoverMouseLeave()
        {
            setTimeout(() => 
            {
                popoverHover.value = false;
            }, 50);
        }

        onMounted(() =>
        {
            validationFunction?.value.push(validate);
            decryptFunctions?.value.push(onAuthenticationSuccessful);
        });

        onUnmounted(() =>
        {
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        watch(() => props.modelValue, (newValue) =>
        {
            inputText.value = newValue;
        });

        watch(() => showPopup.value, (newValue) => 
        {
            if (newValue != popupIsShowing.value)
            {
                popover.value.toggle({currentTarget: container.value}); 
                popupIsShowing.value = newValue;        
            }
        });

        return {
            id,
            errorColor,
            textFieldInstance,
            popover,
            isDisabled,
            hovering,
            popoverHover,
            popupIsShowing,
            isFocused,
            isLocked,
            inputType,
            inputText,
            isInvalid,
            invalidMessage,
            shouldFadeIn,
            defaultInputColor,
            defaultInputTextColor,
            computedHeight,
            computedMinHeight,
            computedMaxHeight,
            computedWidth,
            computedMinWidth,
            computedMaxWidth,
            backgroundColor,
            container,
            colorModel,
            onAuthenticationSuccessful,
            onInput,
            unlock,
            generateRandomValue,
            copyValue,
            focus,
            validate,
            invalidate,
            floatLabelStyle,
            inputBackgroundColor,
            computedFeedback,
            isUnmasked,
            toggleMask,
            onContainerMouseLeave,
            onPopoverMouseLeave
        }
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

.textInputFieldContainer .textInuptContainer {
    position: relative;
    height: 100%;
    width: 100%;
}

.primeVuePasswordField :deep(input) {
    background: v-bind(inputBackgroundColor) !important;
}

.primeVuePasswordField :deep(input:focus) {
    border: 1px solid v-bind('colorModel.color') !important;
}

.textInputFieldContainer .randomize {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: clamp(7px, 0.3vw, 10px);
    margin-left: clamp(1px, 0.1vw, 5px);
    border: solid 1.5px v-bind('colorModel.borderColor');
    border-radius: min(0.6vw, 0.6rem);
    padding: clamp(2px, 0.4vw, 5px) clamp(5px, 0.4vw, 10px) clamp(2px, 0.4vw, 5px) clamp(5px, 0.4vw, 10px);
    transition: 0.2s;
    cursor: pointer;
    will-change: transform;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.2s;
    color: white;
    font-size: clamp(7px, 0.7vw, 13px);
}

.textInputFieldContainer .randomize:hover {
    border: solid 1.5px v-bind('colorModel.activeBorderColor');
    transform: scale(1.05);
}

.textInputFieldContainer .randomize:hover {
    color: v-bind('colorModel.activeTextColor');
}

.encryptedInputIcon {
    width: 1.4rem;
    height: 1.4rem;
    top: 45%;
}

.encryptedInputIcon:hover {
    color: v-bind('colorModel.activeBorderColor');
    transform: scale(1.05);
}

:deep(.textInputFieldContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}

:deep(.encryptedInputFieldContainer__input--invalid) {
    border-color: v-bind(errorColor) !important;
}
</style>
