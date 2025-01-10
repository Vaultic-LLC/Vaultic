<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey">
        <VaulticFieldset :centered="true">
            <TextInputField :label="'Name'" v-model="vaultState.name" :color="color"
                :width="'50%'" :maxWidth="''" />
        </VaulticFieldset>
        <VaulticFieldset  :centered="true">
            <CheckboxInputField :label="'Share'" v-model="shareVault" :color="color"
                :width="'50%'" :maxWidth="''" :height="'1.25vh'" :minHeight="'12px'" :fontSize="'clamp(11px, 1vh, 20px)'" />
        </VaulticFieldset>
        <Transition name="fade">
            <VaulticFieldset v-if="shareVault" :centered="true">
                <ObjectMultiSelect :label="'Organizations'" :color="color" v-model="selectedOrganizations" 
                    :options="allOrganizations" :width="'50%'" :maxWidth="''" />
            </VaulticFieldset>
        </Transition>
        <Transition name="fade">
            <VaulticFieldset v-if="shareVault" :centered="true" :fillSpace="true">
                <MemberTable ref="memberTable" :id="'vaultView__memberTable'" :color="color" :emptyMessage="emptyMessage" 
                    :currentMembers="vaultMembers" :externalLoading="loadingIndividuals" />
            </VaulticFieldset>
        </Transition>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import VaulticTable from '../Table/VaulticTable.vue';
import MemberTable from '../Table/MemberTable.vue';

import app from "../../Objects/Stores/AppStore";
import { DisplayVault } from '@vaultic/shared/Types/Entities';
import { ObjectSelectOptionModel } from '../../Types/Models';
import { Member, Organization } from '@vaultic/shared/Types/DataTypes';
import { api } from '../../API';
import { MemberChanges, MemberTableComponent } from '../../Types/Components';

export default defineComponent({
    name: "VaultView",
    components: {
        ObjectView,
        TextInputField,
        VaulticFieldset,
        CheckboxInputField,
        ObjectMultiSelect,
        VaulticTable,
        MemberTable
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const memberTable: Ref<MemberTableComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const vaultState: Ref<DisplayVault> = ref(props.model ?? { name: '', shared: false });
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const loadingIndividuals: Ref<boolean> = ref(false);
        const emptyMessage: Ref<string> = ref(`You currently haven't shared this Vault with any Users. Click '+' to choose a User to share with`);
        
        const shareVault: Ref<boolean> = ref(vaultState.value.shared);
        const vaultMembers: Ref<Map<number, Member>> = ref(new Map());

        const selectedOrganizations: Ref<ObjectSelectOptionModel[]> = ref([]);
        const allOrganizations: Ref<ObjectSelectOptionModel[]> = ref([]);

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

            const originalOrgs = app.organizations.organizationIDsByVaultIDs.get(vaultState.value.vaultID);
            let addedOrgs: Organization[] = [];
            let removedOrgs: Organization[] = [];

            if (originalOrgs)
            {
                for (let i = 0; i < selectedOrganizations.value.length; i++)
                {
                    if (!originalOrgs.has((selectedOrganizations.value[i].backingObject as Organization).organizationID))
                    {
                        addedOrgs.push(selectedOrganizations.value[i].backingObject);
                    }
                }
                
                if (!props.creating)
                {
                    originalOrgs.forEach(v => 
                    {
                        if (selectedOrganizations.value.findIndex(o => (o.backingObject as Organization).organizationID == v) == -1)
                        {
                            const organization = app.organizations.organizationsByID.get(v);
                            if (organization)
                            {
                                removedOrgs.push(organization);
                            }
                        }
                    });
                }
            }

            const sharedIndividualsChanges: MemberChanges | undefined = memberTable.value?.getChanges()!;
            if (props.creating)
            {
                handleSaveResponse((await app.createNewVault(key, vaultState.value.name, shareVault.value, true, 
                    addedOrgs, sharedIndividualsChanges?.addedMembers.valueArray() ?? [])));
            }
            else
            {
                handleSaveResponse((await app.updateVault(key, vaultState.value, shareVault.value, 
                    addedOrgs, removedOrgs, sharedIndividualsChanges?.addedMembers.valueArray() ?? [], 
                    sharedIndividualsChanges?.updatedMembers.valueArray() ?? [], sharedIndividualsChanges?.removedMembers.valueArray() ?? [])));
            }

            if (props.creating)
            {
                refreshKey.value = Date.now().toString();
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

        onMounted(async () =>
        {
            loadingIndividuals.value = true;

            const selectedOrgs = app.organizations.organizationIDsByVaultIDs.get(vaultState.value.vaultID);
            if (selectedOrgs)
            {
                selectedOrgs.forEach(o => 
                {
                    const org = app.organizations.organizationsByID.get(o);
                    const model: ObjectSelectOptionModel = 
                    {
                        label: org?.name!,
                        backingObject: org
                    };

                    selectedOrganizations.value.push(model)
                });
            }

            allOrganizations.value = app.organizations.organizations.value.map(o => 
            {
                const model: ObjectSelectOptionModel = 
                {
                    label: o.name,
                    backingObject: o
                };
            
                return model;
            });

            const response = await api.server.vault.getMembers(
                vaultState.value.userOrganizationID, vaultState.value.userVaultID);

            if (response.Success)
            {
                response.UserOrgInfo?.forEach(u => 
                {
                    const member: Member =
                    {
                        userID: u.UserID,
                        firstName: u.FirstName,
                        lastName: u.LastName,
                        username: u.Username,
                        permission: u.Permissions,
                        icon: undefined,
                        publicKey: undefined
                    };

                    vaultMembers.value.set(u.UserID, member);
                });
            }

            loadingIndividuals.value = false;
        });

        return {
            memberTable,
            vaultState,
            color,
            refreshKey,
            shareVault,
            selectedOrganizations,
            allOrganizations,
            emptyMessage,
            vaultMembers,
            loadingIndividuals,
            onSave,
        };
    },
})
</script>

<style>
#vaultView__memberTable {
    position: relative;
    height: 90%;
    width: 85%;
}
</style>
