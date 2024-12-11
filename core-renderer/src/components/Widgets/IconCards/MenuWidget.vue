<template>
    <div class="menuWidgetContainer">
        <LockIconCard id="lockIconCard" />
        <SettingsIconCard id="settingsIconCard" />
        <WorkflowIconCard id="workflowIconCard" />
        <AboutIconCard id="aboutIconCard" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import LockIconCard from './LockIconCard.vue';
import SettingsIconCard from './SettingsIconCard.vue';
import AboutIconCard from './AboutIconCard.vue';
import WorkflowIconCard from "./WorkflowIconCard.vue"

export default defineComponent({
    name: "MenuWidget",
    components:
    {
        LockIconCard,
        SettingsIconCard,
        AboutIconCard,
        WorkflowIconCard
    },
    setup()
    {
    }
})
</script>
<style>
.menuWidgetContainer {
    position: absolute;
    top: max(534px, 89%);
    left: 11%;
    width: 24%;
    min-width: 285px;
    height: 8%;
    background: var(--widget-background-color);
    display: grid;
    grid-template-columns: repeat(4, 25%);
    border-radius: 1vw;
}

@media (max-width: 1300px) {
    .menuWidgetContainer {
        left: 10%;
    }
}

#lockIconCard {
    grid-row: 1;
    grid-column: 1;
}

#settingsIconCard {
    grid-row: 1;
    grid-column: 2;
}

#workflowIconCard {
    grid-row: 1;
    grid-column: 3;
}

#aboutIconCard {
    grid-row: 1;
    grid-column: 4;
}
</style>
