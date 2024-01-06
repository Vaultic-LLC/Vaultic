<template>
    <div class="selectorButton" :class="{ active: selectorButtonModel.isActive.value }"
        @click.stop="selectorButtonModel.onClick()">
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from "vue";

export default defineComponent({
    name: "SelectorButton",
    props: ['selectorButtonModel'],
    setup(props)
    {
        const primaryColor: Ref<string> = ref(props.selectorButtonModel.color);
        return {
            primaryColor,
        }
    }
})
</script>

<style>
.selectorButton {
    border-radius: 50%;
    background-color: v-bind(primaryColor);
    width: 30px;
    height: 30px;
    margin: 5px;
    transition: 0.6s;
    position: relative;
}

.selectorButton::before {
    content: '';
    border-radius: inherit;
    background-color: #121a20;
    width: 25px;
    height: 25px;
    left: 2.5px;
    top: 2.5px;
    position: absolute;
    transition: 0.6s;
    background: #11181e;
    box-shadow: inset 5px 5px 10px #070a0c,
        inset -5px -5px 10px #1b2630;
}

.selectorButton.active {
    transition: 0.6s;
    box-shadow: 0 0 10px v-bind(primaryColor);
}

.selectorButton.active::before {
    transition: 0.6s;
    background-color: v-bind(primaryColor);
    /* background: linear-gradient(145deg, #121a20, #0f161b);
    box-shadow: 2px 2px 10px #070a0c,
        -2px -2px 10px #1b2630; */
    box-shadow: 0 0 0;
}
</style>