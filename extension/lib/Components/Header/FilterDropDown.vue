<template>
    <div class="filterDropDownContainer">
      <ObjectMultiSelect :label="'Filters'" :width="'100%'" :height="'100%'" :minHeight="''" :color="color" v-model="selectedFilters" 
          :options="allFilters" @onOptionSelect="onFilterSelected" />
    </div>
  </template>

<script lang="ts" setup>
import syncManager from '../../Utilities/SyncManager';
import { ObjectSelectOptionModel } from '../../renderer/Types/Models';
import app from '../../renderer/Objects/Stores/AppStore';
import { DataType } from '@/lib/renderer/Types/DataTypes';

import ObjectMultiSelect from '../../renderer/components/InputFields/ObjectMultiSelect.vue';

const selectedFilters: Ref<ObjectSelectOptionModel[]> = ref(getSelectedFilters());
let previousSelectedFilters: ObjectSelectOptionModel[] = selectedFilters.value;
const allFilters: Ref<ObjectSelectOptionModel[]> = ref([]);

const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

function onFilterSelected(filters: ObjectSelectOptionModel[])
{
    const addedFilters = filters.filter(f => !previousSelectedFilters.some(pf => pf.id == f.id));
    addedFilters.forEach(async f => 
    {
        await app.userPreferences.toggleFilter(f.id);
    });

    const removedFilters = previousSelectedFilters.filter(pf => !filters.some(f => pf.id == f.id));
    removedFilters.forEach(async f => 
    {
        await app.userPreferences.toggleFilter(f.id);
    });

    previousSelectedFilters = filters;
}

function getSelectedFilters()
{
    const selected: ObjectSelectOptionModel[] = [];
    if (app.activePasswordValuesTable == DataType.Passwords)
    {
        app.currentVault.filterStore.activePasswordFilters.forEach(f => {
            selected.push({
                id: f.id,
                label: f.n,
                backingObject: f
            });
        });
    }
    else 
    {
        app.currentVault.filterStore.activeNameValuePairFilters.forEach(f => {
            selected.push({
                id: f.id,
                label: f.n,
                backingObject: f
            });
        });
    } 

    return selected;
}

function setAllFilters()
{
    const filters: ObjectSelectOptionModel[] = [];
    if (app.activePasswordValuesTable == DataType.Passwords)
    {
        app.currentVault.filterStore.passwordFilters.forEach(f => {
            filters.push({
                id: f.id,
                label: f.n,
                backingObject: f
            });
        });
    }
    else 
    {
        app.currentVault.filterStore.nameValuePairFilters.forEach(f => {
            filters.push({
                id: f.id,
                label: f.n,
                backingObject: f
            });
        });
    } 

    allFilters.value = filters;
}

function setFilters()
{
    selectedFilters.value = getSelectedFilters();
    setAllFilters();
}

onMounted(async() => 
{
    setAllFilters();
    syncManager.addAfterSyncCallback(3, async () => setFilters());
});

</script>

<style scoped>
.filterDropDownContainer {
    width: 175px;
    height: 35px
}
</style>
