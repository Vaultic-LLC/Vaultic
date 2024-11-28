<template>
    <div ref="groupIcon" class="groupIconContainer">
        <span class="groupIconContainer__iconContainer">
            <i :class='`pi ${groupModel.icon} groupIconContainer__icon`'></i>
        </span>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import tippy from 'tippy.js';
import { GroupIconModel } from '../../Types/Models';

export default defineComponent({
    name: "GroupIcon",
    props: ["model", "displayOverride"],
    setup(props)
    {
        const groupIcon: Ref<HTMLElement | null> = ref(null);
        let groupModel: ComputedRef<GroupIconModel> = computed(() => props.model);

        onMounted(() =>
        {
            if (groupIcon.value)
            {
                tippy(groupIcon.value, {
                    content: groupModel.value.toolTipText,
                    inertia: true,
                    animation: 'scale',
                    theme: 'material',
                    placement: 'top'
                });
            }
        });

        return {
            groupIcon,
            groupModel
        }
    },
})
</script>
<style>
.groupIconContainer {
    width: clamp(15.5px, 1.4vw, 40px);
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.5s;
    /* background: v-bind('groupModel.color'); */
    /* box-shadow: 0 0 5px v-bind('groupModel.color'); */
    background: color-mix(in srgb, v-bind('groupModel.color'), transparent 84%);
    margin: 2px;
    will-change: transform;
}

.groupIconContainer:hover {
    transform: scale(1.1);
}

.groupIconContainer__iconContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    font-size: clamp(10px, 0.7vw, 16px);
}

.groupIconContainer__icon {
    color: v-bind('groupModel.color');
    font-size: 20px !important;
}
</style>
