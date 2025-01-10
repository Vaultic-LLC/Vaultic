<template>
    <VaulticTable :id="id" :color="color" :columns="tableColumns" :loading="externalLoading"
        :headerTabs="userHeaderTab" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false"
        :onEdit="onEditMember" :onDelete="onDeleteMember">
        <template #tableControls>
            <AddButton :color="color" @click="(e) => onOpenPopover(e, true)" />
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
            <VaulticFieldset :centered="true">
                <EnumInputField :label="'Permission'" :disabled="!editingMember" :color="color" v-model="editingMember!.permission" 
                    :optionsEnum="Permissions" :width="'100%'" :maxWidth="''" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true">
                <PopupButton :color="color" :disabled="!editingMember" :text="'Confirm'" @onClick="onSaveMember" />
            </VaulticFieldset>
        </div>
    </Popover>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, Reactive, reactive } from 'vue';

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
import { Permissions, UserDemographics } from '@vaultic/shared/Types/ClientServerTypes';
import { Member } from '@vaultic/shared/Types/DataTypes';
import { MemberChanges } from '../../Types/Components';

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
    props: ['currentMembers', 'emptyMessage', 'color', 'externalLoading', 'id'],
    setup(props)
    {
        const popover: Ref<any> = ref();
        const refreshKey: Ref<string> = ref("");
        const color: ComputedRef<string> = computed(() => props.color);

        const members: Ref<Map<number, Member>> = ref(props.currentMembers);
        
        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));
        const memberCollection: SortedCollection = new SortedCollection([]);

        const disableMemberSearch: Ref<boolean> = ref(false);
        const selectedUserDemographics: Ref<ObjectSelectOptionModel | undefined> = ref();
        const allSearchedUserDemographics: Ref<ObjectSelectOptionModel[]> = ref([]);
        const loading: Ref<boolean> = ref(false);

        const editingMember: Ref<Member | undefined> = ref(undefined);

        const addedMembers: Map<number, Member> = new Map();
        const updatedMembers: Map<number, Member> = new Map();
        const removedMembers: Map<number, Member> = new Map();

        const userHeaderTab: HeaderTabModel[] = [
            {
                name: 'Members',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            models.push({ header: "Username", field: "username", isFielded: false});

            // TODO: should each individual user have the same permissiosn in a group or should they be custom? 
            // Should the group have the permissions or should the members within? 
            // probably the members within. Don't think I accounted for that anywhere
            models.push({ header: "Permissions", field: "permission", isFielded: false });

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
            const rows: TableRowModel[] = [];
            members.value.forEach(v =>
            {
                rows.push({
                    id: v.userID.toString(),
                    backingObject: v
                });
            });

            memberCollection.updateValues(rows);
        }

        let lastSearchTime = 0;
        let searchTimeout: any = undefined;
        async function onUserSearch(value: string)
        {
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
                lastSearchTime = Date.now();

                // TODO: this should exclude the current members in the table
                const response = await api.server.user.searchForUsers(value);
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
                editingMember.value = 
                {
                    userID: -1,
                    firstName: '',
                    lastName: '',
                    username: '',
                    permission: Permissions.View,
                    icon: undefined,
                    publicKey: undefined
                };
            }
            else 
            {
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
        }

        function getChanges(): MemberChanges
        {
            return {
                addedMembers,
                updatedMembers,
                removedMembers
            }
        }

        onMounted(() =>
        {
            setTableRows();
        });

        return {
            popover,
            color,
            refreshKey,
            searchText,
            userHeaderTab,
            tableColumns,
            tableDataSources,
            Permissions,
            editingMember,
            loading,
            selectedUserDemographics,
            allSearchedUserDemographics,
            disableMemberSearch,
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
