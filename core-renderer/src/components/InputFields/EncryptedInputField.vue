<template>
    <div ref="container" class="encryptedInputFieldContainer" :class="{ fadeIn: shouldFadeIn }" @click.right.stop="copyValue">
        <div class="textInuptContainer">
            <FloatLabel variant="in"
                :pt="{
                    root: 'encryptedInputFieldContainer__floatLabel'
                }">
                <Password
                    :pt=" 
                    { 
                        root: ({state}) => 
                        {
                            state.unmasked = isUnmasked;
                            return 'encryptedInputFieldContainer__password'
                        }, 
                        pcInputText:
                        {
                            // @ts-ignore
                            root: ({ instance, context}) => 
                            {
                                textFieldInstance = instance;
                                return {
                                    class: {
                                        'encryptedInputFieldContainer__input': true,
                                        'encryptedInputFieldContainer__input--invalid': isInvalid,
                                        'encryptedInputFieldContainer__input--extendedPadding': showRandom
                                    }
                                }
                            }
                        } 
                    }"
                    :fluid="true" name="password" v-model="inputText" :inputId="id" :disabled="isDisabled" toggleMask :feedback="computedFeedback" 
                    :invalid="isInvalid" @update:model-value="onInput">
                    <template #maskicon="slotProps">
                        <div class="encryptedInputFieldContainer__icons">
                            <IonIcon v-if="showRandom && !isLocked" class="p-password-toggle-mask-icon encryptedInputFieldContainer__icon" :name="'dice-outline'" @click="togglePopover"></IonIcon>
                            <IonIcon class="p-password-toggle-mask-icon encryptedInputFieldContainer__icon" :name="'eye-off-outline'" @click="toggleMask(true)"></IonIcon>
                        </div>
                    </template>
                    <template #unmaskicon="slotProps">
                        <div class="encryptedInputFieldContainer__icons">
                            <IonIcon v-if="showRandom && !isLocked" class="p-password-toggle-mask-icon encryptedInputFieldContainer__icon" :name="'dice-outline'" @click="togglePopover"></IonIcon>
                            <IonIcon v-if="isLocked && showUnlock" class="p-password-toggle-mask-icon encryptedInputFieldContainer__icon" :name="'lock-open-outline'" @click="unlock"></IonIcon>
                            <IonIcon v-else-if="!isLocked" class="p-password-toggle-mask-icon encryptedInputFieldContainer__icon" :name="'eye-outline'" @click="toggleMask(false)"></IonIcon>
                            <!-- Prime vue requires something to be here otherwise it'll render its own icon -->
                            <span v-else></span>
                        </div>
                    </template>
                    <template #content>
                        <div></div>
                    </template>
                </Password>
                <label class="encryptedInputFieldContainer__label" :for="id">{{ label }}</label>
            </FloatLabel>
            <Message v-if="isInvalid" severity="error" variant="simple" size="small" 
                :pt="{
                    root: 'encryptedInputFieldContainer__message',
                    text: 'encryptedInputFieldContainer__messageText'
                }">
                {{ invalidMessage }}
            </Message>
            <Popover ref="popover"
                :pt="{
                    root: ({state}) =>
                    {
                        popupIsShowing = state.visible;
                        return popoverClass;
                    }
                }">
                <div class="encryptedInputFieldContainer__randomPasswordPopover">
                    <VaulticFieldset>
                        <TextInputField :color="colorModel.color" :label="'Temporary Value'" v-model="randomPasswordPreview"
                            :width="'100%'" :maxWidth="''" :maxHeight="''" />
                    </VaulticFieldset>
                    <VaulticFieldset>
                        <EnumInputField v-if="canChangeRandomType !== false" :color="colorModel.color" :label="'Type'" v-model="randomValueType" :optionsEnum="RandomValueType" 
                            :width="'100%'" :maxWidth="''" :maxHeight="''" :hideClear="true" />
                    </VaulticFieldset>
                    <VaulticFieldset v-if="randomValueType == RandomValueType.Passphrase">
                        <TextInputField :color="colorModel.color" :label="'Seperator'" v-model="appSettings.e" 
                            :width="'100%'" :maxWidth="''" :maxHeight="''" />
                    </VaulticFieldset>
                    <VaulticFieldset>
                        <SliderInput :color="colorModel.color" :label="'Length'" :minValue="0" :maxValue="40" v-model="length" />
                    </VaulticFieldset>
                    <VaulticFieldset v-if="randomValueType == RandomValueType.Password"> 
                        <CheckboxInputField :color="colorModel.color" :label="'Numbers'" v-model="appSettings.n" 
                            :width="'100%'" :maxWidth="''" :maxHeight="''" :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" />
                    </VaulticFieldset>
                    <VaulticFieldset v-if="randomValueType == RandomValueType.Password"> 
                        <CheckboxInputField :color="colorModel.color" :label="'Special Characters'" 
                            v-model="appSettings.s" :width="'100%'" :maxWidth="''" :maxHeight="''"
                            :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" />
                    </VaulticFieldset>
                    <VaulticFieldset v-if="randomValueType == RandomValueType.Password"> 
                        <CheckboxInputField :color="colorModel.color" :label="'Include Ambiguous Characters'"
                            v-model="appSettings.m":width="'100%'" :maxWidth="''" :maxHeight="''"
                            :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" />
                    </VaulticFieldset>
                    <div class="encryptedInputFieldContainer__randomPasswordPopupButtons">
                        <PopupButton :color="colorModel.color" :text="'Generate'" @onClick="onGenerateRandomPasswordOrPhrase" />
                        <PopupButton :color="colorModel.color" :text="'Confirm'" @onClick="confirmRandomPasswordOrPhrase" />
                    </div>
                </div>
            </Popover>
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch, useId, nextTick } from 'vue';

import Password from "primevue-vaultic/password";
import FloatLabel from 'primevue-vaultic/floatlabel';
import Popover from 'primevue-vaultic/popover';
import Message from "primevue-vaultic/message";
import VaulticFieldset from './VaulticFieldset.vue';
import TextInputField from './TextInputField.vue';
import EnumInputField from './EnumInputField.vue';
import CheckboxInputField from './CheckboxInputField.vue';
import PopupButton from './PopupButton.vue';
import SliderInput from './SliderInput.vue';
import IonIcon from '../Icons/IonIcon.vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetBackgroundHexString, widgetInputLabelBackgroundHexColor } from '../../Constants/Colors';
import { InputColorModel } from '../../Types/Models';
import app, { AppSettings } from "../../Objects/Stores/AppStore";
import cryptHelper from '../../Helpers/cryptHelper';
import { ValidationFunctionsKey, DecryptFunctionsKey, RequestAuthorizationKey } from '../../Constants/Keys';
import { RandomValueType } from '@vaultic/shared/Types/Fields';
import { api } from '../../API';

export default defineComponent({
    name: "EncryptedInputField",
    components: 
    {
        Password,
        FloatLabel,
        Popover,
        Message,
        VaulticFieldset,
        TextInputField,
        EnumInputField,
        CheckboxInputField,
        PopupButton,
        SliderInput,
        IonIcon
    },
    emits: ["update:modelValue", "onDirty", "onInvalid"],
    props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "isInitiallyEncrypted",
        "showRandom", "showUnlock", "showCopy", "additionalValidationFunction", "required", "width", "minWidth", "maxWidth", "height",
        "minHeight", "maxHeight", 'isOnWidget', 'randomValueType', 'feedback', 'popoverClass', 'canChangeRandomType'],
    setup(props, ctx)
    {        
        const id = ref(useId());
        const textFieldInstance: Ref<any> = ref(undefined);
        const container: Ref<HTMLElement | null> = ref(null);
        const popover: Ref<any> = ref();
        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));
        const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));
        const errorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);

        const popupIsShowing: Ref<boolean> = ref(false);

        const computedHeight: ComputedRef<string> = computed(() => props.height ?? "4vh");
        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "35px");
        const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

        const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
        const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');
        const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const computedFeedback: ComputedRef<boolean> = computed(() => props.feedback != undefined ? props.feedback : false);

        const shouldFadeIn: ComputedRef<boolean> = computed(() => false);
        let inputType: Ref<string> = ref("password");

        let isDisabled: Ref<boolean> = ref(!!props.isInitiallyEncrypted || !!props.disabled);
        let isLocked: Ref<boolean> = ref(!!props.isInitiallyEncrypted);
        let inputText: Ref<string> = ref(props.isInitiallyEncrypted ? "*".repeat(5) : props.modelValue);

        const isUnmasked: Ref<boolean> = ref(false);

        const isInvalid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const additionalValidationFunction: Ref<{ (input: string): [boolean, string] }> = ref(props.additionalValidationFunction);
        const inputBackgroundColor: ComputedRef<string> = computed(() => widgetBackgroundHexString());

        const randomPasswordPreview: Ref<string> = ref('');
        const randomValueType: Ref<RandomValueType> = ref(props.randomValueType ?? RandomValueType.Password);
        const appSettings: Ref<AppSettings> = ref(JSON.parse(JSON.stringify(app.settings)));

        const length: ComputedRef<number> = computed(() => randomValueType.value == RandomValueType.Password ? appSettings.value.v : appSettings.value.r);

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

        function copyValue()
        {
            if (isLocked.value)
            {
                return;
            }

            app.copyToClipboard(inputText.value);
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

            ctx.emit('onInvalid');
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

        async function onGenerateRandomPasswordOrPhrase()
        {
            randomPasswordPreview.value = await api.utilities.generator.generateRandomPasswordOrPassphrase(randomValueType.value, length.value,
                appSettings.value.n, appSettings.value.s, appSettings.value.m, appSettings.value.e);
        }

        function confirmRandomPasswordOrPhrase()
        {
            onInput(randomPasswordPreview.value);
            randomPasswordPreview.value = "";

            togglePopover();
        }

        function togglePopover()
        {
            popover.value.toggle({currentTarget: container.value}); 
            popupIsShowing.value = !popupIsShowing.value;  
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

        return {
            id,
            errorColor,
            textFieldInstance,
            popover,
            isDisabled,
            popupIsShowing,
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
            length,
            colorModel,
            RandomValueType,
            randomValueType,
            appSettings,
            onAuthenticationSuccessful,
            onInput,
            unlock,
            copyValue,
            focus,
            validate,
            invalidate,
            inputBackgroundColor,
            computedFeedback,
            randomPasswordPreview,
            isUnmasked,
            toggleMask,
            onGenerateRandomPasswordOrPhrase,
            confirmRandomPasswordOrPhrase,
            togglePopover
        }
    }
})
</script>

<style scoped>
.encryptedInputFieldContainer {
    position: relative;
    height: v-bind(computedHeight);
    min-height: v-bind(computedMinHeight);
    max-height: v-bind(computedMaxHeight);
    width: v-bind(computedWidth);
    min-width: v-bind(computedMinWidth);
    max-width: v-bind(computedMaxWidth);
}

.encryptedInputFieldContainer .textInuptContainer {
    position: relative;
    height: 100%;
    width: 100%;
}

:deep(.encryptedInputFieldContainer__floatLabel) {
    height: 100%;
}

.encryptedInputFieldContainer__password {
    height: 100%;
}

.encryptedInputFieldContainer__password :deep(input) {
    background: v-bind(inputBackgroundColor) !important;
    height: 100%;
}

.encryptedInputFieldContainer__password :deep(input:focus) {
    border: 1px solid v-bind('colorModel.color') !important;
}

.encryptedInputFieldContainer .randomize {
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

.encryptedInputFieldContainer .randomize:hover {
    border: solid 1.5px v-bind('colorModel.activeBorderColor');
    transform: scale(1.05);
}

.encryptedInputFieldContainer .randomize:hover {
    color: v-bind('colorModel.activeTextColor');
}

.encryptedInputFieldContainer__icon {
    position: relative;
    width: clamp(15px, 1.5vw, 25px) !important;
    height: clamp(15px, 1.5vw, 25px) !important;
    margin: 0 !important;
    transition: 0.3s;
    cursor: pointer;
    top: unset !important;
    inset-inline-end: 0;
}

.encryptedInputFieldContainer__icon:hover {
    color: v-bind('colorModel.activeBorderColor');
    transform: scale(1.05);
}

:deep(.encryptedInputFieldContainer__message) {
    transform: translateX(5px);
    margin-top: 1px;
}

:deep(.encryptedInputFieldContainer__input) {
    height: 100%;
    font-size: var(--input-font-size);
}

:deep(.encryptedInputFieldContainer__input--invalid) {
    border-color: v-bind(errorColor) !important;
}

:deep(.encryptedInputFieldContainer__label) {
    font-size: var(--input-font-size);
}

:deep(.p-floatlabel-in:has(input:focus) .encryptedInputFieldContainer__label),
:deep(.p-floatlabel-in:has(input.p-filled) .encryptedInputFieldContainer__label) {
    top: var(--input-label-active-top) !important;
    font-size: var(--input-label-active-font-size) !important;
}

:deep(.p-floatlabel:has(input:focus) .encryptedInputFieldContainer__label) {
    color: v-bind('colorModel.color') !important;
}

:deep(.p-floatlabel:has(.p-invalid) .encryptedInputFieldContainer__label) {
    color: v-bind(errorColor) !important;
}

:deep(.encryptedInputFieldContainer__messageText) {
    font-size: clamp(9px, 1vw, 14px) !important;
    color: v-bind(errorColor) !important;
}

.encryptedInputFieldContainer__randomPasswordPopover {
    display: flex;
    flex-direction: column;
    row-gap: 5px;
    width: 20vw;
}

.encryptedInputFieldContainer__randomPasswordPopupButtons {
    display: flex;
    column-gap: 10px;
    justify-content: center;
    align-items: flex-end;
    margin-top: 10px;
}

:deep(.encryptedInputFieldContainer__icons) {
    position: absolute;
    right: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    column-gap: clamp(5px, 0.2vw, 10px);
}

/* increase the padding so the extra button disn't overlap the input text. The 10px comes from right: 10px on the icon container */
:deep(.encryptedInputFieldContainer__input--extendedPadding) {
    padding-inline-end: calc(clamp(15px, 1.5vw, 25px) * 2.5 + 10px) !important
}
</style>
