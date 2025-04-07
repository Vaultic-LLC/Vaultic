<template>
    <div ref="button" class="popupButton">
        <Button :pt="{
            root: 'popupButton__root'
        }" 
        :label="text" :class="'popupButton__primeVueButton'" :fluid="true" :disabled="disabled" @click.stop="doOnClick" />
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, onUnmounted, ref, computed, ComputedRef } from "vue";

import Button from "primevue-vaultic/button";

export default defineComponent({
    name: "PopupButton",
    components: 
    {
        Button
    },
    emits: ['onClick'],
    props: ['color', 'text', 'width', 'maxWidth', 'minWidth', 'height', 'minHeight', 'maxHeight', 'fontSize',
        'disabled', 'isSubmit', 'fadeIn', 'fallbackClickHandler'],
    setup(props, ctx)
    {
        const button: Ref<HTMLElement | null> = ref(null);
        const doFadeIn: Ref<boolean> = ref(false);
        const transition: Ref<string> = ref('0s');

        const computedFontSize: ComputedRef<string> = computed(() => props.fontSize ?? "clamp(10px, 1vw, 16px)");

        function doOnClick()
        {
            if (props.disabled)
            {
                return;
            }

            button.value?.blur();

            // For some reason emitting onClick doesn't work when the butto is in a primevue/Popover
            if (props.fallbackClickHandler)
            {
                props.fallbackClickHandler();
            }
            else
            {
                ctx.emit('onClick');
            }
        }

        function onKeyUp(e: KeyboardEvent)
        {
            if (props.disabled)
            {
                return;
            }

            if (e.key === 'Enter' && document.activeElement == button.value)
            {
                button.value?.blur();
                if (props.isSubmit)
                {
                    doOnClick();
                }
            }
        }

        onMounted(() =>
        {
            // wait to add the transition till after the buttons are rendered otherwise it will transition the button growing
            // which will make everything on the page twitch up
            setTimeout(() => transition.value = '0.3s', 200);
            window.addEventListener("keyup", onKeyUp);
        });

        onUnmounted(() =>
        {
            window.removeEventListener("keyup", onKeyUp)
        });

        return {
            button,
            doFadeIn,
            transition,
            computedFontSize,
            doOnClick
        }
    }
})
</script>

<style>
.popupButton {
    width: v-bind(width);
    height: v-bind(height);
    max-width: v-bind(maxWidth);
    min-width: v-bind(minWidth);
    max-height: v-bind(maxHeight);
    min-height: v-bind(minHeight);
    transition: v-bind(transition);
    cursor: pointer;
}

.popupButton__root:focus-visible {
    outline: none !important;
    box-shadow: 0 0 25px v-bind(color) !important;
}

.popupButton.fadeIn {
    animation: fadeIn 1s linear forwards;
}

.popupButton__primeVueButton {
    height: 100% !important;
    transition: v-bind(transition) !important;
    background-color: var(--app-color) !important;
    color: white !important;
    border: 1.5px solid v-bind(color) !important;
    padding: clamp(2px, 0.3vw, 8px) clamp(6px, 0.5vw, 12px) !important;
    font-size: v-bind(computedFontSize) !important;
}

.popupButton__primeVueButton:hover {
    box-shadow: 0 0 25px v-bind(color) !important;
}
</style>
