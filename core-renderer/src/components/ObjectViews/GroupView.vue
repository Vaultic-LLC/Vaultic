<template>
    <ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="groupView__name" :label="'Name'" :color="groupColor" v-model="groupState.name.value"
            :width="'50%'" :height="''" :minHeight="''" :maxWidth="''" :maxHeight="''" />
        <ColorPickerInputField class="groupView__color" :label="'Color'" :color="groupColor" v-model="groupState.color.value"
            :width="'50%'" :height="''" :minHeight="''" :minWidth="'125px'" :maxWidth="''" />
        <TextInputField class="groupView__icon" :label="'Icon'" :color="groupColor" v-model="groupState.icon.value"
            :width="'50%'" :height="''" :minHeight="''" :minWidth="'125px'" :maxWidth="''" :maxHeight="''" />
        <div class="valueView__objectMultiSelect">
            <ObjectMultiSelect :label="selectLabel" :color="groupColor" v-model="selectedOptions" :options="allOptions" />
        </div>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';

import { GridDefinition, ObjectMultiSelectOptionModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { DataType, defaultGroup, Group } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

// TODO: need to create an IconSelector so that users don't have to type in the name of the icon
export default defineComponent({
    name: "GroupView",
    components:
    {
        ObjectView,
        TextInputField,
        ColorPickerInputField,
        ObjectMultiSelect,
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const groupState: Ref<Group> = ref(props.model);
        const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.groupsColor.value);

        const selectLabel: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values");
        const selectedOptions: Ref<ObjectMultiSelectOptionModel[]> = ref([]);
        const allOptions: Ref<ObjectMultiSelectOptionModel[]> = ref([]);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const gridDefinition: GridDefinition =
        {
            rows: 13,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 15,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        function onSave()
        {
            app.popups.showRequestAuthentication(groupColor.value, doSave, onAuthCanceld);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(groupColor.value, "Saving Group");

            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                groupState.value.passwords.value = new Map();
                selectedOptions.value.forEach(g => 
                {
                    groupState.value.passwords.value.set(g.backingObject.value.id.value, new Field(g.backingObject.value.id.value));
                });
            }
            else 
            {
                groupState.value.values.value = new Map();
                selectedOptions.value.forEach(g => 
                {
                    groupState.value.values.value.set(g.backingObject.value.id.value, new Field(g.backingObject.value.id.value));
                });
            }

            if (props.creating)
            {
                if (await app.currentVault.groupStore.addGroup(key, groupState.value))
                {
                    groupState.value = defaultGroup(groupState.value.type.value);
                    refreshKey.value = Date.now().toString();
                    selectedOptions.value = [];

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.groupStore.updateGroup(key, groupState.value))
                {
                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
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

        function onAuthCanceld()
        {
            saveFailed(false);
        }

        onMounted(() =>
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                allOptions.value = app.currentVault.passwordStore.passwords.map(p => 
                {
                    const option: ObjectMultiSelectOptionModel = 
                    {
                        label: p.value.passwordFor.value,
                        backingObject: p,
                    };

                    return option
                });

                groupState.value.passwords.value.forEach((v, k, map) => 
                {
                    const password = app.currentVault.passwordStore.passwordsByID.value.get(k);
                    if (!password)
                    {
                        return;
                    }

                    selectedOptions.value.push({
                        label: password.value.passwordFor.value,
                        backingObject: password,
                    });
                });
            }
            else 
            {
                allOptions.value = app.currentVault.valueStore.nameValuePairs.map(v => 
                {
                    const option: ObjectMultiSelectOptionModel = 
                    {
                        label: v.value.name.value,
                        backingObject: v,
                    };

                    return option
                });

                groupState.value.values.value.forEach((v, k, map) => 
                {
                    const value = app.currentVault.valueStore.nameValuePairsByID.value.get(k);
                    if (!value)
                    {
                        return;
                    }

                    selectedOptions.value.push({
                        label: value.value.name.value,
                        backingObject: value,
                    });
                });
            }
        });

        return {
            groupState,
            groupColor,
            refreshKey,
            gridDefinition,
            allOptions,
            selectedOptions,
            selectLabel,
            onSave
        };
    },
})
</script>

<style>
#addGroupTable {
    position: relative;
    grid-row: 7 / span 8;
    grid-column: 4 / span 9;
    min-width: 410px;
    min-height: 182px;
}

.valueView__objectMultiSelect {
    width: 50%;
}
</style>
