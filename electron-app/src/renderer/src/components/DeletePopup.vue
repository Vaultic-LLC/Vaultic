<template>
    <div class="deletePopup">
        <div class="deletePopupContent">
            <div class="deletePopupTitle">
                <h2>Are you sure you want to delete this {{ objectDisplayName }}?</h2>
            </div>
            <div class="deletePopupButtons">
                <div class="confirmDeleteButton">
                    <span @click="confirmDelete">Confirm</span>
                </div>
                <div class="cancelDeleteButton">
                    <span @click="cancelDelete">Cancel</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: "DeletePopup",
    props: ['objectDisplayName'],
    emits: ["onConfirmDelete", "onCancelDelete"],
    setup(_, ctx)
    {
        function confirmDelete()
        {
            ctx.emit("onConfirmDelete");
        }

        function cancelDelete()
        {
            ctx.emit("onCancelDelete");
        }

        return {
            confirmDelete,
            cancelDelete
        }
    }
})
</script>
<style>
.deletePopup {
    position: fixed;
    height: 300px;
    width: 600px;
    top: 30%;
    left: 40%;
}

.deletePopup .deletePopupContent {
    display: flex;

}
</style>