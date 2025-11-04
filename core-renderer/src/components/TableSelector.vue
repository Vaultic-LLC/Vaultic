<template>
    <div class="tableSelector">
        <SingleSelectorItem v-for="(ssi, index) in singleSelectorItems" :key="index" :item="ssi" :isFirst="index == 0"
            :isLast="index == singleSelectorItems.length - 1" :width="itemWidth" />
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ComputedRef } from 'vue';

import SingleSelectorItem from "./SingleSelector/SingleSelectorItem.vue"

export default defineComponent({
    name: "TableSelector",
    components:
    {
        SingleSelectorItem
    },
    props: ["singleSelectorItems"],
    setup(props)
    {
        const itemWidth: ComputedRef<string> = computed(() => props.singleSelectorItems.length == 1 ? '100%' : '50%')
        return {
            itemWidth
        }
    }
})
</script>

<style>
.tableSelector {
    margin: auto;
    margin-top: clamp(20px, 2vw, 50px);
    height: clamp(25px, 2.5vw, 50px);
    background-color: var(--app-color);
    box-shadow: 0 5px 25px rgba(255, 255, 255, 0.25);
    border-radius: 2vw;
    display: flex;
    cursor: pointer;
    position: absolute;
    background: linear-gradient(145deg, #121a20, #0f161b);
    box-shadow: 5px 5px 10px #070a0c,
        -5px -5px 10px #1b2630;
}
</style>
