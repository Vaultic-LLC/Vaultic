<template>
    <div class="passwordValueTableContainer">
        <VaulticTable ref="tableRef" id="passwordValueTable" :class="{ 'isBrowserExtension': isBrowserExtension, 'isMobile': isMobile }" :color="color" 
            :columns="tableColumns" :headerTabs="headerTabs" :emptyMessage="emptyTableMessage" :dataSources="tableDataSources"
            :searchBarSizeModel="searchBarSizeModel" :allowPinning="!readOnly && !isBrowserExtension && !isMobile" :onPin="!isBrowserExtension ? onPin : undefined" 
            :onEdit="isMobile ? undefined : onEdit" :onDelete="isMobile ? undefined : onDelete" :maxCellWidth="isBrowserExtension ? '23vw' : '10vw'" :allowSearching="!isMobile"
            :infiniteScroll="isMobile" :initalRowsToLoad="initalRowsToLoad" :headerTableControlsClass="isMobile ? 'mobileHeaderTableControls' : undefined"
            :onAdditionalRowButtonClicked="isMobile ? onAdditionalRowButtonClicked : undefined" :useSearchIcon="isMobile" :searchIconClass="'passwordValueTableContainer__searchIcon'">
            <template #tableControls>
                <Transition name="fade" mode="out-in">
                    <AddDataTableItemButton v-if="!readOnly" :color="color" :initalActiveContentOnClick="activeTable" />
                </Transition>
            </template>
            <template #additionalRowButton>
                <IonIcon class="rowIcon" :name="'menu-outline'" :tooltip="'Menu'" />
            </template>
        </VaulticTable>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditPasswordPopup" :closePopup="onEditPasswordPopupClose">
                    <EditPasswordPopup :model="currentEditingPasswordModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditValuePopup" :closePopup="onEditValuePopupClose">
                    <EditValuePopup :model="currentEditingValueModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
        <Popover ref="popover"
                :pt="{
                    root: ({state}: {state: any}) =>
                    {
                        helpPopupIsOpen = state.visible;
                        return 'signInViewContainer__helpPopover';
                    }
                }">
                <div class="signInViewContainer__helpPopoverContent">
                    <div class="signInViewContainer__helpPopoverSection">
                        <PopupButton :color="color" :text="mobileContextPinText"
                            :width="'5vw'" :minWidth="'70px'" :maxWidth="'130px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'clamp(12px, 0.8vw, 18px)'" :fallbackClickHandler="mobileContextMenuActiveData?.onPin" />
                    </div>
                    <div class="signInViewContainer__helpPopoverSectionSeperator"></div>
                    <div class="signInViewContainer__helpPopoverSection">
                        <PopupButton :color="color" :text="'Edit'"
                            :width="'5vw'" :minWidth="'70px'" :maxWidth="'130px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'clamp(12px, 0.8vw, 18px)'" :fallbackClickHandler="mobileContextMenuActiveData?.onEdit"/>
                    </div>
                    <div class="signInViewContainer__helpPopoverSectionSeperator"></div>
                    <div class="signInViewContainer__helpPopoverSection">
                        <PopupButton :color="color" :text="'Delete'"
                            :width="'5vw'" :minWidth="'70px'" :maxWidth="'130px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'clamp(12px, 0.8vw, 18px)'" :fallbackClickHandler="mobileContextMenuActiveData?.onDelete"/>
                    </div>
                </div>
            </Popover>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';

import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';
import EditPasswordPopup from '../ObjectPopups/EditPopups/EditPasswordPopup.vue';
import EditValuePopup from '../ObjectPopups/EditPopups/EditValuePopup.vue';
import VaulticTable from './VaulticTable.vue';
import IonIcon from '../Icons/IonIcon.vue';
import Popover from 'primevue/popover';
import PopupButton from '../InputFields/PopupButton.vue';

import { HeaderTabModel, TableDataSources, TableColumnModel, ComponentSizeModel, TableRowModel } from '../../Types/Models';
import { IGroupableSortedCollection } from "../../Objects/DataStructures/SortedCollections"
import { getEmptyTableMessage, getNoValuesApplyToFilterMessage, getPasswordValueTableRowModels } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { ReactiveValue } from '../../Objects/Stores/ReactiveValue';
import { TableTemplateComponent } from '../../Types/Components';
import { DataType, Filter, IFilterable, IGroupable } from '../../Types/DataTypes';
import { IIdentifiable } from '@vaultic/shared/Types/Fields';
import { FilterStatus } from '@vaultic/shared/Types/Stores';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

export default defineComponent({
    name: "PasswordValueTable",
    components:
    {
        VaulticTable,
        ObjectPopup,
        AddDataTableItemButton,
        EditPasswordPopup,
        EditValuePopup,
        IonIcon,
        Popover,
        PopupButton,
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const isBrowserExtension: ComputedRef<boolean> = computed(() => app.isBrowserExtension);
        const isMobile: ComputedRef<boolean> = computed(() => app.isMobile);
        const activeTable: Ref<number> = ref(app.activePasswordValuesTable);
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);
        const color: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            app.userPreferences.currentColorPalette.p.p : app.userPreferences.currentColorPalette.v.p);

        const passwords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, [], () => app.currentVault.passwordStore.passwordsByID, "f");
        const pinnedPasswords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, [], () => app.currentVault.passwordStore.passwordsByID, "f");

        const nameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, [], () => app.currentVault.valueStore.nameValuePairsByID, "n");
        const pinnedNameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, [], () => app.currentVault.valueStore.nameValuePairsByID, "n");

        let showEditPasswordPopup: Ref<boolean> = ref(false);
        let currentEditingPasswordModel: Ref<ReactivePassword | undefined> = ref(undefined);

        let showEditValuePopup: Ref<boolean> = ref(false);
        let currentEditingValueModel: Ref<ReactiveValue | any> = ref({});

        let deletePassword: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
        let deleteValue: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

        let initalizedPasswordModels = false;
        let initalizedValueModels = false;

        // Load more rows on mobile so the table will actually fill up the entire screen and infiite scroll will work.
        const initalRowsToLoad: Ref<number | undefined> = ref(isMobile.value ? 25 : undefined);
        const mobileContextPinText: Ref<string> = ref("Pin");
        const mobileContextMenuActiveData: Ref<{ target: EventTarget | null, onPin: () => void, onEdit: () => void, onDelete: () => void } | undefined> = ref(undefined);
        const helpPopupIsOpen: Ref<boolean> = ref(false);
        const popover: Ref<any> = ref();

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

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                models.push(new TableColumnModel("Groups", "g").setIsGroupIconCell(true).setData({ 'color': color }).setStartingWidth('clamp(70px, 4.5vw, 105px)'));
                models.push(new TableColumnModel("Password For", "f"));

                if (!isMobile.value)
                {
                    models.push(new TableColumnModel("Username", "l"));
                }
            }
            else
            {
                models.push(new TableColumnModel("Groups", "g").setIsGroupIconCell(true).setData({ 'color': color }).setStartingWidth('clamp(70px, 4.5vw, 105px)'));
                models.push(new TableColumnModel("Name", "n"));

                if (!isMobile.value)
                {
                    models.push(new TableColumnModel("Type", "y"));
                }
            }

            return models;
        });

        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                if (app.currentVault.filterStore.activePasswordFilters.length > 0)
                {
                    return getNoValuesApplyToFilterMessage("Passwords");
                }
                else
                {
                    return getEmptyTableMessage("Passwords");
                }
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                if (app.currentVault.filterStore.activePasswordFilters.length > 0)
                {
                    return getNoValuesApplyToFilterMessage("Values");
                }
                else
                {
                    return getEmptyTableMessage("Values");
                }
            }

            return "";
        });

        const headerTabs: HeaderTabModel[] = isMobile.value ? [] : [
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

        function filter<T extends IFilterable & IIdentifiable & IGroupable & { [key: string]: string }>(dataType: DataType,
            newValue: Filter[], oldValue: Filter[], localVariable: IGroupableSortedCollection, originalVariable: T[])
        {
            // no active filters
            if (newValue.length == 0)
            {
                const [models, _] = getPasswordValueTableRowModels(color.value, dataType, originalVariable);
                localVariable.updateValues(models);
            }
            // adding first filter
            else if (oldValue.length == 0)
            {
                let temp: T[] = [];
                newValue.forEach(f =>
                {
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && OH.has(p.i, f.id)))
                });

                const [models, _] = getPasswordValueTableRowModels(color.value, dataType, temp);
                localVariable.updateValues(models);            
            }
            // Activated filter
            else if (newValue.length > oldValue.length)
            {
                // @ts-ignore
                let temp: T[] = Array.from(localVariable.values.map(v => localVariable.backingValues()[v.id]));
                if (app.settings.f == FilterStatus.Or)
                {
                    const filtersActivated: Filter[] = newValue.filter(f => !oldValue.includes(f));
                    filtersActivated.forEach(f =>
                    {
                        temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && OH.has(p.i, f.id)));
                    });
                }
                else if (app.settings.f == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => OH.has(p.i, f.id))));
                }

                const [models, _] = getPasswordValueTableRowModels(color.value, dataType, temp);
                localVariable.updateValues(models);
            }
            // removed filter
            else if (newValue.length < oldValue.length)
            {
                // @ts-ignore
                let temp: T[] = Array.from(localVariable.values.map(v => localVariable.backingValues()[v.id]));
                if (app.settings.f == FilterStatus.Or)
                {
                    const filtersRemoved: Filter[] = oldValue.filter(f => !newValue.includes(f));

                    filtersRemoved.forEach(f =>
                    {
                        temp = temp.filter(v =>
                        {
                            // keep values that the removed filter doesn't apply to
                            if (!OH.has(v.i, f.id))
                            {
                                return true;
                            }

                            // remove value if it doesn't have a current active filter
                            return newValue.filter(nv => OH.has(v.i, nv.id)).length > 0;
                        });
                    });
                }
                else if (app.settings.f == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => OH.has(p.i, f.id))));
                }

                const [models, _] = getPasswordValueTableRowModels(color.value, dataType, temp);
                localVariable.updateValues(models);
            }
        }

        async function setModels(onlyPinned: boolean)
        {
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    const [valueModels, valuePinnedModels] = getPasswordValueTableRowModels(color.value, DataType.NameValuePairs, app.currentVault.valueStore.nameValuePairs);
                    if (!onlyPinned)
                    {
                        nameValuePairs.updateValues(valueModels);
                    }
                    pinnedNameValuePairs.updateValues(valuePinnedModels);
                    initalizedValueModels = true;
                    break;
                case DataType.Passwords:
                default:
                    const [passwordModels, passwordPinnedModels] = getPasswordValueTableRowModels(color.value, DataType.Passwords, app.currentVault.passwordStore.passwords);
                    if (!onlyPinned)
                    {
                        passwords.updateValues(passwordModels);
                    }
                    pinnedPasswords.updateValues(passwordPinnedModels);
                    initalizedPasswordModels = true;
            }

            if (tableRef.value)
            {
                // @ts-ignore
                tableRef.value.scrollToTop();
            }


            // use a timeout so that the color prop can update before we calculate the new color.
            //setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function initPasswords()
        {
            setModels(false);
            filter(DataType.Passwords, app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.passwords);

            if (app.currentVault.filterStore.activePasswordFilters.length == 0)
            {
                setModels(false);
            }
            else
            {
                setModels(true);
                filter(DataType.Passwords, app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.passwords);
            }
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function initValues()
        {
            if (app.currentVault.filterStore.activeNameValuePairFilters.length == 0)
            {
                setModels(false);
            }
            else
            {
                setModels(true);
                filter(DataType.NameValuePairs, app.currentVault.filterStore.activeNameValuePairFilters, [], nameValuePairs, app.currentVault.valueStore.nameValuePairs);
            }

            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function init()
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                initPasswords();
            }
            else
            {
                initValues();
            }
        }

        function onPin(isPinned: boolean, dataType: any)
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                onPinPassword(isPinned, dataType);
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                onPinValue(isPinned, dataType);
            }
        }

        function onEdit(dataType: any)
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                onEditPassword(dataType);
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                onEditValue(dataType);
            }
        }

        function onDelete(dataType: any)
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                onPasswordDeleteInitiated(dataType);
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                onValueDeleteInitiated(dataType);
            }
        }

        function onEditPassword(password: ReactivePassword)
        {
            currentEditingPasswordModel.value = password;
            showEditPasswordPopup.value = true;
        }

        function onEditValue(value: ReactiveValue)
        {
            currentEditingValueModel.value = value;
            showEditValuePopup.value = true;
        }

        function onEditPasswordPopupClose(saved: boolean)
        {
            showEditPasswordPopup.value = false;

            if (saved)
            {
                initPasswords();
            }
        }

        function onEditValuePopupClose(saved: boolean)
        {
            showEditValuePopup.value = false;

            if (saved)
            {
                initValues();
            }
        }

        function onPasswordDeleteInitiated(password: ReactivePassword)
        {
            deletePassword.value = async (key: string) =>
            {
                return await app.currentVault.passwordStore.deletePassword(key, password);
            };

            app.popups.showRequestAuthentication(color.value, onDeletePasswordConfirmed, () => { }, true);
        }

        async function onDeletePasswordConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Password");
            const succeeded = await deletePassword.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast("Password Deleted", true);
            }
            else
            {
                app.popups.showToast("Delete Failed", false);
            }
        }

        function onValueDeleteInitiated(value: ReactiveValue)
        {
            deleteValue.value = async (key: string) =>
            {
                return await app.currentVault.valueStore.deleteNameValuePair(key, value);
            };

            app.popups.showRequestAuthentication(color.value, onDeleteValueConfirmed, () => { }, true);
        }

        async function onDeleteValueConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Value");
            const succeeded = await deleteValue.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast("Value Deleted", true);
            }
            else
            {
                app.popups.showToast("Delete Failed", false);
            }
        }

        function onPinPassword(isPinned: boolean, value: ReactivePassword)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedPasswords(value.id);

                // make sure password is still in current filters
                let activeFilters: Filter[] = app.currentVault.filterStore.activePasswordFilters;

                // password isn't in current filters, remove it
                if (activeFilters.length > 0 && activeFilters.filter(f => OH.has(value.i, f.id)).length > 0)
                {
                    passwords.remove(value.id);
                }
            }
            else
            {
                app.userPreferences.addPinnedPassword(value.id);
            }
        }

        function onPinValue(isPinned: boolean, value: ReactivePassword)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedValues(value.id);

                // make sure value is still in current filters
                let activeFilters: Filter[] = app.currentVault.filterStore.activeNameValuePairFilters;

                // values isn't in current filters, remove it
                if (activeFilters.length > 0 && activeFilters.filter(f => OH.has(value.i, f.id)).length > 0)
                {
                    nameValuePairs.remove(value.id);
                }
            }
            else
            {
                app.userPreferences.addPinnedValue(value.id);
            }
        }

        function onAdditionalRowButtonClicked(event: MouseEvent, tableRowModel: TableRowModel, dataType: any)
        {
            event.stopPropagation();
            event.preventDefault();

            mobileContextPinText.value = tableRowModel.isPinned ? "Unpin" : "Pin";
            mobileContextMenuActiveData.value = 
            { 
                target: event.currentTarget, 
                onPin: () => 
                {
                    onPin(tableRowModel.isPinned ?? false, dataType),
                    cleanupMobileContextMenuActiveData();
                },
                onEdit: () => 
                {
                    onEdit(dataType),
                    cleanupMobileContextMenuActiveData();
                },
                onDelete: () => 
                {
                    onDelete(dataType),
                    cleanupMobileContextMenuActiveData();
                }
            };

            popover.value.toggle({currentTarget: event.currentTarget}); 
            helpPopupIsOpen.value = !helpPopupIsOpen.value;
        }

        function cleanupMobileContextMenuActiveData()
        {
            mobileContextMenuActiveData.value = undefined;
            onHelpUnfocus();
        }

        function onHelpUnfocus()
        {
            if (helpPopupIsOpen.value)
            {
                popover.value.toggle({currentTarget: mobileContextMenuActiveData.value?.target}); 
                helpPopupIsOpen.value = false;
            }
        }

        onMounted(() =>
        {
            init();
            app.vaultDataBreaches.addEvent('onBreachDismissed', initPasswords);

            app.currentVault.groupStore.addEvent('onPasswordGroupUpdated', initPasswords);
            app.currentVault.groupStore.addEvent('onValueGroupUpdated', initValues);

            app.currentVault.filterStore.addEvent('onPasswordFilterUpdated', initPasswords);
            app.currentVault.filterStore.addEvent('onValueFilterUpdated', initValues);
        });

        onUnmounted(() =>
        {
            app.vaultDataBreaches.removeEvent('onBreachDismissed', initPasswords);

            app.currentVault.groupStore.removeEvent('onPasswordGroupUpdated', initPasswords);
            app.currentVault.groupStore.removeEvent('onValueGroupUpdated', initValues);
            
            app.currentVault.filterStore.removeEvent('onPasswordFilterUpdated', initPasswords);
            app.currentVault.filterStore.removeEvent('onValueFilterUpdated', initValues);
        });

        watch(() => app.activePasswordValuesTable, (newValue) =>
        {
            if (newValue == DataType.Passwords && !initalizedPasswordModels)
            {
                initPasswords();
            }
            else if (newValue == DataType.NameValuePairs && !initalizedValueModels)
            {
                initValues();
            }
        });

        watch(() => app.loadedUser.value, () =>
        {
            showEditPasswordPopup.value = false;
            showEditValuePopup.value = false;
        });

        watch(() => app.currentVault.filterStore.activePasswordFilters, (newValue, oldValue) =>
        {
            filter(DataType.Passwords, newValue, oldValue, passwords, app.currentVault.passwordStore.passwords);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.activeNameValuePairFilters, (newValue, oldValue) =>
        {
            filter(DataType.NameValuePairs, newValue, oldValue, nameValuePairs, app.currentVault.valueStore.nameValuePairs);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.passwordStore.passwords.length, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.groupStore.passwordGroups.length, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.valueStore.nameValuePairs.length, () =>
        {
            initValues();
        });

        watch(() => app.currentVault.groupStore.valuesGroups.length, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.passwordStore.activeAtRiskPasswordType, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.valueStore.activeAtRiskValueType, () =>
        {
            initValues();
        });

        watch(() => app.settings.f, () =>
        {
            init();
        });

        watch(() => app.loadedUser.value, (newValue) =>
        {
            if (newValue)
            {
                init();
            }
        })

        return {
            isBrowserExtension,
            isMobile,
            tableColumns,
            readOnly,
            tableRef,
            activeTable,
            color,
            showEditPasswordPopup,
            currentEditingPasswordModel,
            showEditValuePopup,
            currentEditingValueModel,
            headerTabs,
            emptyTableMessage,
            tableDataSources,
            searchBarSizeModel,
            helpPopupIsOpen,
            popover,
            mobileContextPinText,
            mobileContextMenuActiveData,
            initalRowsToLoad,
            onEditPasswordPopupClose,
            onEditValuePopupClose,
            onPin,
            onEdit,
            onDelete,
            onAdditionalRowButtonClicked,
        }
    }
})
</script>

<style>
#passwordValueTable {
    height: 50.5%;
    width: 43%;
    left: 38%;
    top: max(252px, 42%);
}

#passwordValueTable.isBrowserExtension {
    position: relative;
    height: 90%;
    width: 100%;
    left: unset;
    top: unset;
}

#passwordValueTable.isMobile {
    position: relative;
    height: 100%;
    width: 100%;
    left: unset;
    top: unset;
}

.vaulticTableContainer__headerCell.vaulticTableContainer__ControlsHeaderCell.mobileHeaderTableControls {
    width: 20px !important;
}

@media (max-width: 1300px) {
    #passwordValueTable {
        left: 35%;
    }
}
</style>
