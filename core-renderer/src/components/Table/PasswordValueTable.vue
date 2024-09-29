<template>
    <div class="passwordValueTableContainer">
        <TableTemplate :name="'passwordValue'" id="passwordValueTable" ref="tableRef" :rowGap="0"
            class="shadow scrollbar" :color="color" :headerModels="headerModels" :scrollbar-size="1"
            :emptyMessage="emptyTableMessage" :showEmptyMessage="collapsibleTableRowModels.visualValues.length == 0"
            :headerTabs="headerTabs" @scrolledToBottom="collapsibleTableRowModels.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="currentSearchText" :color="color" :labelBackground="'rgb(44 44 51 / 16%)'"
                    :width="'10vw'" :maxWidth="'250px'" :minWidth="'130px'" :minHeight="'27px'" />
                <AddDataTableItemButton :color="color" :initalActiveContentOnClick="activeTable" />
            </template>
            <template #body>
                <CollapsibleTableRow :shadow="true" v-slot="props"
                    v-for="(model, index) in collapsibleTableRowModels.visualValues" :key="model.id"
                    :groups="model.data.groups" :model="model" :rowNumber="index" :color="color">
                    <SlideInRow :isShowing="props.isShowing" :colspan="headerModels.length + 1"
                        :defaultHeight="'clamp(100px, 22vh, 300px)'">
                        <component :is="rowComponent" :value="model.data"
                            :authenticationPromise="props.authenticationPromise" :color="color"
                            :isShowing="props.isShowing" />
                    </SlideInRow>
                </CollapsibleTableRow>
            </template>
        </TableTemplate>
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
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';

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

import { DataType, Filter, FilterStatus } from '../../Types/Table';
import { HeaderDisplayField, IFilterable, IGroupable, IIdentifiable } from '../../Types/EncryptedData';
import { CollapsibleTableRowModel, HeaderTabModel, SortableHeaderModel, emptyHeader } from '../../Types/Models';
import { IGroupableSortedCollection } from "../../Objects/DataStructures/SortedCollections"
import { createCollapsibleTableRowModels, createSortableHeaderModels, getEmptyTableMessage, getNoValuesApplyToFilterMessage } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { ReactiveValue } from '../../Objects/Stores/ReactiveValue';
import { TableTemplateComponent } from '../../Types/Components';

export default defineComponent({
    name: "PasswordValueTable",
    components:
    {
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
        SearchBar
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const activeTable: Ref<number> = ref(app.activePasswordValuesTable);
        const color: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            app.userPreferences.currentColorPalette.passwordsColor.primaryColor : app.userPreferences.currentColorPalette.valuesColor.primaryColor);

        const passwords: IGroupableSortedCollection<ReactivePassword> = new IGroupableSortedCollection(
            DataType.Passwords, [], "passwordFor");
        const pinnedPasswords: IGroupableSortedCollection<ReactivePassword> = new IGroupableSortedCollection(
            DataType.Passwords, app.currentVault.passwordStore.pinnedPasswords, "passwordFor");

        const nameValuePairs: IGroupableSortedCollection<ReactiveValue> = new IGroupableSortedCollection(
            DataType.NameValuePairs, [], "name");
        const pinnedNameValuePairs: IGroupableSortedCollection<ReactiveValue> = new IGroupableSortedCollection(
            DataType.NameValuePairs, [], "name");

        let rowComponent: Ref<string> = ref(app.activePasswordValuesTable == DataType.Passwords ? 'PasswordRow' : 'NameValuePairRow');
        let collapsibleTableRowModels: Ref<InfiniteScrollCollection<CollapsibleTableRowModel>> = ref(new InfiniteScrollCollection<CollapsibleTableRowModel>());

        let showEditPasswordPopup: Ref<boolean> = ref(false);
        let currentEditingPasswordModel: Ref<ReactivePassword | any> = ref({});

        let showEditValuePopup: Ref<boolean> = ref(false);
        let currentEditingValueModel: Ref<ReactiveValue | any> = ref({});

        let deletePassword: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
        let deleteValue: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

        const passwordSearchText: Ref<string> = ref('');
        const valueSearchText: Ref<string> = ref('');
        const currentSearchText: ComputedRef<Ref<string>> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            passwordSearchText : valueSearchText);

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
                color: computed(() => app.userPreferences.currentColorPalette.passwordsColor.primaryColor),
                onClick: () => { app.activePasswordValuesTable = DataType.Passwords; }
            },
            {
                name: 'Values',
                active: computed(() => app.activePasswordValuesTable == DataType.NameValuePairs),
                color: computed(() => app.userPreferences.currentColorPalette.valuesColor.primaryColor),
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
        })

        function filter<T extends IFilterable & IIdentifiable & IGroupable & { [key: string]: string }>(newValue: Filter[], oldValue: Filter[],
            localVariable: IGroupableSortedCollection<T>, originalVariable: T[])
        {
            // no active filters
            if (newValue.length == 0)
            {
                localVariable.updateValues(originalVariable);
            }
            // adding first filter
            else if (oldValue.length == 0)
            {
                let temp: T[] = [];
                newValue.forEach(f =>
                {
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.filters.includes(f.id)));
                });

                localVariable.updateValues(temp);
            }
            // Activated filter
            else if (newValue.length > oldValue.length)
            {
                let temp: T[] = [...localVariable.values];

                if (app.settings.multipleFilterBehavior == FilterStatus.Or)
                {
                    const filtersActivated: Filter[] = newValue.filter(f => !oldValue.includes(f));
                    filtersActivated.forEach(f =>
                    {
                        temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.filters.includes(f.id)));
                    });
                }
                else if (app.settings.multipleFilterBehavior == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.filters.includes(f.id))));
                }

                localVariable.updateValues(temp);
            }
            // removed filter
            else if (newValue.length < oldValue.length)
            {
                let temp: T[] = [...localVariable.values];

                if (app.settings.multipleFilterBehavior == FilterStatus.Or)
                {
                    const filtersRemoved: Filter[] = oldValue.filter(f => !newValue.includes(f));

                    filtersRemoved.forEach(f =>
                    {
                        temp = temp.filter(v =>
                        {
                            // keep values that the removed filter doesn't apply to
                            if (!v.filters.includes(f.id))
                            {
                                return true;
                            }

                            // remove value if it doesn't have a current active filter
                            return newValue.filter(nv => v.filters.includes(nv.id)).length > 0;
                        })
                    });
                }
                else if (app.settings.multipleFilterBehavior == FilterStatus.And)
                {
                    temp = [];
                    temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.filters.includes(f.id))));
                }

                localVariable.updateValues(temp);
            }
        }

        async function setModels()
        {
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    // eslint-disable-next-line
                    await createCollapsibleTableRowModels<ReactiveValue>(DataType.NameValuePairs,
                        collapsibleTableRowModels, nameValuePairs, pinnedNameValuePairs,
                        (v: ReactiveValue) =>
                        {
                            return [
                                {
                                    component: 'TableRowTextValue', value: v.name, copiable: false, width: 'clamp(110px, 7vw, 150px)'
                                },
                                {
                                    component: 'TableRowTextValue', value: v.valueType ?? '', copiable: false, width: 'clamp(100px, 9vw, 300px)'
                                }]
                        }, onEditValue, onValueDeleteInitiated);
                    break;
                case DataType.Passwords:
                default:
                    // eslint-disable-next-line
                    await createCollapsibleTableRowModels<ReactivePassword>(DataType.Passwords,
                        collapsibleTableRowModels, passwords, pinnedPasswords,
                        (p: ReactivePassword) =>
                        {
                            return [
                                {
                                    component: 'TableRowTextValue', value: p.passwordFor, copiable: false, width: 'clamp(110px, 7vw, 150px)',
                                },
                                {
                                    component: 'TableRowTextValue', value: p.login, copiable: true, width: 'clamp(100px, 9vw, 300px)'
                                }]
                        },
                        onEditPassword, onPasswordDeleteInitiated);
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
            filter(app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.unpinnedPasswords);
            pinnedPasswords.updateValues(app.currentVault.passwordStore.pinnedPasswords);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function initValues()
        {
            filter(app.currentVault.filterStore.activeNameValuePairFilters, [], nameValuePairs, app.currentVault.valueStore.unpinnedValues);
            pinnedNameValuePairs.updateValues(app.currentVault.valueStore.pinnedValues);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function init()
        {
            filter(app.currentVault.filterStore.activePasswordFilters, [], passwords, app.currentVault.passwordStore.unpinnedPasswords);
            filter(app.currentVault.filterStore.activeNameValuePairFilters, [], nameValuePairs, app.currentVault.valueStore.unpinnedValues);

            pinnedPasswords.updateValues(app.currentVault.passwordStore.pinnedPasswords);
            pinnedNameValuePairs.updateValues(app.currentVault.valueStore.pinnedValues);

            setModels();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
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
            filter(newValue, oldValue, passwords, app.currentVault.passwordStore.unpinnedPasswords);
            setModels();
        });

        watch(() => app.currentVault.filterStore.activeNameValuePairFilters, (newValue, oldValue) =>
        {
            filter(newValue, oldValue, nameValuePairs, app.currentVault.valueStore.unpinnedValues);
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

        watch(() => app.settings.multipleFilterBehavior, () =>
        {
            init();
        });

        return {
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
            onEditPasswordPopupClose,
            onEditValuePopupClose,
            onDeletePasswordConfirmed,
            onDeleteValueConfirmed
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
