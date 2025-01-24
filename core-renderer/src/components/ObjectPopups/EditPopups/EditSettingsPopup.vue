<template>
    <div class="editSettingsPopup__Header">
        <h2>
            Edit Settings
        </h2>
    </div>
    <div class="editSettingsPopup__Container">
        <SettingsView :creating="false" />
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import SettingsView from '../../../components/ObjectViews/SettingsView.vue';
import ButtonLink from '../../../components/InputFields/ButtonLink.vue';

export default defineComponent({
    name: "EditSettingsPopup",
    components:
    {
        ButtonLink,
        SettingsView
    },
    setup()
    {
        return {
        }
    }
})
</script>

<style>
.editSettingsPopup__Header {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.editSettingsPopup__Container {
    width: 100%;
    height: 85%;
}
</style>
