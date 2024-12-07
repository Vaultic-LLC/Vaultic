<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField :label="'Name'" v-model="orgState.name.value" class="organizationView__nameInput" :color="color" />
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch, onMounted } from 'vue';

import ObjectView from "./ObjectView.vue";
import TextInputField from '../InputFields/TextInputField.vue';

import { GridDefinition, HeaderTabModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { defaultOrganization, Member, Organization } from '../../Types/DataTypes';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { HeaderDisplayField } from '../../Types/Fields';
import { TableTemplateComponent } from '../../Types/Components';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';

export default defineComponent({
    name: "OrganizationView",
    components: {
        ObjectView,
        TextInputField,
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);

        const refreshKey: Ref<string> = ref("");
        const orgState: Ref<Organization> = ref(props.model ?? defaultOrganization());
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        
        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

        // @ts-ignore
        const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
        const userSortedCollection: SortedCollection = new SortedCollection([], "lastName");

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const gridDefinition: GridDefinition =
        {
            rows: 13,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 15,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        const userHeaderTab: HeaderTabModel[] = [
            {
                name: 'Members',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        const activeUserHeader: Ref<number> = ref(1);
        const userHeaderDisplayFields: HeaderDisplayField[] = [
            {
                backingProperty: "",
                displayName: "  ",
                width: 'clamp(50px, 4vw, 100px)',
                clickable: false
            },
            // {
            //     backingProperty: "firstName",
            //     displayName: "First Name",
            //     width: 'clamp(100px, 7vw, 200px)',
            //     clickable: true
            // },
            // {
            //     backingProperty: "lastName",
            //     displayName: "Last Name",
            //     width: 'clamp(100px, 7vw, 200px)',
            //     clickable: true
            // },
            {
                backingProperty: "username",
                displayName: "Username",
                width: 'clamp(100px, 7vw, 200px)',
                clickable: true
            },
            {
                backingProperty: "permission",
                displayName: "Permissions",
                width: 'clamp(20px, 3vw, 40px)',
                clickable: true
            },
        ];

        function setTableRows()
        {

        }

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
            if (props.creating)
            {
                handleSaveResponse((await app.organizations.createOrganization(orgState.value)));
            }
            else
            {
                handleSaveResponse((await app.organizations.updateOrganization(orgState.value)));
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
            userSortedCollection.updateValues(orgState.value.members.value.valueArray());
        });

        let lastSearchTime = 0;
        watch(() => searchText.value.value, async (newValue) =>
        {
            if (Date.now() - lastSearchTime >= 200)
            {
                lastSearchTime = Date.now();
                const response = await api.server.user.searchForUsers(newValue);
                if (!response.Success)
                {
                    defaultHandleFailedResponse(response);
                    return;
                }

                
            }
        });

        return {
            orgState,
            color,
            refreshKey,
            gridDefinition,
            searchText,
            tableRowDatas,
            userHeaderTab,
            onSave,
        };
    },
})
</script>

<style>
.organizationView__nameInput {
    grid-row: 1 / span 2;
    grid-column: 4 / span 2;
}

#organizationView__table {
    position: relative;
    grid-row: 5 / span 8;
    grid-column: 4 / span 9;
    min-width: 410px;
    min-height: 182px;
}
</style>
