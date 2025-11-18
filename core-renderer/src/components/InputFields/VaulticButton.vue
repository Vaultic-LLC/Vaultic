<template>
    <div ref="container" class="vaulticButtonContainer">
        <div class="vaulticButtonContainer__button" :class="{ 'vaulticButtonContainer__button--active': isActive }">
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts">
import tippy from 'tippy.js';
import { computed, ComputedRef, defineComponent, Ref, ref, onMounted } from 'vue';

export default defineComponent({
    name: "VaulticButton",
    props: ['color', 'minSize', 'preferredSize', 'maxSize', 'tooltipMessage', 'fontSize', 'active'],
    setup(props)
    {
        const container: Ref<HTMLElement | null> = ref(null);
        const computedMinSize: ComputedRef<string> = computed(() => props.minSize ?? '20px');
        const computedPreferredSize: ComputedRef<string> = computed(() => props.preferredSize ?? '1.8vw');
        const computedMaxSize: ComputedRef<string> = computed(() => props.maxSize ?? '35px');
        const transition: Ref<string> = ref('0');
        const computedFontSize: ComputedRef<string> = computed(() => props.fontSize ?? 'clamp(20px, 2vw, 35px)');
        const isActive: ComputedRef<boolean> = computed(() => props.active ?? false);

        onMounted(() =>
        {
            // used to fix bug where the icon will slowly grow when first rendered
            setTimeout(() => transition.value = '0.5s', 200);
            if (props.tooltipMessage && container.value)
            {
                tippy(container.value, 
                {
					content: props.tooltipMessage,
					inertia: true,
					animation: 'scale',
					theme: 'material',
                });
            }
        });

        return {
            container,
            computedMinSize,
            computedPreferredSize,
            computedMaxSize,
            computedFontSize,
            transition,
            isActive
        }
    }
})
</script>
<style>
.vaulticButtonContainer {
    cursor: pointer;
}

.vaulticButtonContainer__button {
    height: clamp(v-bind(computedMinSize), v-bind(computedPreferredSize), v-bind(computedMaxSize));
    width: clamp(v-bind(computedMinSize), v-bind(computedPreferredSize), v-bind(computedMaxSize));
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: v-bind(computedFontSize);
    border-radius: 50%;
    color: white;
    transition: v-bind(transition);
    border: 1.5px solid v-bind(color);
}

.vaulticButtonContainer__button:hover,
.vaulticButtonContainer__button--active {
    box-shadow: 0 0 25px v-bind(color);
}
</style>