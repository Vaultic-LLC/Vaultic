<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="valueView__name" :color="color" :label="'Name'" v-model="valuesState.name" :width="'8vw'"
            :height="'4vh'" :minHeight="'35px'" />
        <div class="valueView__valueTypeContainer">
            <EnumInputField class="valueView__valueType" :label="'Type'" :color="color" v-model="valuesState.valueType"
                :optionsEnum="NameValuePairType" :fadeIn="true" :width="'8vw'" :height="'4vh'" :minHeight="'35px'"
                :minWidth="'130px'" :maxHeight="'50px'" :showRandom="showRandom" />
            <Transition name="fade">
                <div class="addValue__notifyIfWeakContainer" v-if="showNotifyIfWeak">
                    <CheckboxInputField class="valueView__notifyIfWeak" :label="'Notify if Weak'" :color="color"
                        v-model="valuesState.notifyIfWeak" :fadeIn="false" :width="''" :height="'0.7vw'"
                        :minHeight="'12px'" />
                    <ToolTip :color="color" :size="'clamp(15px, 0.8vw, 20px)'" :fadeIn="false"
                        :message="'Some Passcodes, like Garage Codes or certain Phone Codes, are only 4-6 characters long and do not fit the requirements for &quot;Weak&quot;. Tracking of these Passcodes can be turned off so they do not appear in the &quot;Weak Passcodes&quot; Metric.'" />
                </div>
            </Transition>
        </div>
        <EncryptedInputField ref="valueInputField" class="valueView__value" :colorModel="colorModel" :label="'Value'"
            v-model="valuesState.value" :initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted"
            :showUnlock="true" :showCopy="true" :showRandom="showRandom" :randomValueType="randomValueType"
            :required="true" :width="'11vw'" :maxWidth="'300px'" :minWidth="'150px'" :height="'4vh'" :minHeight="'35px'"
            @onDirty="valueIsDirty = true" />
        <TextAreaInputField class="valueView__additionalInfo" :colorModel="colorModel" :label="'Additional Information'"
            v-model="valuesState.additionalInformation" :width="'19vw'" :height="'18vh'" :maxHeight="'238px'"
            :minWidth="'216px'" :minHeight="'100px'" :isEditing="!creating" />
        <TableTemplate ref="tableRef" id="valueView__addGroupsTable" class="scrollbar" :scrollbar-size="1"
            :color="color" :headerModels="groupHeaderModels" :border="true" :emptyMessage="emptyMessage"
            :showEmptyMessage="mounted && groupModels.visualValues.length == 0" :headerTabs="groupTab"
            @scrolledToBottom="groupModels.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="searchText" :color="color" :width="'8vw'" :maxWidth="'250px'" :minWidth="'100px'"
                    :minHeight="'27px'" />
            </template>
            <template #body>
                <SelectableTableRow v-for="(trd, index) in groupModels.visualValues" class="hover" :key="trd.id"
                    :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false" :color="color" />
            </template>
        </TableTemplate>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref, onMounted, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import SelectableTableRow from '../Table/Rows/SelectableTableRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import ToolTip from '../ToolTip.vue';

import { GridDefinition, HeaderTabModel, InputColorModel, SelectableTableRowData, SortableHeaderModel, defaultInputColorModel } from '../../Types/Models';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import { createSortableHeaderModels, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { api } from "../../API"
import { defaultValue, NameValuePair, NameValuePairType } from '../../Types/DataTypes';
import { HeaderDisplayField } from '../../Types/Fields';

export default defineComponent({
    name: "ValueView",
    components: {
        ObjectView,
        TextInputField,
        EncryptedInputField,
        TextAreaInputField,
        EnumInputField,
        CheckboxInputField,
        SearchBar,
        ToolTip,
        TableTemplate,
        SelectableTableRow
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const valueInputField: Ref<EncryptedInputFieldComponent | null> = ref(null);
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const mounted: Ref<boolean> = ref(false);
        const refreshKey: Ref<string> = ref("");
        const valuesState: Ref<NameValuePair> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.valuesColor.primaryColor);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        // @ts-ignore
        const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(app.currentVault.groupStore.valuesGroups, "name"));
        // @ts-ignore
        const groupModels: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
        const initalLength: Ref<number> = ref(valuesState.value.valueLength ?? 0);
        const isInitiallyEncrypted: ComputedRef<boolean> = computed(() => !props.creating);
        const valueIsDirty: Ref<boolean> = ref(false);

        const showNotifyIfWeak: Ref<boolean> = ref(valuesState.value.valueType == NameValuePairType.Passcode);
        const showRandom: ComputedRef<boolean> = computed(() => valuesState.value.valueType == NameValuePairType.Passphrase ||
            valuesState.value.valueType == NameValuePairType.Passcode || valuesState.value.valueType == NameValuePairType.Other);
        const randomValueType: ComputedRef<number> = computed(() => valuesState.value.valueType == NameValuePairType.Passphrase ? 0 : 1);

        const gridDefinition: GridDefinition = {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        }

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

        const emptyMessage: Ref<string> = ref(getObjectPopupEmptyTableMessage('Groups', "Value", "Group", props.creating));

        const activeGroupHeader: Ref<number> = ref(1);
        const groupHeaderDisplayFields: HeaderDisplayField[] = [
            {
                backingProperty: "",
                displayName: " ",
                width: 'clamp(25px, 4vw, 100px)',
                clickable: false
            },
            {
                backingProperty: "name",
                displayName: "Name",
                width: 'clamp(80px, 6vw, 150px)',
                clickable: true
            },
            {
                displayName: "Color",
                backingProperty: "color",
                width: 'clamp(50px, 4vw, 100px)',
                clickable: true
            }
        ];

        const groupTab: HeaderTabModel[] = [
            {
                name: 'Groups',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        // @ts-ignore
        const groupHeaderModels: SortableHeaderModel[] = createSortableHeaderModels<Group>(
            activeGroupHeader, groupHeaderDisplayFields, groups.value, undefined, setGroupModels);

        function setGroupModels()
        {
            const pendingRows = groups.value.calculatedValues.map(async g =>
            {
                const values: any[] =
                    [
                        {
                            component: "TableRowTextValue",
                            value: g.name,
                            copiable: false,
                            width: 'clamp(80px, 6vw, 150px)'
                        },
                        {
                            component: "TableRowColorValue",
                            color: g.color,
                            copiable: true,
                            width: 'clamp(50px, 4vw, 100px)',
                            margin: false
                        }
                    ];

                const id = await api.utilities.generator.uniqueId();
                const model: SelectableTableRowData =
                {
                    id: id,
                    key: g.id,
                    values: values,
                    isActive: ref(valuesState.value.groups.includes(g.id)),
                    selectable: true,
                    onClick: function ()
                    {
                        if (valuesState.value.groups.includes(g.id))
                        {
                            valuesState.value.groups = valuesState.value.groups.filter(id => id != g.id);
                        }
                        else
                        {
                            valuesState.value.groups.push(g.id);
                        }
                    }
                }
                return model;
            });

            Promise.all(pendingRows).then((rows) =>
            {
                groupModels.value.setValues(rows);
                if (tableRef.value)
                {
                    // @ts-ignore
                    tableRef.value.scrollToTop();
                    setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
                }
            });
        }

        function onSave()
        {
            valueInputField.value?.toggleHidden(true);
            app.popups.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);

            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function onAuthenticationSuccessful(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Value");
            if (props.creating)
            {
                if (await app.currentVault.valueStore.addNameValuePair(key, valuesState.value))
                {
                    valuesState.value = defaultValue();
                    refreshKey.value = Date.now().toString();

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.valueStore.updateNameValuePair(key, valuesState.value, valueIsDirty.value))
                {
                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }

            app.popups.hideLoadingIndicator();
            saveSucceeded(true);
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

        function onAuthenticationCanceled()
        {
            saveFailed(false);
        }

        onMounted(() =>
        {
            setGroupModels();
            mounted.value = true;
        });

        watch(() => valuesState.value.valueType, (newValue) =>
        {
            showNotifyIfWeak.value = newValue == NameValuePairType.Passcode;
        });

        watch(() => searchText.value.value, (newValue) =>
        {
            groups.value.search(newValue);
            setGroupModels();
        });

        return {
            valueInputField,
            initalLength,
            isInitiallyEncrypted,
            valueIsDirty,
            groupHeaderModels,
            groupModels,
            color,
            valuesState,
            refreshKey,
            gridDefinition,
            NameValuePairType,
            showNotifyIfWeak,
            searchText,
            groupTab,
            emptyMessage,
            mounted,
            colorModel,
            tableRef,
            showRandom,
            randomValueType,
            onSave,
            onAuthenticationSuccessful
        };
    },
})
</script>

<style>
.addValue__notifyIfWeakContainer {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    column-gap: clamp(5px, 0.4vw, 10px);
    position: absolute;
    width: 8vw;
    min-width: 130px;
    margin-left: 5px;
    margin-top: 5px;
}

@media (max-width: 2200px) {
    #valueView__addGroupsTable {
        grid-row: 3 / span 8 !important;
        transform: translateY(0);
    }

    /* .valueView__additionalInfo {
		grid-row: 6 / span 4 !important;
	} */
}

@media (min-width: 2400px) {
    #valueView__addGroupsTable {
        transform: translateY(calc(clamp(10px, 2.1vw, 50px) * 0.2));
    }
}

.valueView__additionalInfo {
    position: absolute !important;
    left: 10% !important;
    bottom: 10% !important;
}

#valueView__addGroupsTable {
    left: 50%;
    bottom: 10%;
    transform: translateY(12px);
    height: 29vh;
    width: 27vw;
    min-height: 174px;
    min-width: 308px;
}

.valueView__name {
    position: absolute !important;
    left: 10%;
}

.valueView__valueTypeContainer {
    position: absolute !important;
    left: 31%;
}

.valueView__valueType {
    z-index: 9;
}

.valueView__notifyIfWeak {
    z-index: 8;
}

.valueView__value {
    position: absolute !important;
    left: 10%;
    top: max(75px, 15%);
}
</style>
