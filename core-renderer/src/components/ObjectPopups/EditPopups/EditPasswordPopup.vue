<template>
    <div class="editPasswordHeader">
        <h2>Edit Password</h2>
    </div>
    <div class="passwordViewContainer">
        <PasswordView :creating="false" :model="passwordModel" />
    </div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, ref } from 'vue';

import PasswordView from "../../ObjectViews/PasswordView.vue";

import { Password } from '../../../Types/DataTypes';
import { SingleSelectorItemModel } from '../../../Types/Models';
import app from "../../../Objects/Stores/AppStore";

export default defineComponent({
    name: "EditPasswordPopup",
    components:
    {
        PasswordView
    },
    props: ['model'],
    setup(props)
    {
        // copy the object so that we don't edit the original one. Also needed for change tracking
        const passwordModel: ComputedRef<Password> = computed(() => JSON.vaulticParse(JSON.vaulticStringify(props.model)));

        const selectorItemModel: SingleSelectorItemModel = {
            isActive: ref(true),
            title: ref("Edit Password"),
            color: ref(app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value),
            onClick: () => { }
        }

        return {
            passwordModel,
            selectorItemModel
        }
    }
})
</script>

<style>
.passwordViewContainer {
    position: absolute;
    top: 15%;
    width: 100%;
    height: 85%;
}

.editPasswordHeader {
    display: flex;
    justify-content: flex-start;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-left: 14.5%;
    font-size: clamp(15px, 1vw, 25px);
}
</style>
