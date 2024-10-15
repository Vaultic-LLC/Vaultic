<template>
    <div class="editSettingsHeader">
        <TableSelector class="settingsPopupHeader__controls" :singleSelectorItems="singleSelectorItems" />
    </div>
    <div class="settingPopupContainer">
        <Transition name="fade" mode="out-in">
            <SettingsView v-if="activeSection == 0" :creating="false" />
            <DevicesView v-else-if="activeSection == 1" :color="currentPrimaryColor" />
            <AccountInfoView v-else-if="activeSection == 2" />
        </Transition>
    </div>
</template>
<script lang="ts">
import { computed, ComputedRef, defineComponent, ref, Ref } from 'vue';

import SettingsView from '../../../components/ObjectViews/SettingsView.vue';
import DevicesView from '../../../components/IncorrectDevice/DevicesView.vue';
import TableSelector from '../../../components/TableSelector.vue';
import ButtonLink from '../../../components/InputFields/ButtonLink.vue';
import AccountInfoView from '../../../components/Account/AccountInfoView.vue';

import app from "../../../Objects/Stores/AppStore";
import { SingleSelectorItemModel } from '../../../Types/Models';

export default defineComponent({
    name: "EditSettingsPopup",
    components:
    {
        ButtonLink,
        TableSelector,
        SettingsView,
        DevicesView,
        AccountInfoView
    },
    setup(props)
    {
        const activeSection: Ref<number> = ref(0);

        // copy the object so that we don't edit the original one
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const settingsView: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Settings"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => activeSection.value == 0),
                onClick: () => { activeSection.value = 0; }
            }
        });

        const devicesView: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Devices"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => activeSection.value == 1),
                onClick: () => { activeSection.value = 1; }
            }
        });

        const paymentView: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Account"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => activeSection.value == 2),
                onClick: () => { activeSection.value = 2; }
            }
        });

        const singleSelectorItems: ComputedRef<SingleSelectorItemModel[]> = computed(() =>
        {
            let items: SingleSelectorItemModel[] = [settingsView.value];
            if (app.isOnline)
            {
                items.push(devicesView.value);
            }

            items.push(paymentView.value);
            return items;
        });

        return {
            settingsView,
            devicesView,
            paymentView,
            activeSection,
            currentPrimaryColor,
            singleSelectorItems
        }
    }
})
</script>

<style>
.editSettingsHeader {
    display: flex;
    justify-content: flex-start;
    color: white;
    animation: fadeIn 1s linear forwards;
    width: 100%;
}

.settingsPopupHeader__controls {
    left: 50%;
    transform: translateX(-50%);
    top: 2.5%;
    width: 50%;
    z-index: 10;
}

.settingPopupContainer {
    position: absolute;
    top: 20%;
    width: 100%;
    height: 80%;
}

.paymentView {
    color: white;
    font-size: 20px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}
</style>
