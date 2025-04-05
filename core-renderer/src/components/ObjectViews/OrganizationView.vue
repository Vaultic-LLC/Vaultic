<template>
    <div class="organizationView__header">
        <h2 v-if="creating">Create Organization</h2>
        <h2 v-else>Edit Organization</h2>
    </div>
    <div class="organizationView__content">
        <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey">
            <VaulticFieldset :centered="true">
                <TextInputField :label="'Name'" v-model="orgState.name" class="organizationView__nameInput" :color="color"
                    :width="'50%'" :maxWidth="''" />
            </VaulticFieldset :centered="true">
            <VaulticFieldset :centered="true">
                <ObjectMultiSelect :label="'Vaults'" :color="color" v-model="selectedVaults" :options="allVaults"
                    :width="'50%'" :maxWidth="''" :emptyMessage="`No Vaults marked as 'Shared'`" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true" :fill-space="true">
                <MemberTable ref="memberTable" :id="'organizationView__memberTable'" :color="color" :emptyMessage="emptyMessage" 
                    :currentMembers="orgState.membersByUserID" />
            </VaulticFieldset>
        </ObjectView>
    </div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted } from 'vue';

import ObjectView from "./ObjectView.vue";
import TextInputField from '../InputFields/TextInputField.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import MemberTable from '../Table/MemberTable.vue';

import { ObjectSelectOptionModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { defaultOrganization } from '../../Types/DataTypes';
import { Member, Organization } from '@vaultic/shared/Types/DataTypes';
import { MemberTableComponent } from '../../Types/Components';
import { UserVaultIDAndVaultID } from '@vaultic/shared/Types/Entities';

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

        const orgState: Ref<Organization> = ref(props.model ? JSON.vaulticParse(JSON.vaulticStringify(props.model)) : defaultOrganization());
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.v.p);
        
        const emptyMessage: Ref<string> = ref(`You currently don't have any Members in this Organization. Click '+' to add one`);

        const allVaults: Ref<ObjectSelectOptionModel[]> = ref([]);
        const selectedVaults: Ref<ObjectSelectOptionModel[]> = ref([]);

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
            app.popups.showLoadingIndicator(color.value, "Saving Organization");

            const unchangedVaults: UserVaultIDAndVaultID[] = [];
            const addedVaults: UserVaultIDAndVaultID[] = [];
            const removedVaults: UserVaultIDAndVaultID[] = [];

            selectedVaults.value.forEach(v => 
            {
                if (!orgState.value.vaultIDsByVaultID.has(v.backingObject.vaultID))
                {
                    addedVaults.push(v.backingObject);
                }
            });

            if (!props.creating)
            {
                orgState.value.vaultIDsByVaultID.forEach((v, k, map) =>
                {
                    const vault = selectedVaults.value.find(s => s.backingObject.vaultID == k);
                    if (!vault)
                    {
                        const existingVault = app.userVaults.value.find(v => v.vaultID == k);
                        if (existingVault)
                        {
                            removedVaults.push({
                                userVaultID: existingVault.userVaultID,
                                vaultID: existingVault.vaultID
                            });                      
                        }
                    }
                    else
                    {
                        const existingVault = app.userVaults.value.find(v => v.vaultID == k);
                        if (existingVault)
                        {
                            unchangedVaults.push({
                                userVaultID: existingVault.userVaultID,
                                vaultID: existingVault.vaultID
                            });                      
                        } 
                    }
                });
            }

            const memberChanges = memberTable.value?.getChanges()!;
            if (props.creating)
            {
                app.runAsAsyncProcess(async () => handleSaveResponse((await app.organizations.createOrganization(key, orgState.value, 
                addedVaults, memberChanges.addedMembers.valueArray()))));
            }
            else
            {
                app.runAsAsyncProcess(async () => handleSaveResponse((await app.organizations.updateOrganization(key, orgState.value, unchangedVaults,
                    addedVaults, removedVaults, orgState.value.membersByUserID.valueArray(), memberChanges.addedMembers.valueArray(), 
                    memberChanges.updatedMembers.valueArray(), memberChanges.removedMembers.valueArray()))));
            }

            if (props.creating)
            {
                refreshKey.value = Date.now().toString();
                orgState.value = defaultOrganization();
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

        onMounted(() =>
        {
            allVaults.value = app.userVaults.value.filter(v => v.shared).map(v => 
            {
                const ids: UserVaultIDAndVaultID = 
                {
                    userVaultID: v.userVaultID,
                    vaultID: v.vaultID
                };

                const model: ObjectSelectOptionModel =
                {
                    label: v.name,
                    backingObject: ids
                };

                return model;
            });

            orgState.value.vaultIDsByVaultID.forEach((v, k, map) =>
            {
                const vault = app.userVaults.value.find(v => v.vaultID == k);
                if (vault)
                {
                    const currentVaultModel: ObjectSelectOptionModel = 
                    {
                        label: vault.name,
                        backingObject: 
                        {
                            userVaultID: vault.userVaultID,
                            vaultID: vault.vaultID
                        }
                    };
                    
                    selectedVaults.value.push(currentVaultModel)
                }
            });
        });

        return {
            memberTable,
            refreshKey,
            orgState,
            color,
            emptyMessage,
            selectedVaults,
            allVaults,
            onSave,
        };
    },
})
</script>

<style>
.organizationView__header {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.organizationView__content {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}

#organizationView__memberTable {
    height: 90%;
    width: 85%;
}
</style>
