<template>
    <div class="sideDrawer">
        <div class="sideDrawer__onlineStatusContainer">
            <div class="sideDrawer__onlineStatusIcon" :class="{ online: online }">
            </div>
            <Transition name="fade" mode="out-in">
                <div class="sideDrawer__onlineStatusText" :key="refreshKey">
                    {{ text }}
                </div>
            </Transition>
        </div>
        <div class="sideDrawer__currentUser">
            <div class="sideDrawer__currentUserIcon">
                <PersonOutlineIcon />
            </div>
            <div class="sideDrawer__currentUserName">Tyler Wanta</div>
        </div>
        <div class="sideDrawer__vaultList">
            <TreeList :nodes="allNodes" @onAdd="openCreateVaultPopup" :onLeafClicked="onLeafClicked"
                :onLeafEdit="onLeafEdit" :onLeafDelete="onLeafDelete" />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch, onMounted, onUnmounted } from 'vue';

import TreeList from "./Tree/TreeList.vue";
import PersonOutlineIcon from "./Icons/PersonOutlineIcon.vue";

import app from "../Objects/Stores/AppStore";
import { TreeNodeMember, TreeNodeListManager } from "../Types/Tree";
import { Dictionary } from "../Types/DataStructures";
import { DisplayVault, VaultType } from "../Types/APITypes";
import { TreeNodeButton } from "../Types/Models";

export default defineComponent({
    name: "SideDrawer",
    components: {
        TreeList,
        PersonOutlineIcon
    },
    setup()
    {
        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const online: Ref<boolean> = ref(app.isOnline);
        const text: Ref<string> = ref(online.value ? "Online" : "Offline");
        let refreshKey: Ref<string> = ref('');

        const manager = new TreeNodeListManager();

        const myVaultsID = manager.addRoot("My Vaults", true, true, "FolderIcon");
        const privateVaultsID = manager.addChild(myVaultsID, "Private", true, true, true, "PersonOutlineIcon");
        const sharedWithOthersID = manager.addChild(myVaultsID, "Shared", false, true, true, "CloudExportIcon");

        const otherVaultsID = manager.addRoot("Other", false, false, "FolderIcon");
        const sharedWithMeID = manager.addChild(otherVaultsID, "Shared", false, false, true, "CloudImportIcon")
        const archivedVaultsID = manager.addChild(otherVaultsID, "Archived", false, false, true, "ArchivedIcon");

        const allNodes: Ref<TreeNodeMember[]> = ref(manager.buildList());

        const treeNodeEditButton: TreeNodeButton =
        {
            icon: 'create-outline',
            onClick: onLeafEdit
        };

        const treeNodeDeleteButton: TreeNodeButton =
        {
            icon: 'trash-outline',
            onClick: onLeafDelete
        };

        const treeNodeUndoButton: TreeNodeButton =
        {
            icon: 'arrow-undo-outline',
            onClick: onUnarchiveVault
        };

        function openCreateVaultPopup()
        {
            app.popups.showVaultPopup((_) => { });
        }

        async function onLeafClicked(data: Dictionary<any>): Promise<boolean>
        {
            return new Promise((resolve) => 
            {
                app.popups.showRequestAuthentication(primaryColor.value, onKeySuccess, () => resolve(false));

                async function onKeySuccess(key: string)
                {
                    if (data['type'] == VaultType.Personal)
                    {
                        if (!(await app.setActiveVault(key, data['userVaultID'])))
                        {
                            app.popups.showToast(primaryColor.value, 'Failed to select Vault', false);
                            resolve(false);

                            return;
                        }
                    }
                    else if (data['type'] == VaultType.Archived)
                    {
                        if (!(await app.loadArchivedVault(key, data['userVaultID'])))
                        {
                            app.popups.showToast(primaryColor.value, 'Failed to load archived vault', false);
                            resolve(false);

                            return;
                        }
                    }

                    resolve(true);
                }
            });
        }

        async function onLeafEdit(data: Dictionary<any>)
        {
            const dispalyVault = app.userVaults.value.filter(uv => uv.userVaultID == data['userVaultID']);
            if (dispalyVault.length != 1)
            {
                // TODO: error
                return;
            }

            app.popups.showVaultPopup(() => { }, dispalyVault[0]);
        }

        async function onLeafDelete(data: Dictionary<any>)
        {
            // can't delete our last vault
            if (app.userVaults.value.length == 1)
            {
                return true;
            }

            app.popups.showRequestAuthentication(primaryColor.value, onKeySuccess, () => { });
            async function onKeySuccess(key: string)
            {
                if (!(await app.archiveVault(key, data['userVaultID'])))
                {
                    app.popups.showToast(primaryColor.value, 'Failed to load archived vault', false);
                }
            }
        }

        async function onUnarchiveVault(data: Dictionary<any>)
        {
            app.popups.showRequestAuthentication(primaryColor.value, onKeySuccess, () => { });
            async function onKeySuccess(key: string)
            {
                if (!(await app.unarchiveVault(key, data['userVaultID'])))
                {
                    app.popups.showToast(primaryColor.value, 'Failed to unarchive vault', false);
                }
            }
        }

        function onVaultUpdated(dv: DisplayVault)
        {
            manager.updateNode(
                (node) => node.data["userVaultID"] == dv.userVaultID,
                (node) => node.text = dv.name);

            allNodes.value = manager.buildList();
        }

        function updateNodeList(parentNodeId: number, type: VaultType, buttons: TreeNodeButton[],
            newValue: DisplayVault[], oldValue: DisplayVault[])
        {
            const addedVault = newValue.filter(v => !oldValue.find(o => o.userVaultID == v.userVaultID));
            const removedVault = oldValue.filter(o => !newValue.find(v => v.userVaultID == o.userVaultID));

            addedVault.forEach(v => 
            {
                manager.addLeaf(parentNodeId, v.name, v.userVaultID == app.currentVault.userVaultID,
                    true, buttons, undefined, { userVaultID: v.userVaultID, type: type });
            });

            removedVault.forEach(v => 
            {
                const node = manager.findNode((n) => n.data["userVaultID"] == v.userVaultID);
                if (node)
                {
                    manager.deleteNode(node.id);
                }
            });

            allNodes.value = manager.buildList();
        }

        watch(() => app.userVaults.value, (newValue, oldValue) => 
        {
            updateNodeList(privateVaultsID, VaultType.Personal, [treeNodeEditButton, treeNodeDeleteButton], newValue, oldValue);
        });

        watch(() => app.archivedVaults.value, (newValue, oldValue) => 
        {
            updateNodeList(archivedVaultsID, VaultType.Archived, [treeNodeUndoButton, treeNodeDeleteButton], newValue, oldValue);
        });

        watch(() => app.isOnline, (newValue) =>
        {
            online.value = newValue;
            text.value = newValue ? "Online" : "Offline";
            refreshKey.value = Date.now().toString();
        });

        onMounted(() => 
        {
            app.addEvent('onVaultUpdated', onVaultUpdated);
        });

        onUnmounted(() => 
        {
            app.removeEvent('onVaultUpdated', onVaultUpdated);
        });

        return {
            primaryColor,
            allNodes,
            refreshKey,
            online,
            text,
            openCreateVaultPopup,
            onLeafClicked,
            onLeafEdit,
            onLeafDelete
        };
    }
})
</script>
<style>
.sideDrawer {
    width: 9%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    border-right: 1px solid #2d303f;
}

.sideDrawer__onlineStatusContainer {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    column-gap: 5px;
    height: 43px;
    position: relative;
    width: 42%;
    border-radius: 10px;
    background-color: var(--widget-background-color);
    padding-left: 10px;
    margin-left: 10px;
    margin-top: 10px;
}

.sideDrawer__onlineStatusIcon {
    height: 30%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    background-color: red;
    transition: 0.3s;
}

.sideDrawer__onlineStatusIcon.online {
    background-color: #52e052;
}

.sideDrawer__onlineStatusText {
    color: white;
    font-size: clamp(7px, 1vw, 18px);
}

.sideDrawer__currentUser {
    background-color: var(--widget-background-color);
    width: 90%;
    margin-left: 10px;
    border-radius: 10px;
    color: white;
    display: flex;
    height: 50px;
    align-items: center;
    column-gap: 10px;
    margin-top: 20px;
}

.sideDrawer__currentUserIcon {
    margin-left: 10px;
    font-size: 30px;
}

.sideDrawer__vaultList {
    margin-top: 50px;
}
</style>