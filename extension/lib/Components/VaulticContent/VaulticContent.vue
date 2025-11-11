<template>
    <div class="vaulticContent">
        <VaulticTable ref="tableRef" id="passwordValueTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :emptyMessage="emptyTableMessage" :dataSources="tableDataSources"
            :searchBarSizeModel="searchBarSizeModel" :maxCellWidth="'10vw'" />
    </div>
</template>

<script lang="ts" setup>
import { getEmptyTableMessage, getNoValuesApplyToFilterMessage } from '@/lib/renderer/Helpers/ModelHelper';
import { IGroupableSortedCollection } from '@/lib/renderer/Objects/DataStructures/SortedCollections';
import app from '@/lib/renderer/Objects/Stores/AppStore';
import { DataType } from '@/lib/renderer/Types/DataTypes';
import { ComponentSizeModel, HeaderTabModel, TableColumnModel, TableDataSources } from '@/lib/renderer/Types/Models';

import VaulticTable from '@/lib/renderer/components/Table/VaulticTable.vue';

const color: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
    app.userPreferences.currentColorPalette.p.p : app.userPreferences.currentColorPalette.v.p);

const passwords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, [], () => app.currentVault.passwordStore.passwordsByID, "f");
const pinnedPasswords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, [], () => app.currentVault.passwordStore.passwordsByID, "f");

const nameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, [], () => app.currentVault.valueStore.nameValuePairsByID, "n");
const pinnedNameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, [], () => app.currentVault.valueStore.nameValuePairsByID, "n");

const headerTabs: HeaderTabModel[] = [
        {
            name: 'Passwords',
            active: computed(() => app.activePasswordValuesTable == DataType.Passwords),
            color: computed(() => app.userPreferences.currentColorPalette.p.p),
            onClick: () => { app.activePasswordValuesTable = DataType.Passwords; }
        },
        {
            name: 'Values',
            active: computed(() => app.activePasswordValuesTable == DataType.NameValuePairs),
            color: computed(() => app.userPreferences.currentColorPalette.v.p),
            onClick: () => { app.activePasswordValuesTable = DataType.NameValuePairs; }
        }
    ];

const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
{
    const models: TableColumnModel[] = []
    if (app.activePasswordValuesTable == DataType.Passwords)
    {
        models.push(new TableColumnModel("Groups", "g").setIsGroupIconCell(true).setData({ 'color': color }).setStartingWidth('clamp(70px, 4.5vw, 105px)'));
        models.push(new TableColumnModel("Password For", "f"));
        models.push(new TableColumnModel("Username", "l"));
    }
    else
    {
        models.push(new TableColumnModel("Groups", "g").setIsGroupIconCell(true).setData({ 'color': color }).setStartingWidth('clamp(70px, 4.5vw, 105px)'));
        models.push(new TableColumnModel("Name", "n"));
        models.push(new TableColumnModel("Type", "y"));
    }

    return models;
});

const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
    width: '9vw',
    minWidth: '110px',
});

const tableDataSources: TableDataSources =
{
    activeIndex: () => app.activePasswordValuesTable == DataType.Passwords ? 0 : 1,
    dataSources: 
    [
        {
            friendlyDataTypeName: "Password",
            collection: passwords,
            pinnedCollection: pinnedPasswords
        },
        {
            friendlyDataTypeName: "Value",
            collection: nameValuePairs,
            pinnedCollection: pinnedNameValuePairs
        }
    ]
};

const emptyTableMessage: ComputedRef<string> = computed(() =>
{
    if (app.activePasswordValuesTable == DataType.Passwords)
    {
        if (app.currentVault.filterStore.activePasswordFilters.length > 0)
        {
            return getNoValuesApplyToFilterMessage("Passwords", false);
        }
        else
        {
            return getEmptyTableMessage("Passwords", false);
        }
    }
    else if (app.activePasswordValuesTable == DataType.NameValuePairs)
    {
        if (app.currentVault.filterStore.activePasswordFilters.length > 0)
        {
            return getNoValuesApplyToFilterMessage("Values", false);
        }
        else
        {
            return getEmptyTableMessage("Values", false);
        }
    }

    return "";
});

</script>

<style scoped>
.vaulticContent {
    width: 100%;
    height: 90%;
    padding: 20px 10px 10px 10px;
}

#passwordValueTable {
    position: relative;
    height: 90%;
}

</style>
