<template>
    <div class="passwordValueTableContainer">
        <VaulticTable ref="tableRef" id="passwordValueTable" :color="color" :columns="tableColumns" 
        :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage"
            :onPin="onPin" :onEdit="onEdit" :onDelete="onDelete">
            <template #tableControls>
                <Transition name="fade" mode="out-in">
                    <AddDataTableItemButton v-if="!readOnly" :color="color" :initalActiveContentOnClick="activeTable" />
                </Transition>
            </template>
        </VaulticTable>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditPasswordPopup" :closePopup="onEditPasswordPopupClose" :minWidth="'800px'"
                    :minHeight="'480px'">
                    <EditPasswordPopup :model="currentEditingPasswordModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditValuePopup" :closePopup="onEditValuePopupClose" :minWidth="'800px'"
                    :minHeight="'480px'">
                    <EditValuePopup :model="currentEditingValueModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';
import EditPasswordPopup from '../ObjectPopups/EditPopups/EditPasswordPopup.vue';
import EditValuePopup from '../ObjectPopups/EditPopups/EditValuePopup.vue';
import VaulticTable from './VaulticTable.vue';

import { HeaderTabModel, TableDataSources, TableColumnModel, TableRowModel } from '../../Types/Models';
import { IGroupableSortedCollection } from "../../Objects/DataStructures/SortedCollections"
import { getEmptyTableMessage, getNoValuesApplyToFilterMessage, getPasswordValueTableRowModels } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { ReactiveValue } from '../../Objects/Stores/ReactiveValue';
import { TableTemplateComponent } from '../../Types/Components';
import { DataType, Filter, FilterStatus, IFilterable, IGroupable } from '../../Types/DataTypes';
import { Field, IIdentifiable } from '@vaultic/shared/Types/Fields';

export default defineComponent({
    name: "PasswordValueTable",
    components:
    {
        VaulticTable,
        ObjectPopup,
        AddDataTableItemButton,
        EditPasswordPopup,
        EditValuePopup,
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const activeTable: Ref<number> = ref(app.activePasswordValuesTable);
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);
        const color: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value : app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value);

        const passwords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, []);
        const pinnedPasswords: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.Passwords, []);

        const nameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, []);
        const pinnedNameValuePairs: IGroupableSortedCollection = new IGroupableSortedCollection(DataType.NameValuePairs, []);

        let showEditPasswordPopup: Ref<boolean> = ref(false);
        let currentEditingPasswordModel: Ref<ReactivePassword | undefined> = ref(undefined);

        let showEditValuePopup: Ref<boolean> = ref(false);
        let currentEditingValueModel: Ref<ReactiveValue | any> = ref({});

        let deletePassword: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
        let deleteValue: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

        const tableDataSources: Reactive<TableDataSources> = reactive(
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
        });

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                models.push({ header: "Groups", field: "groups", component: "GroupIconsRowCell", data: { 'color': color }, startingWidth: '105px' });
                models.push({ header: "Password For", field: "passwordFor" });
                models.push({ header: "Username", field: "login" });
            }
            else 
            {
                models.push({ header: "Groups", field: "groups", component: "GroupIconsRowCell", data: { 'color': color }, startingWidth: '105px' });
                models.push({ header: "Name", field: "name" });
                models.push({ header: "Type", field: "valueType" });
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

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Passwords',
                active: computed(() => app.activePasswordValuesTable == DataType.Passwords),
                color: computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value),
                onClick: () => { app.activePasswordValuesTable = DataType.Passwords; }
            },
            {
                name: 'Values',
                active: computed(() => app.activePasswordValuesTable == DataType.NameValuePairs),
                color: computed(() => app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value),
                onClick: () => { app.activePasswordValuesTable = DataType.NameValuePairs; }
            }
        ];

        function filter<T extends IFilterable & IIdentifiable & IGroupable & { [key: string]: string }>(dataType: DataType,
            newValue: Field<Filter>[], oldValue: Field<Filter>[], localVariable: IGroupableSortedCollection, originalVariable: Field<T>[])
        {
            // no active filters
            if (newValue.length == 0)
            {
                localVariable.updateValues(getPasswordValueTableRowModels(dataType, originalVariable));
            }
            // adding first filter
            else if (oldValue.length == 0)
            {
                let temp: Field<T>[] = [];
                newValue.forEach(f =>
                {
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.value.filters.value.has(f.value.id.value)));
                });

                localVariable.updateValues(getPasswordValueTableRowModels(dataType, temp));
            }
            // Activated filter
            else if (newValue.length > oldValue.length)
            {
                // @ts-ignore
                let temp: Field<T>[] = [...localVariable.values.map(v => v.backingObject)];
                if (app.settings.value.multipleFilterBehavior.value == FilterStatus.Or)
                {
                    const filtersActivated: Field<Filter>[] = newValue.filter(f => !oldValue.includes(f));
                    filtersActivated.forEach(f =>
                    {
                        temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.value.filters.value.has(f.value.id.value)));
                    });
                }
                else if (app.settings.value.multipleFilterBehavior.value == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.value.filters.value.has(f.value.id.value))));
                }

                localVariable.updateValues(getPasswordValueTableRowModels(dataType, temp));
            }
            // removed filter
            else if (newValue.length < oldValue.length)
            {
                // @ts-ignore
                let temp: Field<T>[] = [...localVariable.values.map(v => v.backingObject)];
                if (app.settings.value.multipleFilterBehavior.value == FilterStatus.Or)
                {
                    const filtersRemoved: Field<Filter>[] = oldValue.filter(f => !newValue.includes(f));

                    filtersRemoved.forEach(f =>
                    {
                        temp = temp.filter(v =>
                        {
                            // keep values that the removed filter doesn't apply to
                            if (!v.value.filters.value.has(f.value.id.value))
                            {
                                return true;
                            }

                            // remove value if it doesn't have a current active filter
                            return newValue.filter(nv => v.value.filters.value.has(nv.value.id.value)).length > 0;
                        });
                    });
                }
                else if (app.settings.value.multipleFilterBehavior.value == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.value.filters.value.has(f.value.id.value))));
                }

                localVariable.updateValues(getPasswordValueTableRowModels(dataType, temp));
            }
        }

        async function setModels()
        {
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    nameValuePairs.updateValues(getPasswordValueTableRowModels(DataType.NameValuePairs, app.currentVault.valueStore.unpinnedValues));
                    break;
                case DataType.Passwords:
                default:
                    passwords.updateValues(getPasswordValueTableRowModels(DataType.Passwords, app.currentVault.passwordStore.unpinnedPasswords));
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
            filter(DataType.Passwords, app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.unpinnedPasswords);
            pinnedPasswords.updateValues(app.currentVault.passwordStore.pinnedPasswords);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function initValues()
        {
            filter(DataType.NameValuePairs, app.currentVault.filterStore.activeNameValuePairFilters, [], nameValuePairs, app.currentVault.valueStore.unpinnedValues);
            pinnedNameValuePairs.updateValues(app.currentVault.valueStore.pinnedValues);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function init()
        {
            filter(DataType.Passwords, app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.unpinnedPasswords);
            filter(DataType.NameValuePairs, app.currentVault.filterStore.activeNameValuePairFilters, [], nameValuePairs, app.currentVault.valueStore.unpinnedValues);

            pinnedPasswords.updateValues(app.currentVault.passwordStore.pinnedPasswords);
            pinnedNameValuePairs.updateValues(app.currentVault.valueStore.pinnedValues);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
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

        function onEditPassword(password: Field<ReactivePassword>)
        {
            currentEditingPasswordModel.value = password.value;
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

            app.popups.showRequestAuthentication(color.value, onDeletePasswordConfirmed, () => { });
        }

        async function onDeletePasswordConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Password");
            const succeeded = await deletePassword.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast(color.value, "Password Deleted", true);
            }
            else
            {
                app.popups.showToast(color.value, "Delete Failed", false);
            }
        }

        function onValueDeleteInitiated(value: ReactiveValue)
        {
            deleteValue.value = async (key: string) =>
            {
                return await app.currentVault.valueStore.deleteNameValuePair(key, value);
            };

            app.popups.showRequestAuthentication(color.value, onDeleteValueConfirmed, () => { });
        }

        async function onDeleteValueConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Value");
            const succeeded = await deleteValue.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast(color.value, "Value Deleted", true);
            }
            else
            {
                app.popups.showToast(color.value, "Delete Failed", false);
            }
        }

        function onPinPassword(isPinned: boolean, value: Field<ReactivePassword>)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedPasswords(value.value.id.value);

                // make sure password is still in current filters
                let activeFilters: Field<Filter>[] = app.currentVault.filterStore.activePasswordFilters;

                // password isn't in current filters, remove it
                if (activeFilters.length > 0 && activeFilters.filter(f => value.value.filters.value.has(f.value.id.value)).length > 0)
                {
                    passwords.remove(value.value.id.value);
                }
            }
            else
            {
                app.userPreferences.addPinnedPassword(value.value.id.value);
            }
        }

        function onPinValue(isPinned: boolean, value: Field<ReactivePassword>)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedValues(value.value.id.value);

                // make sure value is still in current filters
                let activeFilters: Field<Filter>[] = app.currentVault.filterStore.activeNameValuePairFilters;

                // values isn't in current filters, remove it
                if (activeFilters.length > 0 && activeFilters.filter(f => value.value.filters.value.has(f.value.id.value)).length > 0)
                {
                    nameValuePairs.remove(value.value.id.value);
                }
            }
            else
            {
                app.userPreferences.addPinnedValue(value.value.id.value);
            }
        }

        onMounted(() =>
        {
            init();
            app.userDataBreaches.addEvent('onBreachDismissed', initPasswords);
        });

        onUnmounted(() =>
        {
            app.userDataBreaches.removeEvent('onBreachDismissed', initPasswords);
        });

        // watch(() => app.activePasswordValuesTable, () =>
        // {
        //     setModels();
        // });

        watch(() => app.currentVault.filterStore.activePasswordFilters, (newValue, oldValue) =>
        {
            filter(DataType.Passwords, newValue, oldValue, passwords, app.currentVault.passwordStore.unpinnedPasswords);
        });

        watch(() => app.currentVault.filterStore.activeNameValuePairFilters, (newValue, oldValue) =>
        {
            filter(DataType.NameValuePairs, newValue, oldValue, nameValuePairs, app.currentVault.valueStore.unpinnedValues);
        });

        watch(() => app.currentVault.passwordStore.passwords.length, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.valueStore.nameValuePairs.length, () =>
        {
            initValues();
        });

        watch(() => app.currentVault.passwordStore.activeAtRiskPasswordType, () =>
        {
            initPasswords();
        });

        watch(() => app.currentVault.valueStore.activeAtRiskValueType, () =>
        {
            initValues();
        });

        watch(() => app.settings.value.multipleFilterBehavior.value, () =>
        {
            init();
        });

        return {
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
            onEditPasswordPopupClose,
            onEditValuePopupClose,
            onPin,
            onEdit,
            onDelete,
        }
    }
})
</script>

<style>
#passwordValueTable {
    height: 50.5%;
    width: 43%;
    min-width: 547px;
    left: 38%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #passwordValueTable {
        left: max(324px, 28.5%);
    }
}
</style>
