<template>
    <td class="tableRowValue">
        <div class="tableRowValue__content">
            <slot></slot>
            <div v-if="rowValue.copiable" class="tableRowValue__copyIcon" @click.stop="copyText(rowValue.value)">
                <ion-icon name="clipboard-outline"></ion-icon>
            </div>
        </div>
    </td>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import { TextTableRowValue } from '../../../Types/Models';
import clipboard from 'clipboardy';
import app from "../../../Objects/Stores/AppStore";

export default defineComponent({
    name: "TableRowValue",
    props: ["model", "color"],
    setup(props)
    {
        const rowValue: ComputedRef<TextTableRowValue> = computed(() => props.model);
        const primaryColor: ComputedRef<string> = computed(() => props.color);

        function copyText(text: string)
        {
            clipboard.write(text);
            app.popups.showToast(primaryColor.value, "Copied", true);
        }

        return {
            rowValue,
            primaryColor,
            copyText
        };
    },
})
</script>
<style>
.tableRowValue {
    padding: 0;
}

.tableRowValue__content {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    width: v-bind('rowValue.width');
}

.tableRowValue__copyIcon {
    color: white;
    transition: 0.3s;
    font-size: clamp(13px, 1.2vw, 25px);
    cursor: pointer;
    transform: translate(50%, -50%);
}

.tableRowValue__copyIcon:hover {
    color: v-bind(primaryColor);
    transform: translate(50%, -50%) scale(1.1);
}
</style>
