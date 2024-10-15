<template>
    <div class="iconCardContainer">
        <div class="iconCardContainer__items">
            <ion-icon class="iconCardContainer__icon" :name="icon"></ion-icon>
            <div class="iconCardContainer__text">{{ text }}</div>
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { getLinearGradientFromColor, mixHexes } from '../Helpers/ColorHelper';
import app from "../Objects/Stores/AppStore";

export default defineComponent({
    name: "IconCard",
    props: ['icon', 'text'],
    setup()
    {
        const color: ComputedRef<string> = computed(() =>
        {
            return app.userPreferences.currentPrimaryColor.value
        });

        const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(color.value));
        const mixedColor: ComputedRef<string> = computed(() => mixHexes(color.value, "#FFFFFF"));

        return {
            color,
            gradient,
            mixedColor
        }
    }
})
</script>
<style>
.iconCardContainer {
    /* background: var(--widget-background-color); */
    height: 100%;
    border-radius: 1vw;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.3s;
    flex-grow: 1;
    cursor: pointer;
}

.iconCardContainer:hover {
    box-shadow: 0 0 25px v-bind(color);
}

.iconCardContainer__items {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    /* color: white; */
    row-gap: 0.7vw;
}

.iconCardContainer__icon {
    transition: 0.3s;
    font-size: clamp(15px, 2vw, 48px);
    transform: translateY(50%);
    color: white;
}

.iconCardContainer:hover .iconCardContainer__items .iconCardContainer__icon {
    transform: translateY(0);
    color: v-bind(color);
}

.iconCardContainer__text {
    transition: 0.3s;
    opacity: 0;
    font-size: clamp(10px, 1vw, 24px);
    color: v-bind(color);
}

.iconCardContainer:hover .iconCardContainer__items .iconCardContainer__text {
    opacity: 1;
}
</style>
