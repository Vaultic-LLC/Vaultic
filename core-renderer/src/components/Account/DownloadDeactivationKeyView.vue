<template>
    <div class="downloadDeactivationKeyView">
        <AccountSetupView :color="color" :title="'Download Deactivation Key'" :buttonText="'Download'"
            :titleMargin="'clamp(15px, 1.2vw, 25px)'" :titleMarginTop="'clamp(15px, 1.2vw, 30px)'"
            :hideButton="hideButton" @onSubmit="onDownload">
            <div class="downloadDeactivationKeyView__content">
                <div>
                    Your deactivation key is used to deactivate your subscription in the event you forget your master
                    key and are unable to access your account. Note, it will only stop furture payments from
                    occuring. It will not delete your account or any of your data. If you remember your master key after
                    deactivating, you can renew your subscription by signing in to the app.
                </div>
            </div>
        </AccountSetupView>
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { stores } from '../../Objects/Stores';
import { api } from '../../API';

export default defineComponent({
    name: "DownloadDeactivationKeyView",
    components:
    {
        AccountSetupView,
    },
    emits: ['onDownloaded', 'onFailed'],
    props: ['color'],
    setup(props, ctx)
    {
        const hideButton: Ref<boolean> = ref(false);

        async function onDownload()
        {
            stores.popupStore.showLoadingIndicator(props.color, "Downloading");

            const result = await api.helpers.vaultic.downloadDeactivationKey();
            if (!result.Success)
            {
                stores.popupStore.hideLoadingIndicator();
                defaultHandleFailedResponse(result);

                hideButton.value = true;

                // this will re enable the back button
                ctx.emit('onFailed');

                return;
            }

            ctx.emit('onDownloaded');
        }

        return {
            hideButton,
            onDownload
        }
    }
})
</script>

<style>
.downloadDeactivationKeyView {
    height: 100%;
}

.downloadDeactivationKeyView__filePicker {
    display: none;
    position: absolute;
}

.downloadDeactivationKeyView__content {
    color: white;
}
</style>
