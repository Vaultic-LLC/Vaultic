<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="valueView__name" :color="color" :label="'Name'" v-model="valuesState.name.value" :width="'8vw'"
            :height="'4vh'" :minHeight="'35px'" />
        <div class="valueView__valueTypeContainer">
            <EnumInputField class="valueView__valueType" :label="'Type'" :color="color" v-model="valuesState.valueType.value"
                :optionsEnum="NameValuePairType" :fadeIn="true" :width="'8vw'" :height="'4vh'" :minHeight="'35px'"
                :minWidth="'130px'" :maxHeight="'50px'" :showRandom="showRandom" />
            <Transition name="fade">
                <div class="addValue__notifyIfWeakContainer" v-if="showNotifyIfWeak">
                    <CheckboxInputField class="valueView__notifyIfWeak" :label="'Notify if Weak'" :color="color"
                        v-model="valuesState.notifyIfWeak.value" :fadeIn="false" :width="''" :height="'0.7vw'"
                        :minHeight="'12px'" />
                    <ToolTip :color="color" :size="'clamp(15px, 0.8vw, 20px)'" :fadeIn="false"
                        :message="'Some Passcodes, like Garage Codes or certain Phone Codes, are only 4-6 characters long and do not fit the requirements for &quot;Weak&quot;. Tracking of these Passcodes can be turned off so they do not appear in the &quot;Weak Passcodes&quot; Metric.'" />
                </div>
            </Transition>
        </div>
        <EncryptedInputField ref="valueInputField" class="valueView__value" :colorModel="colorModel" :label="'Value'"
            v-model="valuesState.value.value" :initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted"
            :showUnlock="true" :showCopy="true" :showRandom="showRandom" :randomValueType="randomValueType"
            :required="true" :width="'11vw'" :maxWidth="'300px'" :minWidth="'150px'" :height="'4vh'" :minHeight="'35px'"
            @onDirty="valueIsDirty = true" />
        <TextAreaInputField class="valueView__additionalInfo" :colorModel="colorModel" :label="'Additional Information'"
            v-model="valuesState.additionalInformation.value" :width="'19vw'" :height="'18vh'" :maxHeight="'238px'"
            :minWidth="'216px'" :minHeight="'100px'" />
        <VaulticTable ref="tableRef" id="valueView__addGroupsTable" :color="color" :columns="tableColumns" 
            :headerTabs="groupTab" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false" :searchBarSizeModel="searchBarSizeModel" />
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref, onMounted, watch, Reactive, reactive } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import ToolTip from '../ToolTip.vue';
import VaulticTable from '../Table/VaulticTable.vue';

import { ComponentSizeModel, GridDefinition, HeaderTabModel, InputColorModel, SelectableBackingObject, TableColumnModel, TableDataSources, TableRowModel, defaultInputColorModel } from '../../Types/Models';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import { getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import app from "../../Objects/Stores/AppStore";
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { defaultValue, NameValuePair, NameValuePairType } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

interface SelectableGroup extends SelectableBackingObject
{
    name: Field<string>;
    color: Field<string>;
}

export default defineComponent({
    name: "ValueView",
    components: {
        ObjectView,
        TextInputField,
        EncryptedInputField,
        TextAreaInputField,
        EnumInputField,
        CheckboxInputField,
        ToolTip,
        VaulticTable
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const valueInputField: Ref<EncryptedInputFieldComponent | null> = ref(null);
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const mounted: Ref<boolean> = ref(false);
        const refreshKey: Ref<string> = ref("");
        const valuesState: Ref<NameValuePair> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        const groups: SortedCollection = new SortedCollection([], "name");
        const initalLength: Ref<number> = ref(valuesState.value.valueLength?.value ?? 0);
        const isInitiallyEncrypted: ComputedRef<boolean> = computed(() => !props.creating);
        const valueIsDirty: Ref<boolean> = ref(false);

        const showNotifyIfWeak: Ref<boolean> = ref(valuesState.value.valueType?.value == NameValuePairType.Passcode);
        const showRandom: ComputedRef<boolean> = computed(() => valuesState.value.valueType?.value == NameValuePairType.Passphrase ||
            valuesState.value.valueType?.value == NameValuePairType.Passcode || valuesState.value.valueType?.value == NameValuePairType.Other);
        const randomValueType: ComputedRef<number> = computed(() => valuesState.value.valueType?.value == NameValuePairType.Passphrase ? 0 : 1);

        const gridDefinition: GridDefinition = 
        {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        };

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const emptyMessage: Ref<string> = ref(getObjectPopupEmptyTableMessage('Groups', "Value", "Group", props.creating));

        const groupTab: HeaderTabModel[] = 
        [
            {
                name: 'Groups',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = [];
            models.push({ header: "", field: "isActive", component: 'SelectorButtonTableRowValue', data: { 'color': color, onClick: onGroupSelected } });
            models.push({ header: "Name", field: "name" });
            models.push({ header: "Color", field: "color", component: "ColorTableRowValue" });

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 0,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Group",
                    collection: groups,
                }
            ]
        });

        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '8vw',
            maxWidth: '250px',
            minWidth: '100px',
            minHeight: '27px'
        });

        function onGroupSelected(value: Field<SelectableGroup>)
        {     
            if (value.value.isActive.value)
            {
                valuesState.value.groups.value.delete(value.value.id.value);
                value.value.isActive.value = false;
            }
            else
            {
                valuesState.value.groups.value.set(value.value.id.value, new Field(value.value.id.value));
                value.value.isActive.value = true;
            }
        }

        function setGroupModels()
        {
            const rows = app.currentVault.groupStore.valuesGroups.map(g =>
            {
                const selectableGroup: SelectableGroup = 
                {
                    isActive: new Field(valuesState.value.groups.value.has(g.value.id.value)),
                    id: g.value.id,
                    name: g.value.name,
                    color: g.value.color
                };

                const row: TableRowModel = 
                {
                    id: g.value.id.value,
                    backingObject: new Field(selectableGroup),
                };

                return row;
            });

            groups.updateValues(rows);
        }

        function onSave()
        {
            valueInputField.value?.toggleMask(true);
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

        watch(() => valuesState.value.valueType.value, (newValue) =>
        {
            showNotifyIfWeak.value = newValue == NameValuePairType.Passcode;
        });

        return {
            valueInputField,
            initalLength,
            isInitiallyEncrypted,
            valueIsDirty,
            color,
            valuesState,
            refreshKey,
            gridDefinition,
            NameValuePairType,
            showNotifyIfWeak,
            groupTab,
            emptyMessage,
            mounted,
            colorModel,
            tableRef,
            showRandom,
            randomValueType,
            tableColumns,
            tableDataSources,
            searchBarSizeModel,
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
