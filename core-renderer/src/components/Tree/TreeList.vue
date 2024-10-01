<template>
    <div class="treeList">
        <div class="treeList__controls">
            <SearchBar :modelValue="searchText" :color="primaryColor" :width="'200px'" :height="'3vh'" />
            <div class="treeList__buttons">
                <VaulticButton :color="primaryColor" :preferredSize="'1vw'" @click="expandAll">
                    <ion-icon name="chevron-expand-outline"></ion-icon>
                </VaulticButton>
                <VaulticButton :color="primaryColor" :preferredSize="'1vw'" @click="collapseAll">
                    <ion-icon name="chevron-collapse-outline"></ion-icon>
                </VaulticButton>
                <AddButton v-if="isOnline" :color="primaryColor" :preferredSize="'1vw'" @click="$emit('onAdd')" />
            </div>
        </div>
        <div class="treeList__divider"></div>
        <div class="treeList__nodes">
            <TransitionGroup name="listFade">
                <TreeNode v-for="model in displayModels" :key="model.id" :model="model" :color="primaryColor" />
            </TransitionGroup>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import SearchBar from "../Table/Controls/SearchBar.vue";
import AddButton from "../Table/Controls/AddButton.vue";
import TreeNode from "./TreeNode.vue";
import VaulticButton from "../InputFields/VaulticButton.vue";

import app from "../../Objects/Stores/AppStore";
import { TreeNodeModel } from "../../Types/Models";
import { TreeNodeMember } from "../../Types/Tree";

export default defineComponent({
    name: "TreeList",
    components: {
        SearchBar,
        AddButton,
        TreeNode,
        VaulticButton
    },
    props: ['nodes', 'onLeafClicked', 'onLeafEdit', 'onLeafDelete'],
    emits: ['onAdd'],
    setup(props)
    {
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);
        const treeNodes: ComputedRef<TreeNodeMember[]> = computed(() => props.nodes);
        const currentTreeNodes: Ref<TreeNodeMember[]> = ref(treeNodes.value);
        const models: Ref<TreeNodeModel[]> = ref([]);
        const displayModels: ComputedRef<TreeNodeModel[]> = computed(() => models.value.filter(m => m.display));

        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));
        const selectedLeafNode: Ref<TreeNodeMember | undefined> = ref(treeNodes.value.filter(n => !n.isParent && n.selected)?.[0]);

        function buildTreeNodeModels(nodes: TreeNodeMember[]): TreeNodeModel[]
        {
            const tempModels: TreeNodeModel[] = [];
            nodes.map(n => 
            {
                const root: TreeNodeModel =
                {
                    id: n.id!,
                    text: n.text,
                    depth: n.depth,
                    icon: n.icon,
                    selected: computed(() => (n.isParent && n.selected) || (!n.isParent && n.id == selectedLeafNode.value?.id)),
                    isParent: n.isParent,
                    display: n.depth == 0 ||
                        (n.parent?.depth == 0 && n.parent?.selected == true) ||
                        (n.parent != undefined && n.parent.depth > 0 && n.parent.display == true),
                    onClick: async function ()
                    {
                        if (n.isParent)
                        {
                            n.selected = !n.selected;
                            n.display = !n.display;

                            if (!n.display)
                            {
                                iterateMembers(n.children, (member) => member.display = false);
                            }
                            else 
                            {
                                iterateMembers(n.children, (member) => member.display = member.selected);
                            }
                        }
                        else
                        {
                            // You can't un select a vault
                            if (n.selected)
                            {
                                return;
                            }

                            if (await props.onLeafClicked(n.data))
                            {
                                n.selected = true;
                                if (selectedLeafNode.value)
                                {
                                    selectedLeafNode.value.selected = false;
                                }

                                selectedLeafNode.value = n;
                            }
                        }

                        models.value = buildTreeNodeModels(currentTreeNodes.value);
                    },
                    onEdit: () => 
                    {
                        props.onLeafEdit(n.data);
                    },
                    onDelete: () => 
                    {
                        props.onLeafDelete(n.data)
                    }
                }

                tempModels.push(root);
            });

            return tempModels;
        }

        function iterateMembers(members: TreeNodeMember[], callback: (m: TreeNodeMember) => void)
        {
            members.forEach(m =>
            {
                callback(m);
                if (m.children)
                {
                    iterateMembers(m.children, callback);
                }
            })
        }

        function expandAll()
        {
            treeNodes.value.forEach(n => 
            {
                n.display = true;
                if (n.isParent)
                {
                    n.selected = true;
                }
            });

            models.value = buildTreeNodeModels(currentTreeNodes.value);
        }

        function collapseAll()
        {
            treeNodes.value.forEach(n => 
            {
                n.display = false;
                if (n.isParent)
                {
                    n.selected = false;
                }
            });

            models.value = buildTreeNodeModels(currentTreeNodes.value);
        }

        watch(() => treeNodes.value, () => 
        {
            currentTreeNodes.value = treeNodes.value;
            models.value = buildTreeNodeModels(currentTreeNodes.value);

            if (selectedLeafNode.value)
            {
                selectedLeafNode.value.selected = false;
            }

            selectedLeafNode.value = treeNodes.value.filter(n => !n.isParent && n.selected)?.[0]
        });

        watch(() => searchText.value.value, (newValue) => 
        {
            if (newValue)
            {
                const lower = newValue.toLowerCase();
                currentTreeNodes.value = treeNodes.value.filter(n => n.text.toLowerCase().includes(lower));
            }
            else 
            {
                currentTreeNodes.value = treeNodes.value;
            }

            models.value = buildTreeNodeModels(currentTreeNodes.value);
        });

        return {
            primaryColor,
            searchText,
            models,
            displayModels,
            isOnline,
            expandAll,
            collapseAll
        };
    }
})
</script>
<style>
.treeList {
    width: 100%;
    height: 100%;
    color: white;
    display: flex;
    flex-direction: column;
    row-gap: 15px;
}

.treeList__controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 20px;
}

.treeList__buttons {
    display: flex;
    justify-content: space-around;
    width: 100%;
}

.treeList__divider {
    width: 87%;
    height: 1px;
    background-color: #2d303f;
    border-radius: 20px;
    margin: auto;
}

.treeList__nodes {
    padding-left: 10px;
}
</style>