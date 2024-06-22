<template>
    <div class="tableHeaderTab" @click="onTabClick"
        :class="{ active: tabModel.active!.value, small: size == 'small', regular: size == 'regular' }">
        {{ tabModel.name }}
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref, watch } from 'vue';

import { HeaderTabModel } from '../../../Types/Models';
import { getLinearGradientFromColor, getLinearGradientFromColorAndPercent, hexToRgb } from '../../../Helpers/ColorHelper';
import { widgetBackgroundHexString, widgetBackgroundRGBA } from "../../../Constants/Colors"
import { RGBColor } from '../../../Types/Colors';
import { tween } from '../../../Helpers/TweenHelper';

export default defineComponent({
    name: "TableHeaderTab",
    props: ["model"],
    setup(props)
    {
        const tabModel: ComputedRef<HeaderTabModel> = computed(() => props.model);
        const size: ComputedRef<string> = computed(() => tabModel.value.size ? tabModel.value.size : 'regular');
        const backgroundGradient: Ref<string> = ref('');
        const hoverColor: Ref<string> = ref('');

        function onTabClick()
        {
            if (tabModel.value.onClick)
            {
                // @ts-ignore
                tabModel.value.onClick();
            }
        }

        function updateGradient(clr: RGBColor)
        {
            backgroundGradient.value = getLinearGradientFromColor(`rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`);
        }

        watch(() => tabModel.value.active?.value, (newValue) =>
        {
            let tweenTo: RGBColor | null = null;
            let tweenFrom: RGBColor | null = null;

            if (newValue)
            {
                tweenTo = hexToRgb(tabModel.value.color!.value);
                tweenFrom = widgetBackgroundRGBA();
                tween<RGBColor>(tweenFrom!, tweenTo!, 500, updateGradient);
            }
            else
            {
                tweenTo = widgetBackgroundRGBA();
                tweenFrom = hexToRgb(tabModel.value.color!.value);
                tween({ ...tweenFrom!, x: 30 }, { ...tweenTo!, x: 0 }, 500, updateToWidgetColor);
            }


            function updateToWidgetColor(clr: any)
            {
                backgroundGradient.value = getLinearGradientFromColorAndPercent(
                    `rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`, clr.x);
            }
        });

        watch(() => tabModel.value.color.value, (newValue, oldValue) =>
        {
            hoverColor.value = newValue;

            if (!tabModel.value.active.value)
            {
                return;
            }

            let tweenTo: RGBColor | null = hexToRgb(newValue);
            let tweenFrom: RGBColor | null = hexToRgb(oldValue);

            tween<RGBColor>(tweenFrom!, tweenTo!, 500, updateGradient);
        });

        onMounted(() =>
        {
            backgroundGradient.value = tabModel.value.active!.value ? getLinearGradientFromColor(tabModel.value.color!.value) : widgetBackgroundHexString();
            hoverColor.value = tabModel.value.color!.value;
        });

        return {
            tabModel,
            backgroundGradient,
            hoverColor,
            size,
            onTabClick
        }
    }
})
</script>

<style>
.tableHeaderTab {
    transition: 0.3s;
    color: white;
    background: v-bind(backgroundGradient);
    cursor: pointer;
    min-width: 25%;
    text-align: center;
    position: relative;
    z-index: 2
}

.tableHeaderTab.regular {
    font-size: clamp(10px, 1vw, 20px);
    padding: clamp(5px, 0.5vw, 10px);
}

.tableHeaderTab.small {
    font-size: clamp(10px, 0.8vw, 16px);
    padding: clamp(1px, 0.3vw, 4px);
}

.tableHeaderTab:not(.active):hover {
    box-shadow: 0 0 25px v-bind(hoverColor);
}

.tableHeaderTab:nth-child(2) {
    border-top-left-radius: min(1.2vw, 20px);
}

.tableHeaderTab:last-child {
    border-top-right-radius: min(1.2vw, 20px);
}
</style>
