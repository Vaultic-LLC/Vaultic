<template>
    <div class="alertBannerContainer">
        <ion-icon class="alertBannerContainer__icon" name="alert-circle-outline"></ion-icon>
        {{ message }}
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { stores } from '@renderer/Objects/Stores';
import { DataType } from '@renderer/Types/Table';

export default defineComponent({
    name: "AlertBanner",
    props: ['message'],
    setup()
    {
        const backgroundColor: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
            stores.userPreferenceStore.currentColorPalette.passwordsColor.alertColor : stores.userPreferenceStore.currentColorPalette.valuesColor.alertColor);

        return {
            backgroundColor
        }
    }
})
</script>

<style>
.alertBannerContainer {
    width: 80%;
    height: 25%;
    background: v-bind(backgroundColor);
    color: var(--app-color);
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    padding-right: 5px;
}

.alertBannerContainer__icon {
    font-size: 40px;
    margin: 5px;
}
</style>
