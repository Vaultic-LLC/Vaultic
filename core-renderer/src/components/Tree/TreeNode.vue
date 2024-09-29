<template>
    <div class="treeNode" @click="onClick">
        <div class="treeNode__parentRow">
            <ion-icon class="treeNode__arrowIcon" v-if="treeNodeModel.isParent"
                :class="{ selected: treeNodeModel.selected }" name="chevron-forward-outline"></ion-icon>
            <component :is="treeNodeModel.icon" :fontSize="'17px'" />
            <div class="treeNode__selectIcon" v-if="!treeNodeModel.isParent">
                <SelectorButton :selectorButtonModel="selectorButtonModel" :width="'clamp(8px, 0.7vw, 20px)'"
                    :borderWidth="'0.06vw'" />
            </div>
            <div class="treeNode__text">{{ treeNodeModel.text }}</div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref, watch } from 'vue';

import SelectorButton from "../InputFields/SelectorButton.vue";
import CloudExportIcon from "../Icons/CloudExportIcon.vue";
import ArchivedIcon from "../Icons/ArchivedIcon.vue";
import CloudImportIcon from "../Icons/CloudImportIcon.vue";
import FolderIcon from "../Icons/FolderIcon.vue";
import PersonOutlineIcon from "../Icons/PersonOutlineIcon.vue";

import { SelectorButtonModel, TreeNodeModel } from "../../Types/Models";

export default defineComponent({
    name: "TreeNode",
    components: {
        SelectorButton,
        CloudExportIcon,
        ArchivedIcon,
        CloudImportIcon,
        FolderIcon,
        PersonOutlineIcon
    },
    props: ['model', 'color'],
    setup(props)
    {
        const treeNodeModel: ComputedRef<TreeNodeModel> = computed(() => props.model);
        const marginLeft: ComputedRef<string> = computed(() => `${treeNodeModel.value.depth * 5}%`)

        const isActive = ref(treeNodeModel.value.selected.value)
        const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
        {
            return {
                isActive,
                color: props.color,
                onClick
            }
        });

        watch(() => treeNodeModel.value.selected.value, (newValue) => 
        {
            isActive.value = newValue;
        })

        function onClick() 
        {
            treeNodeModel.value.onClick();
        }

        return {
            treeNodeModel,
            selectorButtonModel,
            marginLeft,
            onClick
        };
    }
})
</script>
<style>
.treeNode {
    margin-left: v-bind(marginLeft);
    border-radius: 5px;
    background-color: transparent;
    transition: 300ms;
    cursor: pointer;
    padding-top: 10px;
    padding-bottom: 10px
}

.treeNode:hover {
    background-color: #8c8ca129;
}

.treeNode__parentRow {
    display: flex;
    align-items: center;
    column-gap: 5px;
}

.treeNode__arrowIcon {
    color: white;
    transition: 200ms;
    visibility: visible;
}

.treeNode__arrowIcon.selected {
    transform: rotate(90deg);
}
</style>