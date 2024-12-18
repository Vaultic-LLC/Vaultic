<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey">
        <VaulticFieldset>
            <TextInputField :label="'Name'" v-model="orgState.name" class="organizationView__nameInput" :color="color" />
        </VaulticFieldset>
        <VaulticFieldset>
            <ObjectMultiSelect :label="'Vaults'" :color="color" />
        </VaulticFieldset>
        <MemberTable ref="memberTable" :color="color" :emptyMessage="emptyMessage" :currentMembers="orgState.members" />
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref } from 'vue';

import ObjectView from "./ObjectView.vue";
import TextInputField from '../InputFields/TextInputField.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import MemberTable from '../Table/MemberTable.vue';

import { ObjectSelectOptionModel, TableRowModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { defaultOrganization, Organization } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';
import { Member } from '@vaultic/shared/Types/DataTypes';
import { MemberTableComponent } from '../../Types/Components';

export default defineComponent({
    name: "OrganizationView",
    components: {
        ObjectView,
        TextInputField,
        VaulticFieldset,
        ObjectMultiSelect,
        MemberTable
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const memberTable: Ref<MemberTableComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref('');

        const orgState: Ref<Organization> = ref(JSON.vaulticParse(JSON.vaulticStringify(props.model)) ?? defaultOrganization());
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        
        const emptyMessage: Ref<string> = ref(`You currently don't have any Members in this Organization. Click '+' to add one`);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        function onSave()
        {
            app.popups.showRequestAuthentication(color.value, doSave, onAuthCancelled);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Vault");

            const memberChanges = memberTable.value?.getChanges()!;
            if (props.creating)
            {
                handleSaveResponse((await app.organizations.createOrganization(orgState.value, memberChanges.addedMembers.valueArray())));
            }
            else
            {
                handleSaveResponse((await app.organizations.updateOrganization(orgState.value, 
                    memberChanges.addedMembers.valueArray(), memberChanges.updatedMembers.valueArray(), 
                    memberChanges.removedMembers.valueArray())));
            }
        }

        function handleSaveResponse(succeeded: boolean)
        {
            app.popups.hideLoadingIndicator();
            if (succeeded)
            {
                if (saveSucceeded)
                {
                    saveSucceeded(true);
                }
            }
            else
            {
                if (saveFailed)
                {
                    saveFailed(true);
                }
            }
        }

        function onAuthCancelled()
        {
            saveFailed(false);
        }

        return {
            memberTable,
            refreshKey,
            orgState,
            color,
            emptyMessage,
            onSave,
        };
    },
})
</script>

<style>
</style>
