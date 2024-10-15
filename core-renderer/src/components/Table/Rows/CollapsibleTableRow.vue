<template>
    <TableRow class="hover" :class="{ shadow: shadow, isOpen: showCollapseRow || stayOpen }"
        @click="toggleCollapseContent" :model="model" :rowNumber="rowNumber" :color="primaryColor" :allowPin="true"
        :allowEdit="true" :allowDelete="true" :hideAtRisk="false" :clickable="true"
        :height="'clamp(40px, 3.7vw, 100px)'">
        <td class="tableRow__groupCell">
            <GroupIcon v-for="(model) in groupIconModels" :key="model.toolTipText" :model="model" />
        </td>
    </TableRow>
    <tr class="collapseRow">
        <slot :authenticationPromise="authPromise" :isShowing="showCollapseRow"></slot>
    </tr>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import GroupIcon from '../GroupIcon.vue';
import TableRow from "./TableRow.vue"

import { Group } from '../../../Types/Table';
import { GroupIconModel } from '../../../Types/Models';
import app from "../../../Objects/Stores/AppStore";

export default defineComponent({
    name: "CollapsibleTableRow",
    components:
    {
        GroupIcon,
        TableRow
    },
    props: ["groups", "model", "rowNumber", "color", "shadow"],
    setup(props)
    {
        let showCollapseRow: Ref<boolean> = ref(false);
        let stayOpen: Ref<boolean> = ref(false);

        let authPromise: Ref<Promise<string> | undefined> = ref(undefined);
        let reqAuth: Ref<boolean> = ref(false);

        let resolveFunc: (key: string) => void;
        let rejectFunc: () => void;

        const primaryColor: ComputedRef<string> = computed(() => props.color);

        let groupIconModels: ComputedRef<GroupIconModel[]> = computed(() =>
        {
            const allGroups: Group[] = app.currentVault.groupStore.groups.filter(g => props.groups.includes(g.id));
            if (allGroups.length <= 4)
            {
                return allGroups.map((g) =>
                {
                    const groupIconModel: GroupIconModel =
                    {
                        iconDisplayText: g.name[0],
                        toolTipText: g.name,
                        color: g.color
                    }

                    return groupIconModel;
                });
            }

            let tempGroupModels: GroupIconModel[] = [...allGroups.filter((_, i) => i < 3)].map((g) =>
            {
                const groupIconModel: GroupIconModel =
                {
                    iconDisplayText: g.name[0],
                    toolTipText: g.name,
                    color: g.color
                }

                return groupIconModel;
            });

            let lastGroupModel: GroupIconModel =
            {
                iconDisplayText: `+${allGroups.length - 3}`,
                toolTipText: '',
                color: primaryColor.value
            };

            for (let i = 3; i < allGroups.length; i++)
            {
                lastGroupModel.toolTipText += `${allGroups[i].name}`;
                if (i != allGroups.length - 1)
                {
                    lastGroupModel.toolTipText += ", ";
                }
            }

            tempGroupModels.push(lastGroupModel);
            return tempGroupModels;
        });

        function toggleCollapseContent()
        {
            if (showCollapseRow.value)
            {
                showCollapseRow.value = false
                setTimeout(() => stayOpen.value = false, 800);
                return;
            }

            app.popups.showRequestAuthentication(primaryColor.value, onAuthenticationSuccessful, onAuthenticationCanceld);
            authPromise.value = new Promise((resolve, reject) =>
            {
                resolveFunc = resolve;
                rejectFunc = reject;
            });
        }

        function onAuthenticationSuccessful(key: string)
        {
            showCollapseRow.value = true;
            stayOpen.value = true;
            // reqAuth.value = false;

            resolveFunc(key);
        }

        function onAuthenticationCanceld()
        {
            rejectFunc();
        }

        return {
            reqAuth,
            showCollapseRow,
            stayOpen,
            groupIconModels,
            authPromise,
            primaryColor,
            toggleCollapseContent,
            onAuthenticationSuccessful
        };
    }
})
</script>
<style>
.tableRow__groupCell {
    display: flex;
    height: inherit;
    width: clamp(75px, 5vw, 150px);
    justify-content: center;
    align-items: center;
    overflow: hidden;
    flex-wrap: wrap;

    /* this cell is centered so give it some extra space to the right so the next cell doesn't seem so close */
    margin-right: 20px;
}
</style>
