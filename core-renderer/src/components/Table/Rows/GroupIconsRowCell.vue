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
            const groupsToUse = app.activePasswordValuesTable == DataType.Passwords ? app.currentVault.groupStore.passwordGroups : app.currentVault.groupStore.valuesGroups;
            const allGroups: Field<Group>[] = groupsToUse.filter(g => dataType.value.value.groups.value.has(g.value.id.value));
            if (allGroups.length <= 4)
            {
                return allGroups.map((g) =>
                {
                    const groupIconModel: GroupIconModel =
                    {
                        icon: g.value.icon.value,
                        toolTipText: g.value.name.value,
                        color: g.value.color.value
                    }

                    return groupIconModel;
                });
            }

            let tempGroupModels: GroupIconModel[] = [...allGroups.filter((_, i) => i < 3)].map((g) =>
            {
                const groupIconModel: GroupIconModel =
                {
                    icon: g.value.icon.value,
                    toolTipText: g.value.name.value,
                    color: g.value.color.value
                }

                return groupIconModel;
            });

            let lastGroupModel: GroupIconModel =
            {
                icon: `+${allGroups.length - 3}`,
                toolTipText: '',
                color: primaryColor.value
            };

            for (let i = 3; i < allGroups.length; i++)
            {
                lastGroupModel.toolTipText += `${allGroups[i].value.name.value}`;
                if (i != allGroups.length - 1)
                {
                    lastGroupModel.toolTipText += ", ";
                }
            }

            tempGroupModels.push(lastGroupModel);
            return tempGroupModels;
        });

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
