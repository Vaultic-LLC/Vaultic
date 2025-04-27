<template>
    <ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition" :hideButtons="readOnly">
        <TextInputField :label="'Name'" :color="groupColor" v-model="groupState.n"
            :width="'50%'" :maxWidth="''" />
        <ColorPickerInputField :label="'Color'" :color="groupColor" v-model="groupState.c"
            :width="'50%'" :minWidth="'125px'" :maxWidth="''" />
        <ObjectSingleSelect :label="'Icon'" :color="groupColor" v-model="selectedIcon"
            :options="allIcons" :width="'50%'" :minWidth="'125px'" :maxWidth="''" @update:model-value="onIconSelected" />
        <ObjectMultiSelect :label="selectLabel" :color="groupColor" v-model="selectedDataObjectOptions" :options="allDataObjectsOptions" 
            :width="'50%'" :maxWidth="''" />
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, reactive, ref } from 'vue';

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
    props: ['creating', 'model', 'currentPrimaryDataType'],
    setup(props)
    {
        let pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
        const refreshKey: Ref<string> = ref("");
        const groupState: Reactive<Group> = props.creating ? reactive(props.model) : getCustomRef(props.model);
        const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.g);

        const selectLabel: ComputedRef<string> = computed(() => props.currentPrimaryDataType == DataType.Passwords ? "Passwords" : "Values");
        const selectedDataObjectOptions: Ref<ObjectSelectOptionModel[]> = ref(getInitalSelectedItems());
        const allDataObjectsOptions: Ref<ObjectSelectOptionModel[]> = ref([]);

        const selectedIcon: Ref<ObjectSelectOptionModel | undefined> = ref();
        const allIcons: Ref<ObjectSelectOptionModel[]> = ref(icons);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const readOnly: Ref<boolean> = ref(app.currentVault.isReadOnly.value);

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
                if (props.currentPrimaryDataType == DataType.Passwords)
                {
                    groupState.p = {};
                    selectedDataObjectOptions.value.forEach(g => 
                    {
                        groupState.p[g.backingObject!.id] = true;
                    });
                }
                else 
                {
                    groupState.v = {}
                    selectedDataObjectOptions.value.forEach(g => 
                    {
                        groupState.v[g.backingObject!.id] = true;
                    });
                }

                if (await app.currentVault.groupStore.addGroup(key, groupState, pendingGroupStoreState))
                {
                    // This won't track changes within the pending store since we didn't re create the 
                    // custom ref but that's ok since we are creating
                    pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
                    Object.assign(groupState, defaultGroup(groupState.t));
                    selectedDataObjectOptions.value = [];
                    selectedIcon.value = undefined;
                    refreshKey.value = Date.now().toString();

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                // need to track each individual added / removed group as an update
                const primaryDataObjects: DictionaryAsList = {};
                if (props.currentPrimaryDataType == DataType.Passwords)
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

                if (await app.currentVault.groupStore.updateGroup(key, groupState, primaryDataObjects,
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
            groupState.i = model?.icon ?? "";
        }

        function getCustomRef(group: Group)
        {
            if (group.t == DataType.Passwords)
            {
                return pendingGroupStoreState.createCustomRef('passwordDataTypesByID.dataType', group, group.id)
            }
            else
            {
                return pendingGroupStoreState.createCustomRef('valueDataTypesByID.dataType', group, group.id)
            }
        }

        function getInitalSelectedItems()
        {
            const selected: ObjectSelectOptionModel[] = [];
            if (props.currentPrimaryDataType == DataType.Passwords)
            {
                OH.forEachKey(groupState.p, k => 
                {
                    const password = app.currentVault.passwordStore.passwordsByID[k];
                    if (!password)
                    {
                        return;
                    }

                    const label: string = password.f;
                    selected.push({
                        id: password.id,
                        label: label,
                        backingObject: password
                    });
                });
            }
            else 
            {
                OH.forEachKey(groupState.v, k => 
                {
                    const value = app.currentVault.valueStore.nameValuePairsByID[k];
                    if (!value)
                    {
                        return;
                    }

                    selected.push({
                        id: value.id,
                        label: value.n,
                        backingObject: value,
                    });
                });
            } 

            return selected;
        }

        onMounted(() =>
        {
            const foundIcon = icons.filter(i => i.icon == groupState.i);
            if (foundIcon.length == 1)
            {
                selectedIcon.value = foundIcon[0];
            }

            if (props.currentPrimaryDataType == DataType.Passwords)
            {
                allDataObjectsOptions.value = app.currentVault.passwordStore.passwords.map(p => 
                {
                    const label: string = p.f;
                    const option: ObjectSelectOptionModel = 
                    {
                        id: p.id,
                        label: label,
                        backingObject: p
                    };

                    return option
                });
            }
            else 
            {
                allDataObjectsOptions.value = app.currentVault.valueStore.nameValuePairs.map(v => 
                {
                    const option: ObjectSelectOptionModel = 
                    {
                        id: v.id,
                        label: v.n,
                        backingObject: v,
                    };

                    return option
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
            readOnly,
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
