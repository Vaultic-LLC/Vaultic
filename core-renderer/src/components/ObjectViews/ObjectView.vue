<template>
    <div class="objectView">
        <div class="objectViewContainer__warnings">
            <Message v-for="(message) in warnings" severity="warn" :closable="true" 
                :icon="'pi pi-exclamation-triangle'" >{{ message }}</Message>
        </div>
        <div class="objectViewContainer">
            <div class="objectViewContainer__form">
                <ScrollView :color="primaryColor">
                    <div class="objectViewContainer__formWrapper">
                        <slot></slot>
                    </div>
                </ScrollView>
            </div>
            <div class="createButtons" :class="{ anchorDown: anchorButtonsDown }">
                <PopupButton :color="primaryColor" :text="buttonText" :disabled="disabled" :width="'10vw'" :minWidth="'115px'"
                    :maxWidth="'200px'" :maxHeight="'50px'" :minHeight="'25px'" :height="'2vw'" @onClick="onSave" />
                <PopupButton v-if="creating == true" :color="primaryColor" :text="'Create and Close'" :disabled="disabled"
                    :width="'10vw'" :minWidth="'115px'" :maxWidth="'200px'" :maxHeight="'50px'" :minHeight="'25px'"
                    :height="'2vw'" :isSubmit="true"
                    @onClick="onSaveAndClose" />
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, provide, ref, watch } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from './ScrollView.vue';
import Message from 'primevue/message';

import app from "../../Objects/Stores/AppStore";
import { ClosePopupFuncctionKey, DecryptFunctionsKey, RequestAuthorizationKey, ValidationFunctionsKey } from '../../Constants/Keys';

export default defineComponent({
    name: "ObjectView",
    components: 
    {
        ScrollView,
        PopupButton,
        Message
    },
    props: ['creating', 'title', 'color', 'defaultSave', 'gridDefinition', 'buttonText', 'skipOnSaveFunctionality', 
        'anchorButtonsDown'],
    setup(props)
    {
        const primaryColor: ComputedRef<string> = computed(() => props.color);
        const buttonText: Ref<string> = ref(props.buttonText ? props.buttonText : props.creating ? "Create" : "Save and Close");
        const closePopupFunction: ComputedRef<(saved: boolean) => void> | undefined = inject(ClosePopupFuncctionKey);
        const onSaveFunc: ComputedRef<() => Promise<boolean>> = computed(() => props.defaultSave);
        const disabled: Ref<boolean> = ref(false);

        const showAuthPopup: Ref<boolean> = ref(false);

        const warnings: Ref<string[]> = ref([]);

        let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);
        let decryptFunctions: Ref<{ (key: string): void; }[]> = ref([]);

        const requestAuthorization: Ref<boolean> = ref(false);
        provide(ValidationFunctionsKey, validationFunctions);
        provide(DecryptFunctionsKey, decryptFunctions);
        provide(RequestAuthorizationKey, requestAuthorization);

        function onSave()
        {
            disabled.value = true;

            let allValid: boolean = true;
            validationFunctions.value.forEach(f => allValid = f() && allValid);

            if (allValid)
            {
                onSaveFunc.value().then(() =>
                {
                    if (props.skipOnSaveFunctionality)
                    {
                        return;
                    }

                    if (!props.creating && closePopupFunction?.value)
                    {
                        closePopupFunction.value(true);
                    }

                    app.popups.showToast(primaryColor.value, "Saved Successfully", true);
                }).catch((triedSaved: boolean) =>
                {
                    if (triedSaved && !props.skipOnSaveFunctionality)
                    {
                        app.popups.showToast(primaryColor.value, "Save Failed", false);
                    }
                });
            }

            disabled.value = false;
        }

        function onSaveAndClose()
        {
            disabled.value = true;

            let allValid: boolean = true;
            validationFunctions.value.forEach(f => allValid = f() && allValid);

            if (allValid)
            {
                onSaveFunc.value().then(() =>
                {
                    if (closePopupFunction?.value)
                    {
                        closePopupFunction.value(true);
                    }

                    app.popups.showToast(primaryColor.value, "Saved Successfully", true);
                }).catch((triedSaved: boolean) =>
                {
                    if (triedSaved)
                    {
                        app.popups.showToast(primaryColor.value, "Save Failed", false);
                    }
                });
            }

            disabled.value = false;
        }

        function onAuthenticationSuccessful(key: string)
        {
            showAuthPopup.value = false;
            decryptFunctions.value.forEach(f => f(key));
        }

        function authenticationCancelled()
        {
            showAuthPopup.value = false;
        }

        function addWarning(message: string)
        {
            warnings.value.push(message);
        }

        function removeWarning(index: number)
        {
            warnings.value.splice(index, 1);
        }

        watch(() => requestAuthorization.value, (newValue) =>
        {
            if (!newValue)
            {
                return;
            }

            app.popups.showRequestAuthentication(primaryColor.value,
                onAuthenticationSuccessful, authenticationCancelled);

            requestAuthorization.value = false;
        });

        onMounted(() =>
        {
            app.popups.addOnEnterHandler(4, onSave);
        });

        onUnmounted(() =>
        {
            app.popups.removeOnEnterHandler(4);
        });

        return {
            primaryColor,
            buttonText,
            showAuthPopup,
            disabled,
            warnings,
            onAuthenticationSuccessful,
            authenticationCancelled,
            onSave,
            onSaveAndClose,
            addWarning,
            removeWarning
        };
    }
})
</script>

<style>
.objectView {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
}

.objectViewContainer__warnings {
    width: 80%;
    margin: auto;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
}

.objectViewContainer {
    position: relative;
    height: 93%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 3%;
    margin-left: 5%;
    margin-right: 5%;
    flex-shrink: 1;
    min-height: 0;
}

.objectViewContainer__form {
    height: 90%;
    width: 100%;
}

.objectViewContainer__formWrapper {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    row-gap: clamp(15px, 1vw, 20px);
    align-items: center;
    position: relative;
}

.objectViewContainer .createButtons {
    /* margin-bottom: clamp(3%, 1.5vw, 10%); */
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 50px;
    flex-grow: 1;
}

.objectViewContainer .createButtons.anchorDown {
    margin: 0;
    flex-grow: 1;
    align-items: flex-end;
}
</style>
