<template>
    <div class="treeNode" @click="onClick" @mouseenter="hovering = true" @mouseleave="hovering = false">
        <div class="treeNode__parentRow">
            <ion-icon class="treeNode__arrowIcon" v-if="treeNodeModel.isParent"
                :class="{ selected: treeNodeModel.selected }" name="chevron-forward-outline"></ion-icon>
            <component :is="treeNodeModel.icon" :fontSize="'clamp(12px, 0.6vw, 17px)'" />
            <div class="treeNode__selectIcon" v-if="!treeNodeModel.isParent">
                <SelectorButton :selectorButtonModel="selectorButtonModel" :width="'clamp(8px, 0.7vw, 20px)'"
                    :borderWidth="'0.06vw'" />
            </div>
            <div class="treeNode__text">{{ treeNodeModel.text }}</div>
            <Transition name="fade" mode="out-in">
                <div class="treeNode__buttons" v-if="!treeNodeModel.isParent && hovering">
                    <div class="treeNode__button" v-for="(button, idx) in treeNodeModel.buttons" :key="idx"
                        @click.stop="button.onClick(treeNodeModel.data)">
                        <VaulticIcon :fontSize="'clamp(15px, 1vw, 23px)'">
                            <ion-icon :name="button.icon"></ion-icon>
                        </VaulticIcon>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import SelectorButton from "../InputFields/SelectorButton.vue";
import CloudExportIcon from "../Icons/CloudExportIcon.vue";
import ArchivedIcon from "../Icons/ArchivedIcon.vue";
import CloudImportIcon from "../Icons/CloudImportIcon.vue";
import FolderIcon from "../Icons/FolderIcon.vue";
import PersonOutlineIcon from "../Icons/PersonOutlineIcon.vue";
import VaulticIcon from "../Icons/VaulticIcon.vue"

import { SelectorButtonModel, TreeNodeModel } from "../../Types/Models";

export default defineComponent({
    name: "TreeNode",
    components: {
        SelectorButton,
        CloudExportIcon,
        ArchivedIcon,
        CloudImportIcon,
        FolderIcon,
        PersonOutlineIcon,
        VaulticIcon
    },
    props: ['model', 'color'],
    setup(props)
    {
        const treeNodeModel: ComputedRef<TreeNodeModel> = computed(() => props.model);
        const marginLeft: ComputedRef<string> = computed(() => `${treeNodeModel.value.depth * 5}%`);
        const hovering: Ref<boolean> = ref(false);

        const isActive = ref(treeNodeModel.value.selected ?? false);
        const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
        {
            return {
                isActive,
                color: ref(props.color),
                onClick
            }
        });

        watch(() => treeNodeModel.value.selected, (newValue) => 
        {
            // this is getting unwrapped somewhere by vue. NewValue is a boolean, not a computed anymore
            if (typeof newValue == 'boolean')
            {
                isActive.value = newValue;
            }
        });

        function onClick() 
        {
            treeNodeModel.value.onClick();
        }

        return {
            hovering,
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
    padding-top: clamp(6px, 0.3vw, 10px);
    padding-bottom: clamp(6px, 0.3vw, 10px)
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
    font-size: clamp(12px, 0.6vw, 17px);
}

.treeNode__arrowIcon.selected {
    transform: rotate(90deg);
}

.treeNode__text {
    transition: 300ms;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    text-align: left;
    flex-grow: 1;
    font-size: clamp(12px, 0.6vw, 17px);
}

.treeNode__buttons {
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 5px;
    margin-right: 5px;
}
</style>