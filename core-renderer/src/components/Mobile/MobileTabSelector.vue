<template>
    <div class="mobileTabSelector">
        <div class="mobileTabSelector__tab" v-for="tab in tabs" :key="tab.item" @click="tab.onClick()" :class="{ 'mobileTabSelector__tab--active': activeTab === tab.item }">
            <IonIcon class="mobileTabSelector__icon" :name="tab.icon" />
            <div class="mobileTabSelector__text">{{ tab.item }}</div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, Ref, ref } from 'vue';

import IonIcon from '../Icons/IonIcon.vue';
import { MobileTabItem } from '../../Types/Components';
import { ActiveMobileTabKey } from '../../Constants/Keys';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: 'MobileTabSelector',
    components:
    {
        IonIcon
    },
    setup()
    {
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const activeTab: Ref<string> = inject(ActiveMobileTabKey, ref(MobileTabItem.Home));

        const tabs: Ref<{ item: MobileTabItem, icon: string, onClick: () => void }[]> = ref([
            { item: MobileTabItem.Home, icon: 'home-outline', onClick: () => activeTab.value = MobileTabItem.Home },
            { item: MobileTabItem.Breaches, icon: 'shield-outline', onClick: () => activeTab.value = MobileTabItem.Breaches },
            { item: MobileTabItem.Lock, icon: 'lock-closed-outline', onClick: async () => 
            {
                await app.lock();
                activeTab.value = MobileTabItem.Home;
            } },
        ]);

        return {
            activeTab,
            tabs,
            color
        }
    }
});
</script>

<style>
.mobileTabSelector {
    width: 100%;
    height: 90px;
    color: white;
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    font-size: 25px;
    border-top: 1px solid white;
}

.mobileTabSelector__icon {
    font-size: 22px;
    transition: 0.3s;
}

.mobileTabSelector__text {
    font-size: 12px;
    transition: 0.3s;
}

.mobileTabSelector__tab {
    margin-top: 5px;
}

.mobileTabSelector__tab--active {
    color: v-bind(color);
}
</style>
