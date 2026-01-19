<template>
    <div class="mobileHome">
        <div class="mobileHome__header">
            <ObjectSingleSelect :label="'Vault'" :color="color" v-model="selectedVault" :showClear="false"
                :options="vaults" :width="'100%'" :minWidth="''" :maxWidth="''" :height="'100%'" :minHeight="''" :maxHeight="''" @update:model-value="onVaultSelected" />
            <div class="mobileHome__syncButton" @click="syncVaults()" v-if="isOnline">
                <IonIcon :name="'sync-outline'" />
            </div>
        </div>
        <div class="mobileHomeContent">
            <div class="mobileHomeContent__tableSelector">
                <TableSelector class="mobileHomeContent__tableSelectorSelector" :singleSelectorItems="[passwordTableControl, valuesTableControl]" />
                <div class="mobieHomeContent__tableSelectorControls">
                    <div class="mobieHomeContent__tableSelectorControlsIcon ">
                        <span class="pi pi-search" @click="(e) => togglePopup(e, true)"></span>
                    </div>
                    <div class="mobieHomeContent__tableSelectorControlsIcon">
                        <IonIcon :name="'filter-outline'" @click="(e: MouseEvent) => togglePopup(e, false)" />
                    </div>
                </div>
            </div>
            <div class="mobileHomeContent__table">
                <PasswordValueTable class="mobileHomeContentTable__passwordValueTable" />
            </div>
        </div>
        <Popover ref="popover">
            <div class="mobileHome__contentControlsPopoverContent">
                <SearchBar v-if="searchPopupIsOpen" :modelValue="searchText" :color="color" :sizeModel="searchBarSizeModel" @update:modelValue="(value: string | undefined) => searchText = value" />
                <ObjectMultiSelect v-else :label="'Filters'" :width="'100%'" :height="'100%'" :minHeight="''" :maxWidth="''" :color="color" v-model="selectedFilters" 
                    :options="allFilters" @onOptionSelect="onFilterSelected" />
            </div>
        </Popover>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, provide, Ref, ref, watch } from 'vue';

import IonIcon from '../Icons/IonIcon.vue';
import ObjectSingleSelect from '../InputFields/ObjectSingleSelect.vue';
import TableSelector from '../TableSelector.vue';
import PasswordValueTable from '../Table/PasswordValueTable.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import Popover from 'primevue/popover';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';

import app from '../../Objects/Stores/AppStore';
import { ComponentSizeModel, ObjectSelectOptionModel, SingleSelectorItemModel } from '../../Types/Models';
import { ColorPalette } from '@vaultic/shared/Types/Color';
import { DataType } from '../../Types/DataTypes';
import { CustomSearchProviderKey } from '../../Constants/Keys';

export default defineComponent({
    name: 'MobileHome',
    components:
    {
        IonIcon,
        ObjectSingleSelect,
        TableSelector,
        PasswordValueTable,
        SearchBar,
        Popover,
        ObjectMultiSelect
    },
    setup()
    {
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const currentColorPalette: ComputedRef<ColorPalette> = computed(() => app.userPreferences.currentColorPalette);

        const selectedVault: Ref<ObjectSelectOptionModel | null> = ref(null);
        const vaults: Ref<ObjectSelectOptionModel[]> = ref([]);

        const currentPasswordValueType: ComputedRef<DataType> = computed(() => app.activePasswordValuesTable);

        const searchPopupIsOpen: Ref<boolean> = ref(false);
        const popover: Ref<any> = ref();
        const searchText: Ref<string | undefined> = ref("");
        provide(CustomSearchProviderKey, searchText);
        
        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '100%',
            minWidth: '0px',
        });

        const selectedFilters: Ref<ObjectSelectOptionModel[]> = ref(getSelectedFilters());
        let previousSelectedFilters: ObjectSelectOptionModel[] = selectedFilters.value;
        const allFilters: Ref<ObjectSelectOptionModel[]> = ref([]);

        const passwordTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Passwords"),
                color: ref(currentColorPalette.value.p.p),
                isActive: computed(() => currentPasswordValueType.value == DataType.Passwords),
                onClick: () => { app.activePasswordValuesTable = DataType.Passwords; }
            }
        });

        const valuesTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Values"),
                color: ref(currentColorPalette.value.v.p),
                isActive: computed(() => currentPasswordValueType.value == DataType.NameValuePairs),
                onClick: () => { app.activePasswordValuesTable = DataType.NameValuePairs; }
            }
        });

        async function onVaultSelected(model: ObjectSelectOptionModel): Promise<void>
        {
            selectedVault.value = model;
            return new Promise((resolve) => 
            {
                app.popups.showRequestAuthentication(color.value, onKeySuccess, () => resolve());

                async function onKeySuccess(key: string)
                {
                    if (!(await app.setActiveVault(key, model.backingObject?.userVaultID)))
                    {
                        app.popups.showToast('Failed to select Vault', false);
                    }

                    resolve();
                }
            });       
        }

        function syncVaults(): Promise<void>
        {
            return new Promise((resolve) => 
            {
                app.popups.showRequestAuthentication(color.value, onKeySuccess, () => resolve());

                async function onKeySuccess(key: string)
                {
                    await app.syncVaults(key, app.userInfo!.email!);
                    resolve();
                }
            });
        }

        function setVaults()
        {
            vaults.value = app.userVaults.value.map(v => ({
                id: v.vaultID.toString(),
                label: v.name,
                backingObject: v
            }));

            selectedVault.value = vaults.value.find(v => v.backingObject?.vaultID == app.currentVault?.vaultID) ?? null;
        }

        function togglePopup(e: MouseEvent, isSearch: boolean)
        {
            popover.value.toggle({currentTarget: e.currentTarget});
            searchPopupIsOpen.value = isSearch

            // we clicked on a differnt icon while the other popup was open, show that one now
            if (isSearch !== searchPopupIsOpen.value)
            {
                setTimeout(() => popover.value.toggle({currentTarget: e.currentTarget}), 100);          
            }
        }

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

        watch(app.userVaults, setVaults);
        watch(app.currentVault.filterStore.passwordFilters, setAllFilters);
        watch(() => app.activePasswordValuesTable, setAllFilters);
            
        return {
            color,
            isOnline,
            selectedVault,
            vaults,
            currentPasswordValueType,
            passwordTableControl,
            valuesTableControl,
            searchPopupIsOpen,
            popover,
            searchText,
            selectedFilters,
            allFilters,
            searchBarSizeModel,
            togglePopup,
            onVaultSelected,
            syncVaults,
            onFilterSelected
        }
    }
});
</script>

<style>
.mobileHome {
    flex-grow: 1;
    height: calc(100vh - 60px);
    position: relative;
    display: flex;
    flex-direction: column;
}

.mobileHome__header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 10px;
    color: white;
    margin-bottom: 0; /* put the margin on the table selector so the highlight affect doesn't get covered */
}

.mobileHome__syncButton {
    cursor: pointer;
    transition: 0.3s;
}

.mobileHome__syncButton:hover {
    color: grey;
}

.mobileHomeContent {
    position: relative;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--mobile-home-content-gap);
}

.mobileHomeContent__tableSelector {
    width: 50%;
    color: white;
}

.mobileHomeContent__tableSelectorSelector {
    position: relative;
    margin-top: 0;
    height: var(--mobile-table-selector-height);
    margin-top: var(--mobile-table-selector-margin-top);
}

.mobieHomeContent__tableSelectorControls {
    position: absolute;
    right: 10px;
    top: 25px;
    display: flex;
    gap: 10px;
}

.mobieHomeContent__tableSelectorControlsIcon {
    transition: 0.3s;
}

.mobieHomeContent__tableSelectorControlsIcon:hover,
.mobieHomeContent__tableSelectorControlsIcon:active {
    color: v-bind(color);
}

.mobileHomeContent__table {
    position: relative;
    height: calc(100% - var(--mobile-table-selector-height) - var(--mobile-table-selector-margin-top) - var(--mobile-home-content-gap));
    width: 100%;
}

.mobileHomeContentTable__passwordValueTable {
    position: relative;
    height: 100%;
}

.mobileHome__contentControlsPopoverContent {
    width: 80vw;
}
</style>
