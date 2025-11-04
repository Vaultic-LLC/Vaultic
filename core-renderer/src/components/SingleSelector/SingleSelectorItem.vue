<template>
    <div class="tableSelectorButton" @click="selectorItem.onClick()"
        :class="{ active: selectorItem.isActive.value, first: isFirst, last: isLast }">
        <Transition name="fade" mode="out-in">
            <div :key="key" class="tableSelectorButtonText">
                {{ selectorItem.title.value }}
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import { SingleSelectorItemModel } from '../../Types/Models'
import { getLinearGradientFromColor, getLinearGradientFromColorAndPercent, hexToRgb } from '../../Helpers/ColorHelper';
import { widgetBackgroundHexString, widgetBackgroundRGBA } from '../../Constants/Colors';
import { RGBColor } from '../../Types/Colors';
import { tween } from '../../Helpers/TweenHelper';

export default defineComponent({
    name: "SingleSelectorItem",
    props: ["item", "isFirst", "isLast", "width"],
    setup(props)
    {
        const key: Ref<string> = ref('');
        const selectorItem: ComputedRef<SingleSelectorItemModel> = computed(() => props.item);
        const background: Ref<string> = ref('');

        watch(() => selectorItem.value.isActive.value, (newValue) =>
        {
            let tweenTo: RGBColor | null = null;
            let tweenFrom: RGBColor | null = null;

            if (newValue)
            {
                tweenTo = hexToRgb(selectorItem.value.color.value);
                tweenFrom = widgetBackgroundRGBA();
                tween<RGBColor>(tweenFrom!, tweenTo!, 500, updateGradient);
            }
            else
            {
                tweenTo = widgetBackgroundRGBA();
                tweenFrom = hexToRgb(selectorItem.value.color.value);
                tween({ ...tweenFrom!, x: 30 }, { ...tweenTo!, x: 0 }, 500, updateToWidgetColor);
            }

            function updateToWidgetColor(clr: any)
            {
                background.value = getLinearGradientFromColorAndPercent(
                    `rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`, clr.x);
            }
        });

        function updateGradient(clr: RGBColor)
        {
            background.value = getLinearGradientFromColor(`rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`);
        }

        onMounted(() =>
        {
            background.value = selectorItem.value.isActive.value ?
                getLinearGradientFromColor(selectorItem.value.color.value) :
                widgetBackgroundHexString()
        });

        watch(() => selectorItem.value.title.value, () =>
        {
            key.value = Date.now().toString();
        });

        watch(() => selectorItem.value.color.value, (newValue, oldValue) =>
        {
            if (selectorItem.value.isActive.value)
            {
                let tweenTo: RGBColor | null = hexToRgb(newValue);
                let tweenFrom: RGBColor | null = hexToRgb(oldValue);
                tween<RGBColor>(tweenFrom!, tweenTo!, 500, updateGradient);
            }
        });

        return {
            selectorItem,
            background,
            key
        }
    }
})
</script>

<style>
.tableSelectorButton {
    width: v-bind(width);
    display: flex;
    position: relative;
    overflow: hidden;
    animation: tableSelectorOneNotHover .2s linear forwards;
    background: v-bind(background);
    display: flex;
    justify-content: center;
    align-items: center;
}

.tableSelectorButton.first {
    border-top-left-radius: 1vw;
    border-bottom-left-radius: 1vw;
}

.tableSelectorButton.last {
    border-top-right-radius: 1vw;
    border-bottom-right-radius: 1vw;
}

.tableSelectorButton .tableSelectorButtonText {
    transition: 0.3s;
    color: white;
    font-size: clamp(10px, 0.8vw, 17px);
    padding: 10px;
    cursor: pointer;
    text-align: center;
}

.tableSelectorButton:hover {
    animation: tableSelectorOneHover .2s linear forwards;
}

@keyframes tableSelectorOneHover {

    0% {
        /* border: 5px solid transparent; */
        box-shadow: 0 0 0 v-bind('selectorItem.color.value');
    }

    100% {
        /* border: 5px solid v-bind('selectorItem.color.value'); */
        box-shadow: 0 0 25px v-bind('selectorItem.color.value');
    }
}

@keyframes tableSelectorOneNotHover {
    0% {
        /* border: 5px solid v-bind('selectorItem.color.value'); */
        box-shadow: 0 0 25px v-bind('selectorItem.color.value');
    }

    100% {
        /* border: 5px solid transparent; */
        box-shadow: 0 0 0 v-bind('selectorItem.color.value');
    }
}
</style>
