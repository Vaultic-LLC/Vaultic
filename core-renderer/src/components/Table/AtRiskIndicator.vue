<template>
    <div class="atRiskContainer">
        <div class="atRiskIcon" ref="atRiskIcon">
            <ion-icon name="alert-circle-outline"></ion-icon>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, ref } from 'vue';

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling
import 'tippy.js/animations/scale.css';

export default defineComponent({
    name: "AtRiskIndicator",
    props: ["message", 'color'],
    setup(props)
    {
        const atRiskIcon: Ref<HTMLElement | null> = ref(null);

        onMounted(() =>
        {
            if (props.message && atRiskIcon.value)
            {
                tippy(atRiskIcon.value, {
                    content: props.message,
                    inertia: true,
                    animation: 'scale',
                    theme: 'material'
                })
            }
        })

        return {
            atRiskIcon
        };
    }
})
</script>
<style>
.tippy-box[data-theme~='material'] {
    text-align: center;
}

.atRiskContainer {
    position: relative;
    grid-template-rows: repeat(2, auto);
    display: flex;
    align-items: center;
    justify-content: center;
}

.atRiskContainer .atRiskIcon {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(18px, 1.1vw, 28px);
    color: v-bind(color);
    transition: 0.3s;
}

.atRiskContainer .atRiskIcon:hover {
    transform: scale(1.1);
}

.atRiskContainer .atRiskPopupMessage {
    position: absolute;
    opacity: 0;
}
</style>
