<template>
    <div class="tabbedInputContainer" :class="{ mounted: mounted }">
        <div class="tabs">
            <div class="tab tabOne" :class="{ active: activeTab == 0 }" @click="selectTab(0)">
                {{ tabOneText }}
            </div>
            <div class="tab tabTwo" :class="{ active: activeTab == 1 }" @click="selectTab(1)">
                {{ tabTwoText }}
            </div>
        </div>
        <div v-show="activeTab == 0" class="tabOne">
            <slot name="tabOne"></slot>
        </div>
        <div v-show="activeTab == 1" class="tabTwo">
            <slot name="tabTwo"></slot>
        </div>
    </div>
</template>
<script lang="ts">
import { Ref, defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
    name: "TabbedInputContainer",
    emits: ['onTabSelected'],
    props: ['tabOneText', 'tabTwoText', 'color'],
    setup(_, ctx)
    {
        const activeTab: Ref<number> = ref(0);

        // used to ignore the inital transition animation of the element
        const mounted: Ref<boolean> = ref(false);

        function selectTab(tab: number)
        {
            activeTab.value = tab;
            ctx.emit('onTabSelected', tab);
        }

        onMounted(() => mounted.value = true);

        return {
            activeTab,
            mounted,
            selectTab
        }
    }
})
</script>

<style>
.tabbedInputContainer {
    position: relative;
}

.tabbedInputContainer .tabs {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    color: white;
    margin-left: 5%;
    position: absolute;
    transform: translateY(-94%);
    z-index: 10;
}

.tabbedInputContainer.mounted .tabs .tab {
    transition: border 0.3s;
}

.tabbedInputContainer .tabs .tab {
    background-color: transparent;
    padding: 10px;
    padding-left: 30px;
    padding-right: 30px;
    cursor: pointer;
    border-top-right-radius: 10px;
    border-top-left-radius: 10px;
    border-left: 3px solid transparent;
    border-top: 3px solid transparent;
    border-right: 3px solid transparent;
}

.tabbedInputContainer .tabs .tab.active {
    background-color: var(--app-color);
    border-top-right-radius: 10px;
    border-top-left-radius: 10px;
    border-left: 3px solid v-bind(color);
    border-top: 3px solid v-bind(color);
    border-right: 3px solid v-bind(color);
}
</style>