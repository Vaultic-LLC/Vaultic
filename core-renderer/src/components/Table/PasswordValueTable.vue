<template>
    <div class="passwordValueTableContainer">
        <VaulticTable ref="tableRef" id="passwordValueTable" :valueName="'Password'" :color="color" :columns="tableColumns" :values="currentCollectionForTable" 
        :headerTabs="headerTabs" :collections="tableCollections"
            :onPin="onPinPassword" :onEdit="onEditPassword" :onDelete="onPasswordDeleteInitiated">
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
import SlideInRow from './Rows/SlideInRow.vue';
import PasswordRow from "./Rows/PasswordRow.vue"
import NameValuePairRow from './Rows/NameValuePairRow.vue';
import TableHeaderRow from './Header/TableHeaderRow.vue';
import TableTemplate from './TableTemplate.vue';
import CollapsibleTableRow from './Rows/CollapsibleTableRow.vue';
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';
import EditPasswordPopup from '../ObjectPopups/EditPopups/EditPasswordPopup.vue';
import EditValuePopup from '../ObjectPopups/EditPopups/EditValuePopup.vue';
import SearchBar from './Controls/SearchBar.vue';
import VaulticTable from './VaulticTable.vue';

import { CollapsibleTableRowModel, HeaderTabModel, SortableHeaderModel, TableCollections, TableColumnModel, TableRowModel, emptyHeader } from '../../Types/Models';
import { IGroupableSortedCollection } from "../../Objects/DataStructures/SortedCollections"
import { createSortableHeaderModels, getEmptyTableMessage, getNoValuesApplyToFilterMessage, getPasswordValueTableRowModels } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { ReactiveValue } from '../../Objects/Stores/ReactiveValue';
import { TableTemplateComponent } from '../../Types/Components';
import { DataType, Filter, FilterStatus, IFilterable, IGroupable } from '../../Types/DataTypes';
import { HeaderDisplayField } from '../../Types/Fields';
import { Field, IIdentifiable } from '@vaultic/shared/Types/Fields';

export default defineComponent({
    name: "PasswordValueTable",
    components:
    {
        VaulticTable,
        ObjectPopup,
        TableTemplate,
        AddDataTableItemButton,
        TableHeaderRow,
        CollapsibleTableRow,
        PasswordRow,
        NameValuePairRow,
        SlideInRow,
        EditPasswordPopup,
        EditValuePopup,
        SearchBar,
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

        let rowComponent: Ref<string> = ref(app.activePasswordValuesTable == DataType.Passwords ? 'PasswordRow' : 'NameValuePairRow');
        let collapsibleTableRowModels: Ref<InfiniteScrollCollection<CollapsibleTableRowModel>> = ref(new InfiniteScrollCollection<CollapsibleTableRowModel>());

        let showEditPasswordPopup: Ref<boolean> = ref(false);
        let currentEditingPasswordModel: Ref<ReactivePassword | undefined> = ref(undefined);

        let showEditValuePopup: Ref<boolean> = ref(false);
        let currentEditingValueModel: Ref<ReactiveValue | any> = ref({});

        let deletePassword: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
        let deleteValue: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

        const passwordSearchText: Ref<string> = ref('');
        const valueSearchText: Ref<string> = ref('');
        const currentSearchText: ComputedRef<Ref<string>> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            passwordSearchText : valueSearchText);

        const passwordsForTable: Ref<TableRowModel[]> = ref([]);
        const currentCollectionForTable: ComputedRef<IGroupableSortedCollection> = computed(() => app.activePasswordValuesTable == DataType.Passwords ? passwords : nameValuePairs);
        
        const tableCollections: Reactive<TableCollections> = reactive(
        {
            activeIndex: () => app.activePasswordValuesTable == DataType.Passwords ? 0 : 1,
            collections: 
            [
                passwords,
                nameValuePairs
            ]
        });

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                models.push({ header: "Groups", field: "groups", component: "GroupIconsRowValue", data: { 'color': color }, startingWidth: '105px' });
                models.push({ header: "Password For", field: "passwordFor" });
                models.push({ header: "Username", field: "login" });
            }
            else 
            {
                models.push({ header: "Groups", field: "groups", component: "GroupIconsRowValue", data: { 'color': color }, startingWidth: '105px' });
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

        const passwordActiveHeader: Ref<number> = ref(1);
        const valueActiveHeader: Ref<number> = ref(1);

        const passwordHeaderDisplayFields: HeaderDisplayField[] = [
            {
                displayName: "Groups",
                backingProperty: "groups",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true,
                centered: true,
                headerSpaceRight: '20px'
            },
            {
                displayName: "Password For",
                backingProperty: "passwordFor",
                width: 'clamp(110px, 7vw, 250px)',
                clickable: true
            },
            {
                displayName: "Username",
                backingProperty: "login",
                width: 'clamp(100px, 9vw, 300px)',
                clickable: true
            }
        ];

        const valueHeaderDisplayFields: HeaderDisplayField[] = [
            {
                displayName: "Groups",
                backingProperty: "groups",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true,
                centered: true,
                headerSpaceRight: '20px'
            },
            {
                displayName: "Name",
                backingProperty: "name",
                width: 'clamp(110px, 7vw, 250px)',
                clickable: true
            },
            {
                displayName: "Type",
                backingProperty: "valueType",
                width: 'clamp(100px, 9vw, 300px)',
                clickable: true
            }
        ];

        const passwordHeaders: SortableHeaderModel[] = createSortableHeaderModels(passwordActiveHeader, passwordHeaderDisplayFields,
            passwords, pinnedPasswords, setModels);
        passwordHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])

        const valueHeaders: SortableHeaderModel[] = createSortableHeaderModels(valueActiveHeader, valueHeaderDisplayFields,
            nameValuePairs, pinnedNameValuePairs, setModels);
        valueHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])

        const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
        {
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    return valueHeaders;
                case DataType.Passwords:
                default:
                    return passwordHeaders;
            }
        });

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
                    nameValuePairs.updateValues(getPasswordValueTableRowModels(DataType.NameValuePairs, app.currentVault.valueStore.nameValuePairs));
                    break;
                case DataType.Passwords:
                default:
                    passwords.updateValues(getPasswordValueTableRowModels(DataType.Passwords, app.currentVault.passwordStore.passwords));
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

        function onPinPassword(isPinning: boolean, value: Field<ReactivePassword>)
        {
            if (isPinning)
            {
                app.userPreferences.addPinnedPassword(value.value.id.value);
            }
            else 
            {
                app.userPreferences.removePinnedPasswords(value.value.id.value);

                // make sure password is still in current filters
                let activeFilters: Field<Filter>[] = app.currentVault.filterStore.activePasswordFilters;

                // check to see if its in search text first 
                // TODO: should be able to do vaulticTable. Or do I need to? Will the DataTable already filter it out if I have search text filled in?

                // values isn't in current filters, remove it
                if (activeFilters.length > 0 && activeFilters.filter(f => value.value.filters.value.has(f.value.id.value)).length > 0)
                {
                    const modelIndex: number = passwordsForTable.value.findIndex(m => m.backingObject == value);
                    passwordsForTable.value.splice(modelIndex, 1);
                }
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

        watch(() => app.activePasswordValuesTable, (newValue) =>
        {
            switch (newValue)
            {
                case DataType.NameValuePairs:
                    rowComponent.value = 'NameValuePairRow';
                    break;
                case DataType.Passwords:
                default:
                    rowComponent.value = "PasswordRow";
            }

            setModels();
        })

        watch(() => app.currentVault.filterStore.activePasswordFilters, (newValue, oldValue) =>
        {
            filter(DataType.Passwords, newValue, oldValue, passwords, app.currentVault.passwordStore.unpinnedPasswords);
            setModels();
        });

        watch(() => app.currentVault.filterStore.activeNameValuePairFilters, (newValue, oldValue) =>
        {
            filter(DataType.NameValuePairs, newValue, oldValue, nameValuePairs, app.currentVault.valueStore.unpinnedValues);
            setModels();
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

        watch(() => passwordSearchText.value, (newValue) =>
        {
            passwords.search(newValue);
            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => valueSearchText.value, (newValue) =>
        {
            nameValuePairs.search(newValue);
            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.settings.value.multipleFilterBehavior.value, () =>
        {
            init();
        });

        return {
            currentCollectionForTable,
            tableColumns,
            readOnly,
            tableRef,
            activeTable,
            color,
            headerModels,
            rowComponent,
            collapsibleTableRowModels,
            showEditPasswordPopup,
            currentEditingPasswordModel,
            showEditValuePopup,
            currentEditingValueModel,
            currentSearchText,
            headerTabs,
            emptyTableMessage,
            tableCollections,
            onEditPasswordPopupClose,
            onEditValuePopupClose,
            onDeletePasswordConfirmed,
            onDeleteValueConfirmed,
            onEditPassword,
            onPasswordDeleteInitiated,
            onPinPassword
        }
    }
})
</script>

<style>
#passwordValueTable {
    height: 55%;
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
