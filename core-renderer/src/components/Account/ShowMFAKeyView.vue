<template>
    <div class="showMFAKeyView">
        <div class="showMFAKeyView__Header">
            <h2>Multifactor Authentication Key</h2>
        </div>
        <div class="showMFAVKeyView__Content">
            <img :src="qrCode" />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';
import app from '../../Objects/Stores/AppStore';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { generateMFAQRCode } from '../../Helpers/generatorHelper';

export default defineComponent({
    name: "ShowMFAKeyView",
    setup()
    {
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const qrCode: Ref<string> = ref('');

        onMounted(async () =>
        {
            // TODO: should probably be able to cancel this in case it is taking too long to load
            app.popups.showLoadingIndicator(currentPrimaryColor.value, "Loading");

            const response = await api.server.user.getMFAKey();
            if (!response.Success)
            {
                defaultHandleFailedResponse(response);
                app.popups.hideLoadingIndicator();

                return;
            }

            // TODO: switch this with the users actuall email or name
            qrCode.value = await generateMFAQRCode("Member", response.MFAKey!);
            app.popups.hideLoadingIndicator();
        });

        return {
            qrCode
        }
    }
});

</script>
<style>
.showMFAKeyView {
    position:relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.showMFAKeyView__Header {
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.showMFAVKeyView__Content {
    flex-grow: 1;
    justify-content: center;
    display: flex;
    align-items: center;
    margin-bottom: 5%;
}
</style>
