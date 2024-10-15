<template>
    <div ref="button" tabindex="0" class="popupButton" :class="{ fadeIn: doFadeIn, disabled: disabled }"
        :disabled="disabled" @click.stop="doOnClick">
        {{ text }}
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, onUnmounted, ref } from "vue";

export default defineComponent({
    name: "PopupButton",
    emits: ['onClick'],
    props: ['color', 'text', 'width', 'maxWidth', 'minWidth', 'height', 'minHeight', 'maxHeight', 'fontSize', 'minFontSize', 'maxFontSize',
        'disabled', 'isSubmit', 'fadeIn'],
    setup(props, ctx)
    {
        const button: Ref<HTMLElement | null> = ref(null);
        const doFadeIn: Ref<boolean> = ref(props.fadeIn !== false);
        const transition: Ref<string> = ref('0s');

        function doOnClick()
        {
            if (props.disabled)
            {
                return;
            }

            button.value?.blur();
            ctx.emit('onClick');
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
    background-color: var(--app-color);
    color: white;
    border: 2px solid v-bind(color);
    border-radius: var(--responsive-border-radius);
    transition: v-bind(transition);
    font-size: clamp(v-bind(minFontSize), v-bind(fontSize), v-bind(maxFontSize));
    cursor: pointer;
    outline: none;
    padding: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.popupButton.fadeIn {
    animation: fadeIn 1s linear forwards;

}

.popupButton:hover,
.popupButton:focus {
    box-shadow: 0 0 25px v-bind(color);
}

.popupButton:disabled,
.popupButton.disabled {
    box-shadow: 0 0 0 0;
    border: 2px solid gray;
    color: gray;
}
</style>
