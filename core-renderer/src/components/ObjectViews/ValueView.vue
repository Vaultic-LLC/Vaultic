<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <VaulticFieldset :centered="true">
            <TextInputField class="valueView__name" :color="color" :label="'Name'" v-model="valuesState.name.value" :width="'50%'"
                :maxWidth="''" />
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <div class="valueView__valueTypeContainer">
                <EnumInputField class="valueView__valueType" :label="'Type'" :color="color" v-model="valuesState.valueType.value"
                    :optionsEnum="NameValuePairType" :fadeIn="true" :width="'100%'"
                    :minWidth="'130px'" :showRandom="showRandom" :maxWidth="''" />
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
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <EncryptedInputField ref="valueInputField" class="valueView__value" :colorModel="colorModel" :label="'Value'"
                v-model="valuesState.value.value" :initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted"
                :showUnlock="true" :showCopy="true" :showRandom="showRandom" :randomValueType="randomValueType"
                :required="true" :width="'50%'" :maxWidth="''" :minWidth="'150px'" @onDirty="valueIsDirty = true"  />
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <ObjectMultiSelect :label="'Groups'" :color="color" v-model="selectedGroups" :options="groupOptions" :width="'50%'" :maxWidth="''" />
        </VaulticFieldset>
        <VaulticFieldset :centered="true" :fillSpace="true" :static="true">
            <TextAreaInputField class="valueView__additionalInfo" :colorModel="colorModel" :label="'Additional Information'"
                v-model="valuesState.additionalInformation.value" :width="'50%'" :height="''" :maxHeight="''"
                :minWidth="'216px'" :minHeight="''" :maxWidth="''" />
        </VaulticFieldset>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref, onMounted, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import ToolTip from '../ToolTip.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';

import { GridDefinition, InputColorModel, ObjectSelectOptionModel, defaultInputColorModel } from '../../Types/Models';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import app from "../../Objects/Stores/AppStore";
import { EncryptedInputFieldComponent } from '../../Types/Components';
import { defaultValue, NameValuePair, NameValuePairType } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

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
        ObjectMultiSelect,
        VaulticFieldset
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const valueInputField: Ref<EncryptedInputFieldComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const valuesState: Ref<NameValuePair> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        const selectedGroups: Ref<ObjectSelectOptionModel[]> = ref([]);
        const groupOptions: Ref<ObjectSelectOptionModel[]> = ref([]);
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

        function onSave()
        {
            valuesState.value.groups.value = new Map();
            selectedGroups.value.forEach(g => 
            {
                valuesState.value.groups.value.set(g.backingObject!.value.id.value, new Field(g.backingObject!.value.id.value));
            });

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
                    selectedGroups.value = [];
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
            groupOptions.value = app.currentVault.groupStore.valuesGroups.map(g => 
            {
                const option: ObjectSelectOptionModel = 
                {
                    label: g.value.name.value,
                    backingObject: g,
                    icon: g.value.icon.value,
                    color: g.value.color.value
                };

                return option
            });

            valuesState.value.groups.value.forEach((v, k) => 
            {
                const group = app.currentVault.groupStore.valueGroupsByID.value.get(k);
                if (!group)
                {
                    return;
                }

                selectedGroups.value.push({
                    label: group.value.name.value,
                    backingObject: group,
                    icon: group.value.icon.value,
                    color: group.value.color.value
                });
            });
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
            colorModel,
            showRandom,
            randomValueType,
            groupOptions,
            selectedGroups,
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
    margin-left: 5px;
}

@media (max-width: 2200px) {
    #valueView__addGroupsTable {
        grid-row: 3 / span 8 !important;
        transform: translateY(0);
    }
}

@media (min-width: 2400px) {
    #valueView__addGroupsTable {
        transform: translateY(calc(clamp(10px, 2.1vw, 50px) * 0.2));
    }
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

.valueView__valueType {
    z-index: 9;
}

.valueView__notifyIfWeak {
    z-index: 8;
}

.valueView__valueTypeContainer {
    width: 50%;
    display: flex;
    justify-content: center;
    align-items: start;
    flex-direction: column;
    row-gap: clamp(3px, 0.5vw, 10px);
}
</style>
