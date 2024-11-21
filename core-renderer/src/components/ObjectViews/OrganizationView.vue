<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField :label="'Name'" v-model="orgState.name.value" class="organizationView__nameInput" :color="color" />
        <TableTemplate ref="tableRef" id="organizationView__table" class="scrollbar border" :scrollbar-size="1"
            :color="color" :border="true" :headerModels="tableHeaderModels" :emptyMessage="''"
            :showEmptyMessage="false" :headerTabs="userHeaderTab"
            @scrolledToBottom="tableRowDatas.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="searchText" :color="color" :width="'10vw'" :maxWidth="'250px'"
                    :minWidth="'130px'" />
            </template>
            <template #body>
                <SelectableTableRow v-for="(trd, index) in tableRowDatas.visualValues" class="hover" :key="trd.id"
                    :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false" :color="color" />
            </template>
        </TableTemplate>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch, onMounted } from 'vue';

import ObjectView from "./ObjectView.vue";
import TextInputField from '../InputFields/TextInputField.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import SelectableTableRow from '../Table/Rows/SelectableTableRow.vue';

import { GridDefinition, HeaderTabModel, SelectableTableRowData, SortableHeaderModel, TextTableRowValue } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { defaultOrganization, Member, Organization } from '../../Types/DataTypes';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { createSortableHeaderModels } from '../../Helpers/ModelHelper';
import { HeaderDisplayField } from '../../Types/Fields';
import { TableTemplateComponent } from '../../Types/Components';
import { api } from '../../API';

export default defineComponent({
    name: "OrganizationView",
    components: {
        ObjectView,
        TextInputField,
        TableTemplate,
        SearchBar,
        SelectableTableRow
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
        const userSortedCollection: SortedCollection<Member> = new SortedCollection([], "lastName");

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
                backingProperty: "email",
                displayName: "Email",
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
        
        let tableHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
        {
            return createSortableHeaderModels<Member>(
                activeUserHeader, userHeaderDisplayFields, userSortedCollection, undefined, setTableRows);
        });

        function setTableRows()
        {
            let pendingRows: Promise<SelectableTableRowData>[] = [];
            pendingRows = userSortedCollection.calculatedValues.map(async p =>
            {
                const values: TextTableRowValue[] = [
                    // {
                    //     component: "TableRowTextValue",
                    //     value: p.value.firstName.value,
                    //     copiable: false,
                    //     width: 'clamp(100px, 7vw, 200px)'
                    // },
                    // {
                    //     component: "TableRowTextValue",
                    //     value: p.value.lastName.value,
                    //     copiable: false,
                    //     width: 'clamp(100px, 7vw, 200px)'
                    // },
                    {
                        component: "TableRowTextValue",
                        value: p.value.email.value,
                        copiable: false,
                        width: 'clamp(100px, 7vw, 200px)'
                    },
                    {
                        component: "TableRowTextValue",
                        value: p.value.permission.value.toString(),
                        copiable: false,
                        width: 'clamp(20px, 3vw, 40px)'
                    }
                ];

                const id = await api.utilities.generator.uniqueId();
                const model: SelectableTableRowData = 
                {
                    id: id,
                    key: id,
                    values: values,
                    isActive: ref(orgState.value.members.value.has(p.value.userID.value)),
                    selectable: true,
                    onClick: async function ()
                    {
                        if (orgState.value.members.value.has(p.value.userID.value))
                        {
                            orgState.value.members.value.delete(p.value.userID.value);                                
                        }
                        else
                        {
                            // TODO: is this ok to just add the field here or should I create a new one?
                            orgState.value.members.value.set(p.value.userID.value, p);
                        }
                    }
                }
                return model;
            });
            

            if (pendingRows.length > 0)
            {
                Promise.all(pendingRows).then((rows) =>
                {
                    tableRowDatas.value.setValues(rows);
                    if (tableRef.value)
                    {
                        // @ts-ignore
                        tableRef.value.scrollToTop();
                        setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
                    }
                });
            }
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

        watch(() => searchText.value.value, (newValue) =>
        {
            
        });

        return {
            orgState,
            color,
            refreshKey,
            gridDefinition,
            searchText,
            tableRowDatas,
            tableHeaderModels,
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
