<template>
    <div class="selectorButton" :class="{ active: selectorButtonModel.isActive.value }"
        @click.stop="selectorButtonModel.onClick()">
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from "vue";

export default defineComponent({
    name: "SelectorButton",
    props: ['selectorButtonModel', 'width', 'borderWidth'],
    setup(props)
    {
        const primaryColor: ComputedRef<string> = computed(() => props.selectorButtonModel.color.value);
        const width: ComputedRef<string> = computed(() => props.width ?? 'clamp(14px, 1.1vw, 30px)');
        const borderWidth: ComputedRef<string> = computed(() => props.borderWidth ?? '0.12vw');

        return {
            primaryColor,
            width,
            borderWidth
        }
    }
})
</script>

<style>
.selectorButton {
    border-radius: 50%;
    width: v-bind(width);
    aspect-ratio: 1/ 1;
    margin: 5px;
    transition: 0.3s;
    position: relative;
    border: v-bind(borderWidth) solid v-bind(primaryColor);
    background: #11181e;
    box-shadow: inset 5px 5px 10px #070a0c,
        inset -5px -5px 10px #1b2630;
}

.selectorButton.active {
    background-color: v-bind(primaryColor);
}

.selectorButton.active {
    transition: 0.6s;
    /* box-shadow: 0 0 10px v-bind(primaryColor); */
    box-shadow: 0 0 clamp(3px, 0.5vw, 10px) v-bind(primaryColor);
}

.selectorButton.active::before {
    transition: 0.6s;
    background-color: v-bind(primaryColor);
    box-shadow: 0 0 0;
}
</style>
