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

            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                groupState.value.p = new Map();
                selectedDataObjectOptions.value.forEach(g => 
                {
                    groupState.value.p.set(g.backingObject!.id, g.backingObject!.id);
                });
            }
            else 
            {
                groupState.value.v = new Map();
                selectedDataObjectOptions.value.forEach(g => 
                {
                    groupState.value.v.set(g.backingObject!.id, g.backingObject!.id);
                });
            }

            if (props.creating)
            {
                if (await app.currentVault.groupStore.addGroup(key, groupState.value))
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
                allDataObjectsOptions.value = app.currentVault.passwordStore.passwords.map(p => 
                {
                    const option: ObjectSelectOptionModel = 
                    {
                        label: p.f,
                        backingObject: p,
                    };

                    return option
                });

                groupState.value.p.forEach((v, k, map) => 
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
                allDataObjectsOptions.value = app.currentVault.valueStore.nameValuePairs.map(v => 
                {
                    const option: ObjectSelectOptionModel = 
                    {
                        label: v.n,
                        backingObject: v,
                    };

                    return option
                });

                groupState.value.v.forEach((v, k, map) => 
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
