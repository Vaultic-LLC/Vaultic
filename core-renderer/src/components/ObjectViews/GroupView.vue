<template>
    <ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField :label="'Name'" :color="groupColor" v-model="groupState.n"
            :width="'50%'" :maxWidth="''" />
        <ColorPickerInputField :label="'Color'" :color="groupColor" v-model="groupState.c"
            :width="'50%'" :minHeight="''" :minWidth="'125px'" :maxWidth="''" />
        <ObjectSingleSelect :label="'Icon'" :color="groupColor" v-model="selectedIcon"
            :options="allIcons" :width="'50%'" :minWidth="'125px'" :maxWidth="''" @update:model-value="onIconSelected" />
        <ObjectMultiSelect :label="selectLabel" :color="groupColor" v-model="selectedDataObjectOptions" :options="allDataObjectsOptions" 
            :width="'50%'" :maxWidth="''" />
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import ObjectSingleSelect from '../InputFields/ObjectSingleSelect.vue';

import { GridDefinition, ObjectSelectOptionModel } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { DataType, defaultGroup, Group } from '../../Types/DataTypes';
import icons from '../../Constants/Icons';
import { DictionaryAsList } from '@vaultic/shared/Types/Stores';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

export default defineComponent({
    name: "GroupView",
    components:
    {
        ObjectView,
        TextInputField,
        ColorPickerInputField,
        ObjectMultiSelect,
        ObjectSingleSelect
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
        const refreshKey: Ref<string> = ref("");
        const groupState: Ref<Group> = ref(props.model);
        const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.g);

        const selectLabel: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values");
        const selectedDataObjectOptions: Ref<ObjectSelectOptionModel[]> = ref([]);
        const allDataObjectsOptions: Ref<ObjectSelectOptionModel[]> = ref([]);

        const selectedIcon: Ref<ObjectSelectOptionModel | undefined> = ref();
        const allIcons: Ref<ObjectSelectOptionModel[]> = ref(icons);

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

            if (props.creating)
            {
                // only want to set these directly on the object when we are creating
                // since we want to just track the entire object as an Add
                if (app.activePasswordValuesTable == DataType.Passwords)
                {
                    groupState.value.p = {};
                    selectedDataObjectOptions.value.forEach(g => 
                    {
                        groupState.value.p[g.backingObject!.id] = true;
                    });
                }
                else 
                {
                    groupState.value.v = {}
                    selectedDataObjectOptions.value.forEach(g => 
                    {
                        groupState.value.v[g.backingObject!.id] = true;
                    });
                }

                if (await app.currentVault.groupStore.addGroup(key, groupState.value, pendingGroupStoreState))
                {
                    groupState.value = defaultGroup(groupState.value.t);
                    refreshKey.value = Date.now().toString();
                    selectedDataObjectOptions.value = [];

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                // need to track each individual added / removed group as an update
                const primaryDataObjects: DictionaryAsList = {};
                if (app.activePasswordValuesTable == DataType.Passwords)
                {
                    selectedDataObjectOptions.value.forEach(g =>
                    {
                        primaryDataObjects[g.backingObject!.id] = true;
                    });
                }
                else 
                {
                    selectedDataObjectOptions.value.forEach(g => 
                    {
                        primaryDataObjects[g.backingObject!.id] = true;
                    });
                }

                if (await app.currentVault.groupStore.updateGroup(key, groupState.value, primaryDataObjects,
                    pendingGroupStoreState))
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

        function onIconSelected(model: ObjectSelectOptionModel)
        {
            groupState.value.i = model?.icon ?? "";
        }

        onMounted(() =>
        {
            const foundIcon = icons.filter(i => i.icon == groupState.value.i);
            if (foundIcon.length == 1)
            {
                selectedIcon.value = foundIcon[0];
            }

            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                if (!props.creating)
                {
                    groupState.value = pendingGroupStoreState.proxifyObject('passwordDataTypesByID.dataType', groupState.value, groupState.value.id);
                }

                allDataObjectsOptions.value = app.currentVault.passwordStore.passwords.map(p => 
                {
                    const option: ObjectSelectOptionModel = 
                    {
                        label: p.f,
                        backingObject: p,
                    };

                    return option
                });

                OH.forEachKey(groupState.value.p, k => 
                {
                    const password = app.currentVault.passwordStore.passwordsByID[k];
                    if (!password)
                    {
                        return;
                    }

                    selectedDataObjectOptions.value.push({
                        label: password.f,
                        backingObject: password,
                    });
                });
            }
            else 
            {
                if (!props.creating)
                {
                    groupState.value = pendingGroupStoreState.proxifyObject('valueDataTypesByID.dataType', groupState.value, groupState.value.id);
                }

                allDataObjectsOptions.value = app.currentVault.valueStore.nameValuePairs.map(v => 
                {
                    const option: ObjectSelectOptionModel = 
                    {
                        label: v.n,
                        backingObject: v,
                    };

                    return option
                });

                OH.forEachKey(groupState.value.v, k => 
                {
                    const value = app.currentVault.valueStore.nameValuePairsByID[k];
                    if (!value)
                    {
                        return;
                    }

                    selectedDataObjectOptions.value.push({
                        label: value.n,
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
            allDataObjectsOptions,
            selectedDataObjectOptions,
            selectLabel,
            selectedIcon,
            allIcons,
            onSave,
            onIconSelected
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
</style>
