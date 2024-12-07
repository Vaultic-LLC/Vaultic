<template>
    <div class="groupIconsRowValue">
        <GroupIcon v-for="(model, idx) in groupIconModels" :key="idx" :model="model" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import GroupIcon from '../GroupIcon.vue';

import { DataType, Group, IGroupable } from '../../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';
import app from '../../../Objects/Stores/AppStore';
import { GroupIconModel } from '../../../Types/Models';

export default defineComponent({
	name: "GroupIconsRowCell",
	components:
	{
		GroupIcon
	},
	props: ["model", "data"],
	setup(props)
	{
        const primaryColor: ComputedRef<string> = computed(() => props.data["color"].value);
        const dataType: ComputedRef<Field<IGroupable>> = computed(() => props.model);

        let groupIconModels: ComputedRef<GroupIconModel[]> = computed(() =>
        {
            const models: GroupIconModel[] = [];
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                dataType.value.value.groups.value.forEach((v, k, map) => 
                {
                    const group = app.currentVault.groupStore.passwordGroupsByID.value.get(k);
                    if (!group)
                    {
                        return;
                    }

                    addToModels(models, group);
                });
            }
            else
            {
                dataType.value.value.groups.value.forEach((v, k, map) => 
                {
                    const group = app.currentVault.groupStore.valueGroupsByID.value.get(k);
                    if (!group)
                    {
                        return;
                    }

                    addToModels(models, group);
                });
            }


            return models;
        });

        function addToModels(currentModels: GroupIconModel[], group: Field<Group>)
        {
            if (currentModels.length < 4)
            {
                currentModels.push({
                    icon: group.value.icon.value,
                    toolTipText: group.value.name.value,
                    color: group.value.color.value
                });
            }
            else
            {
                currentModels[3].icon = `+${currentModels.length - 3}`;
                currentModels[3].toolTipText += `, ${group.value.name.value}`;
                currentModels[3].color = primaryColor.value
            }
        }

		return {
            groupIconModels
		};
	},
})
</script>
<style scoped>
.groupIconsRowValue {
    display: flex;
    height: inherit;
    justify-content: left;
    align-items: center;
    overflow: hidden;
    flex-wrap: wrap;
    width: auto;
}
</style>
