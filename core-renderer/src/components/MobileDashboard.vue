<template>
    <div id="mobileDashboard">
        <MobileHome v-if="activeTab === MobileTabItem.Home" />
        <MobileBreaches v-if="activeTab === MobileTabItem.Breaches" />
        <MobileTabSelector />
    </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, provide, watch } from 'vue';

import MobileTabSelector from './Mobile/MobileTabSelector.vue';
import MobileHome from './Mobile/MobileHome.vue';
import MobileBreaches from './Mobile/MobileBreaches.vue';

import { ActiveMobileTabKey } from '../Constants/Keys';
import { MobileTabItem } from '../Types/Components';

export default defineComponent({
    name: 'MobileDashboard',
    components:
    {
        MobileTabSelector,
        MobileHome,
        MobileBreaches
    },
    setup()
    {
        const activeTab: Ref<string> = ref(MobileTabItem.Home);

        provide(ActiveMobileTabKey, activeTab);
            
        return {
            activeTab,
            MobileTabItem,
        }
    }
});
</script>

<style>
#mobileDashboard {
    width: 100vw;
    height: calc(100% - 35px);
    display: flex;
    flex-direction: column;
}

/* The popover arrow goes way off the popover on mobile for some reason. this fixes it */
.p-popover:after,
.p-popover:before {
    left: calc(0.1rem + var(--p-popover-arrow-left)) !important;
}
</style>
