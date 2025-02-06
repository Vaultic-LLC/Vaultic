<template>
    <VaulticTable :id="id" :color="color" :columns="tableColumns" :loading="externalLoading"
        :headerTabs="userHeaderTab" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false" :allowSearching="isOnline"
        :onEdit="hideEdit === true || disable === true ? undefined : onEditMember" :onDelete="disable === true ? undefined : onDeleteMember">
        <template #tableControls>
            <AddButton v-if="!disable && isOnline" :color="color" @click="(e) => onOpenPopover(e, true)" />
        </template>
    </VaulticTable>
    <Popover ref="popover">
        <div class="memberTable__addMemberPopupContainer">
            <VaulticFieldset :centered="true">
                <ObjectSingleSelect :label="'Member'" :color="color" :loading="loading" v-model="selectedUserDemographics"
                    :options="allSearchedUserDemographics" :disabled="disableMemberSearch" :width="'100%'" :maxWidth="''"
                    :emptyMessage="'Start typing to search for Users'" :noResultsMessage="'No Users found with this Username'"
                    @onSearch="onUserSearch" @update:model-value="onUserSelected"/>
            </VaulticFieldset>
            <VaulticFieldset :centered="true" v-if="!doHidePermissions">
                <EnumInputField :label="'Permission'" :disabled="!editingMember" :color="color" v-model="editingPermission" 
                    :optionsEnum="ViewableServerPermissions" :width="'100%'" :maxWidth="''" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true">
                <PopupButton :color="color" :disabled="!editingMember" :text="'Confirm'" @onClick="onSaveMember" />
            </VaulticFieldset>
        </div>
    </Popover>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, Reactive, reactive, watch } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import VaulticTable from '../Table/VaulticTable.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import Popover from 'primevue/popover';
import ObjectSingleSelect from '../InputFields/ObjectSingleSelect.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';

import { HeaderTabModel, ObjectSelectOptionModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { ServerPermissions, serverPermissionToViewableServerPermission, UserDemographics, ViewableServerPermissions, viewableServerPermissionsToServerPermissions } from '@vaultic/shared/Types/ClientServerTypes';
import { Member } from '@vaultic/shared/Types/DataTypes';
import { MemberChanges } from '../../Types/Components';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "MemberTable",
    components: 
    {
        TextInputField,
        VaulticFieldset,
        VaulticTable,
        AddButton,
        Popover,
        ObjectSingleSelect,
        EnumInputField,
        PopupButton,
        ObjectMultiSelect
    },
    props: ['tabOverride', 'currentMembers', 'emptyMessage', 'color', 'externalLoading', 'id', 'hidePermissions', 'hideEdit', 'disable'],
    setup(props)
    {
        const popover: Ref<any> = ref();
        const refreshKey: Ref<string> = ref("");
        const color: ComputedRef<string> = computed(() => props.color);
        const doHidePermissions: ComputedRef<boolean> = computed(() => props.hidePermissions === true);

        const members: Ref<Map<number, Member>> = ref(props.currentMembers ?? new Map());
        const currentMemberIDs: Ref<string> = ref('[]');
        
        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));
        const memberCollection: SortedCollection = new SortedCollection([]);

        const disableMemberSearch: Ref<boolean> = ref(false);
        const selectedUserDemographics: Ref<ObjectSelectOptionModel | undefined> = ref();
        const allSearchedUserDemographics: Ref<ObjectSelectOptionModel[]> = ref([]);
        const loading: Ref<boolean> = ref(false);

        const editingPermission: Ref<ViewableServerPermissions> = ref(ViewableServerPermissions.View);
        const editingMember: Ref<Member | undefined> = ref(undefined);

        const addedMembers: Map<number, Member> = new Map();
        const updatedMembers: Map<number, Member> = new Map();
        const removedMembers: Map<number, Member> = new Map();

        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);

        const userHeaderTab: HeaderTabModel[] = [
            {
                name: props.tabOverride ?? 'Members',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            models.push({ header: "Username", field: "username", isFielded: false});

            if (!doHidePermissions.value)
            {
                models.push({ header: "Permissions", field: "permission", isFielded: false, component: 'PermissionsCell' });
            }

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 0,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Member",
                    collection: memberCollection
                }
            ]
        });

        function setTableRows()
        {
            const rows: TableRowModel<Member>[] = [];
            members.value.forEach(v =>
            {
                rows.push(new TableRowModel(v.userID.toString(), (obj: Member) => obj.userID, undefined, undefined, undefined, v));
            });

            memberCollection.updateValues(rows);
        }

        let searchTimeout: any = undefined;
        async function onUserSearch(value: string)
        {
            if (!app.isOnline)
            {
                return;
            }

            if (searchTimeout != undefined)
            {
                clearTimeout(searchTimeout);
            }

            if (!value)
            {
                loading.value = false;
                return;
            }

            loading.value = true;
            searchTimeout = setTimeout(async() => 
            {
                const response = await api.server.user.searchForUsers(value, currentMemberIDs.value);
                if (!response.Success)
                {
                    loading.value = false;
                    defaultHandleFailedResponse(response);
                    return;
                }

                if (!response.Users || response.Users.length == 0)
                {
                    allSearchedUserDemographics.value = [];
                    loading.value = false;

                    return;
                }

                allSearchedUserDemographics.value = response.Users?.map(u => 
                {
                    const model: ObjectSelectOptionModel = 
                    {
                        label: u.Username,
                        backingObject: u
                    }

                    return model;
                });

                loading.value = false;
            }, 200);
        }

        function onOpenPopover(e: any, creating: boolean)
        {
            if (creating)
            {
                disableMemberSearch.value = false;
                editingPermission.value = ViewableServerPermissions.View;
                editingMember.value =
                {
                    userID: -1,
                    firstName: '',
                    lastName: '',
                    username: '',
                    permission: ServerPermissions.View,
                    icon: undefined,
                    publicKey: undefined
                };
            }
            else 
            {
                editingPermission.value = serverPermissionToViewableServerPermission(editingMember.value!.permission);
                selectedUserDemographics.value = 
                {
                    label: editingMember.value!.username,
                    backingObject: editingMember.value
                };

                allSearchedUserDemographics.value = [selectedUserDemographics.value];
                disableMemberSearch.value = true;
            }

            popover.value.toggle(e);
        }

        function onUserSelected(model: ObjectSelectOptionModel)
        {
            const userDemographics: UserDemographics = model.backingObject;
            editingMember.value!.userID = userDemographics.UserID;
            editingMember.value!.firstName = userDemographics.FirstName;
            editingMember.value!.lastName = userDemographics.LastName;
            editingMember.value!.username = userDemographics.Username;
            editingMember.value!.publicKey = userDemographics.PublicKey;        
        }

        function onEditMember(member: Member, e: any)
        {
            editingMember.value = {...member};
            onOpenPopover(e, false);
        }

        function onSaveMember()
        {
            editingMember.value!.permission = viewableServerPermissionsToServerPermissions(editingPermission.value);
            if (members.value.has(editingMember.value!.userID) && !addedMembers.has(editingMember.value!.userID))
            {
                updatedMembers.set(editingMember.value!.userID, editingMember.value!);
            }
            else
            {
                addedMembers.set(editingMember.value!.userID, editingMember.value!);
            }

            members.value.set(editingMember.value!.userID, editingMember.value!);
            selectedUserDemographics.value = 
            {
                label: "",
                backingObject: {}
            };

            popover.value.toggle();
            setTableRows();
            setCurrentMemberIDs();
        }

        function onDeleteMember(member: Member)
        {
            if (members.value.has(member.userID) && !removedMembers.has(member.userID))
            {
                removedMembers.set(member.userID, member);
            }

            if (addedMembers.has(member.userID))
            {
                addedMembers.delete(member.userID);
            }

            if (updatedMembers.has(member.userID))
            {
                updatedMembers.delete(member.userID);
            }

            members.value.delete(member.userID);
            setTableRows();
            setCurrentMemberIDs();
        }

        function getChanges(): MemberChanges
        {
            return {
                addedMembers,
                updatedMembers,
                removedMembers
            }
        }

        function setCurrentMemberIDs()
        {
            currentMemberIDs.value = JSON.stringify(members.value.map((k, v) => k));
        }

        watch(() => props.currentMembers, (newValue, _) =>
        {
            members.value = newValue;
            setTableRows();
            setCurrentMemberIDs();
        });

        onMounted(() =>
        {
            setTableRows();
            setCurrentMemberIDs();
        });

        return {
            popover,
            color,
            refreshKey,
            searchText,
            userHeaderTab,
            tableColumns,
            tableDataSources,
            ViewableServerPermissions,
            editingMember,
            editingPermission,
            loading,
            selectedUserDemographics,
            allSearchedUserDemographics,
            disableMemberSearch,
            doHidePermissions,
            isOnline,
            onOpenPopover,
            onDeleteMember,
            onSaveMember,
            onEditMember,
            onUserSearch,
            onUserSelected,
            getChanges
        };
    },
})
</script>

<style>
.memberTable__addMemberPopupContainer {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    width: 15vw;
    justify-content: center;
    align-items: center;
}
</style>
