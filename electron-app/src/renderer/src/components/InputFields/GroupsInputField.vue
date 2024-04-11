<template>
    <div class="groupSelector">
        <div class="groupButtons">
            <div class="groupButton" v-for="(group, index) in groups" :key="index"
                @click="tableRowDatas[index].onClick()">
                <SelectorButton :selectorButtonModel="tableRowDatas[index]" />
                <div class="groupButtonText"> {{ group.name }}</div>
            </div>
        </div>
        <label class="groupSelectorLabel">Select Groups</label>
    </div>
</template>
<script lang="ts">
import { ComputedRef, computed, defineComponent, ref } from 'vue';
import SelectorButton from './SelectorButton.vue';

import { SelectorButtonModel } from '../../Types/Models';
import { Group } from '../../Types/Table';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
    name: "GroupsInputField",
    components:
    {
        SelectorButton
    },
    emits: ['onGroupSelected', 'onGroupRemoved'],
    props: ['groups', 'selectedGroups'],
    setup(props, ctx)
    {
        const headers: string[] = ['', 'Group'];
        const color: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentColorPalette.groupsColor);

        const tableRowDatas: ComputedRef<SelectorButtonModel[]> = computed(() =>
        {
            return (props.groups as Group[]).map(g =>
            {
                return {
                    isActive: ref(props.selectedGroups.includes(g.id)),
                    color: computed(() => stores.userPreferenceStore.currentColorPalette.groupsColor),
                    onClick: function ()
                    {
                        if (this.isActive.value)
                        {
                            this.isActive.value = false;
                            ctx.emit('onGroupRemoved', g.id);
                        }
                        else
                        {
                            // for some reaon I can't assign 'true' to 'false'
                            // @ts-ignore
                            this.isActive.value = true;
                            ctx.emit('onGroupSelected', g.id);
                        }
                    }
                }
            });
        })

        return {
            headers,
            tableRowDatas,
            color,
        }
    }
})
</script>

<style>
.groupSelector {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    border: solid 1.5px v-bind(color);
    border-radius: 1rem;
}

.groupSelector .groupSelectorLabel {
    color: v-bind(color);
    padding: .2rem;
    position: absolute;
    top: -10%;
    left: 5%;
    user-select: none;
    background: var(--app-color);
}

.groupButtons {
    margin: 20px;
    width: inherit;
    display: flex;
    justify-content: start;
}

.groupButtons .groupButton {
    height: 40%;
    margin: 15px;
    padding-right: 20px;
    display: flex;
    align-items: center;
    border-radius: 1rem;
    background-color: #121a20;
    /* box-shadow: 5px 5px 10px #070a0c,
        -5px -5px 10px #1b2630; */
}

.groupButtons .groupButton .groupButtonText {
    color: white;
    user-select: none;

}
</style>
