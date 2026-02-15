<template>
    <div class="accountSetupViewContainer">
        <div class="acountSetupViewContainer__branding">
            <img :src="vaulticPrimaryColor" alt="Vaultic Logo" class="acountSetupViewContainer__branding__logo"></img>
        </div>
        <div class="accountSetupViewContainer__header">
            <h2 class="accountSetupViewContainer__title">{{ title }}</h2>
        </div>
        <div class="accountSetupViewContainer__content">
            <slot></slot>
        </div>
        <div class="accountSetupViewContainer__footer">
            <PopupButton v-if="!doHideButton" :color="color" :disabled="disabled" :text="buttonText" :width="'6vw'"
                :minWidth="'120px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                :fontSize="'clamp(12px, 1vw, 16px)'" @onClick="onSubmit">
            </PopupButton>
            <slot name="footer"></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, provide, ref } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';

import { DisableBackButtonFunctionKey, EnableBackButtonFunctionKey, ValidationFunctionsKey } from '../../Constants/Keys';
import { popups } from '../../Objects/Stores/PopupStore';
import app from "../../Objects/Stores/AppStore";
import vaulticPrimaryColor from '../../assets/Vaultic_Primary_Color.png';

export default defineComponent({
    name: "AccountSetupView",
    components:
    {
        PopupButton
    },
    emits: ['onSubmit'],
    props: ['color', 'title', 'buttonText', 'titleMargin', 'titleMarginTop', 'hideButton'],
    setup(props, ctx)
    {
        const popupInfo = popups.accountSetup;
        const disabled: Ref<boolean> = ref(false);
        const computedTitleMargin: ComputedRef<string> = computed(() => props.titleMargin ? props.titleMargin : "3%");
        const computedTitleMarginTop: ComputedRef<string> = computed(() => props.titleMarginTop ? props.titleMarginTop : "5%");

        const doHideButton: ComputedRef<boolean> = computed(() => props.hideButton === true);
        let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);

        const disableBackButton: { (): void } = inject(DisableBackButtonFunctionKey, () => { });
        const enableBackButton: { (): void } = inject(EnableBackButtonFunctionKey, () => { });

        provide(ValidationFunctionsKey, validationFunctions);

        function onSubmit()
        {
            disableBackButton();
            disabled.value = true;

            let allValid: boolean = true;
            validationFunctions.value.forEach(f => allValid = f() && allValid);

            if (allValid)
            {
                ctx.emit('onSubmit');
            }

            disabled.value = false;
            enableBackButton();
        }

        onMounted(() =>
        {
            app.popups.addOnEnterHandler(popupInfo.enterOrder!, onSubmit);
        });

        onUnmounted(() =>
        {
            app.popups.removeOnEnterHandler(popupInfo.enterOrder!);
        });

        return {
            disabled,
            computedTitleMargin,
            computedTitleMarginTop,
            doHideButton,
            vaulticPrimaryColor,
            onSubmit
        }
    }
})
</script>

<style>
.accountSetupViewContainer {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
}

.accountSetupViewContainer__header {
    margin-top: v-bind(computedTitleMarginTop);
}

.accountSetupViewContainer__title {
    font-size: clamp(20px, 1.5vw, 30px);
    color: white;
}

.accountSetupViewContainer__content {
    height: 100%;
    width: 80%;
    margin-top: v-bind(computedTitleMargin);
    display: flex;
    position: relative;
    z-index: 3;
    flex-direction: column;
    row-gap: 50px;
    justify-content: flex-start;
    align-items: center;
}

.accountSetupViewContainer__footer {
    width: 100%;
    /* height: 10%; */
    flex-grow: 1;
    margin-bottom: 2.5vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    row-gap: 20px;
    position: relative;
    z-index: 1;
}

.acountSetupViewContainer__branding {
    display: none;
    margin-top: 20%;
}

.acountSetupViewContainer__branding__logo {
    width: 200px;
}

@media (max-width: 900px) {
    .accountSetupViewContainer__content {
        width: 90%;
    }
}

@media (max-width: 600px) {
    .accountSetupViewContainer__header {
        margin-top: 15%;
    }

    .acountSetupViewContainer__branding {
        display: block;
    }

    .accountSetupViewContainer__footer {
        margin-bottom: 7vh;
    }
}
</style>
