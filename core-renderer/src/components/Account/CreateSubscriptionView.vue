<template>
    <div class="paymentInfoView">
        <AccountSetupView :color="color" :title="title" :buttonText="buttonText"
            :titleMargin="'clamp(15px, 1.2vw, 25px)'" :titleMarginTop="'clamp(15px, 1.2vw, 30px)'"
            :hideButton="true" @onSubmit="onSubmit">
            <div class="paymentInfoView__content">
                <div v-if="alreadyCreated == false">
                    <h3 class="paymentInfoView__content__header">Subscribe to enable additional features such as:
                    </h3>
                    <div class="paymentInfoView__features">
                        <div class="paymentInfoView__feature">
                            <CheckboxInputField :color="color" :disabled="true" :modelValue="true" :height="'1.25vh'"
                                :minHeight="'10px'" />
                            <div>Monitoring for Data Breaches!</div>
                        </div>
                        <div class="paymentInfoView__feature">
                            <CheckboxInputField :color="color" :disabled="true" :modelValue="true" :height="'1.25vh'"
                                :minHeight="'10px'" />
                            <div>Tracking Security Over Time!</div>
                        </div>
                        <div class="paymentInfoView__feature">
                            <CheckboxInputField :color="color" :disabled="true" :modelValue="true" :height="'1.25vh'"
                                :minHeight="'10px'" />
                            <div>Premium Widgets!</div>
                        </div>
                        <div class="paymentInfoView__feature">
                            <CheckboxInputField :color="color" :disabled="true" :modelValue="true" :height="'1.25vh'"
                                :minHeight="'10px'" />
                            <div>And More!</div>
                        </div>
                    </div>
                </div>
                <div v-else-if="alreadyCreated == true">
                    <div class="paymentInfoView__subscriptionIssueContent">
                        There is an issue with your subscription. Please click the button below to view and
                        update your payment information.
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="paymentInfoView__footer">
                    <PopupButton :color="color" :text="'Subscribe'" :width="'6vw'"
                        :minWidth="'120px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(12px, 1vw, 16px)'" @onClick="onSubmit">
                    </PopupButton>
                    <PopupButton :color="color" :text="'Later'" :width="'6vw'"
                        :minWidth="'120px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(12px, 1vw, 16px)'" @onClick="() => $.emit('onFinish')">
                    </PopupButton>
                </div>
            </template>
        </AccountSetupView>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';

import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';

export default defineComponent({
    name: "CreateSubscriptionView",
    components:
    {
        AccountSetupView,
        CheckboxInputField,
        PopupButton
    },
    emits: ['onFinish'],
    props: ['color', 'creating'],
    setup(props, ctx)
    {
        const url: Ref<string | undefined> = ref('');
        const alreadyCreated: Ref<boolean | undefined> = ref(undefined);

        const title: ComputedRef<string> = computed(() => alreadyCreated.value == true ? "Update Subscription" : "Sign Up");
        const buttonText: ComputedRef<string> = computed(() => alreadyCreated.value == true ? "View" : "Subscribe");

        async function onSubmit()
        {
            if (url.value && alreadyCreated.value != undefined)
            {
                window.open(url.value);
            }

            if (props.creating)
            {
                ctx.emit('onFinish');
            }
        }

        onMounted(async () =>
        {
            app.popups.showLoadingIndicator(props.color);
            const response = await api.server.user.createCheckout();

            if (response.Success)
            {
                alreadyCreated.value = response.AlreadyCreated;
                url.value = response.Url;
                app.popups.hideLoadingIndicator();
            }
            else
            {
                app.popups.hideLoadingIndicator();
                defaultHandleFailedResponse(response);
            }
        });

        return {
            onSubmit,
            alreadyCreated,
            buttonText,
            title
        }
    }
})
</script>

<style>
.paymentInfoView {
    height: 100%;
}

.paymentInfoView__content__header {
    color: white;
}

.paymentInfoView__subscriptionIssueContent {
    color: white;
}

.paymentInfoView__features {
    color: white;
    display: flex;
    flex-direction: column;
    row-gap: 1.5vh;
}

.paymentInfoView__feature {
    display: flex;
}

.paymentInfoView__footer {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    column-gap: 20px;
    position: relative;
}
</style>
