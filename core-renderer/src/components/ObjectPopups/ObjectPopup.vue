<template>
    <div class="objectPopupContainer">
        <div class="objectPopupGlass" @click.stop="doClosePopup">
        </div>
        <div ref="objectPopup" class="objectyPopup">
            <div v-if="!doPreventClose" class="closeIconContainer" @click.stop="doClosePopup">
                <IonIcon class="closeIcon" :name="'close-circle-outline'" />
            </div>
            <div class="objectyPopupContent">
                <slot></slot>
            </div>
        </div>
        <div v-if="showPulsing" class="pulsingCircles">
            <div class="circle circleOne">
            </div>
            <div class="circle circleTwo">
            </div>
            <div class="circle circleThree">
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, provide, watch, Ref, ref, onMounted } from 'vue';

import IonIcon from '../Icons/IonIcon.vue';

import { DataType } from '../../Types/DataTypes';
import * as TWEEN from '@tweenjs/tween.js'
import { RGBColor } from '../../Types/Colors';
import { hexToRgb } from '../../Helpers/ColorHelper';
import { hideAll } from 'tippy.js';
import app from "../../Objects/Stores/AppStore";
import { PopupNames, popups } from "../../Objects/Stores/PopupStore";
import { ClosePopupFuncctionKey } from '../../Constants/Keys';
import { AppView } from '../../Types/App';

export default defineComponent({
    name: "ObjectPopup",
    components:
    {
        IonIcon
    },
    props: ["show", "closePopup", "height", "width", 'minHeight', 'minWidth', 'preventClose', 'glassOpacity', "showPulsing",
        "popupInfoOverride"],
    setup(props)
    {
        const popupInfo = props.popupInfoOverride ? popups[props.popupInfoOverride as PopupNames] : popups.defaultObjectPopup;

        const objectPopup: Ref<HTMLElement | null> = ref(null);
        const resizeObserver: ResizeObserver = new ResizeObserver(() => checkWidthToHeightRatio());

        const showPopup: ComputedRef<boolean> = computed(() => props.show);

        const computedHeight: ComputedRef<string> = computed(() => props.height ? props.height : '80%');
        const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : '70%');

        const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ? props.minHeight : '0px');
        const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ? props.minWidth : '0px');

        const computedBeforeHeight: Ref<string> = ref(props.height);
        const computedBeforeWidth: Ref<string> = ref(props.width);

        const pulsingWidth: Ref<string> = ref(props.width);

        const computedGlassOpacity: ComputedRef<number> = computed(() => props.glassOpacity ? props.glassOpacity : 0.92);
        const doPreventClose: ComputedRef<boolean> = computed(() => props.preventClose === true);

        const closePopupFunc: ComputedRef<(saved: boolean) => void> = computed(() => props.closePopup);
        provide(ClosePopupFuncctionKey, closePopupFunc);

        const previousPrimaryColor: Ref<string> = ref('');
        const primaryColor: Ref<string> = ref('');

        const previousSecondaryColorOne: Ref<string> = ref('');
        const secondaryColorOne: Ref<string> = ref('');

        const previousSecondaryColorTwo: Ref<string> = ref('');
        const secondaryColorTwo: Ref<string> = ref('');

        const showDialog: Ref<boolean> = ref(true);

        function transitionColors()
        {
            let startColorTransitionTime: number;

            let currentPrimaryColor: string = '';
            let currentSecondaryColorOne: string = '';
            let currentSecondaryColorTwo: string = '';

            if (usePasswordColor())
            {
                currentPrimaryColor = app.userPreferences.currentColorPalette.p.p;
                currentSecondaryColorOne = app.userPreferences.currentColorPalette.p.o;
                currentSecondaryColorTwo = app.userPreferences.currentColorPalette.p.t;
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                currentPrimaryColor = app.userPreferences.currentColorPalette.v.p;
                currentSecondaryColorOne = app.userPreferences.currentColorPalette.v.o;
                currentSecondaryColorTwo = app.userPreferences.currentColorPalette.v.t;
            }

            let primaryColorTween = getColorTween(previousPrimaryColor.value, currentPrimaryColor, primaryColor)
            let secondaryColorOneTween = getColorTween(previousSecondaryColorOne.value, currentSecondaryColorOne, secondaryColorOne);
            let secondaryColorTwoTween = getColorTween(previousSecondaryColorTwo.value, currentSecondaryColorTwo, secondaryColorTwo);

            function animate(time: number)
            {
                if (!startColorTransitionTime)
                {
                    startColorTransitionTime = time;
                }

                const elapsedTime = time - startColorTransitionTime;
                if (elapsedTime < 1100)
                {
                    primaryColorTween?.update(time)
                    secondaryColorOneTween?.update(time);
                    secondaryColorTwoTween?.update(time);

                    requestAnimationFrame(animate);
                }
            }

            requestAnimationFrame(animate);

            previousPrimaryColor.value = currentPrimaryColor;
            previousSecondaryColorOne.value = currentSecondaryColorOne;
            previousSecondaryColorTwo.value = currentSecondaryColorTwo;
        }

        function getColorTween(prevHex: string, newHex: string, localColorVariable: Ref<string>)
        {
            const previousColor: RGBColor | null = hexToRgb(prevHex);
            const newColor: RGBColor | null = hexToRgb(newHex);

            if (!previousColor || !newColor)
            {
                return null;
            }

            return new TWEEN.Tween(previousColor).to(newColor, 1000).onUpdate((object) =>
            {
                localColorVariable.value = `rgb(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)})`;
            }).start();
        }

        function doClosePopup()
        {
            if (doPreventClose.value)
            {
                return;
            }

            hideAll();
            closePopupFunc.value(false);
        }

        function checkWidthToHeightRatio()
        {
            const info = objectPopup.value?.getBoundingClientRect();
            if (!info)
            {
                return;
            }

            if (info.height > info.width)
            {
                pulsingWidth.value = `${info.height}px`;
                computedBeforeHeight.value = `${info.height * ((info.height / info.width) + 1)}px`;
                computedBeforeWidth.value = `${info.width * ((info.height / info.width) + 1)}px`;
            }
            else
            {
                pulsingWidth.value = `${info.width}px`;
                computedBeforeHeight.value = `${info.height * ((info.width / info.height) + 1)}px`;
                computedBeforeWidth.value = `${info.width * ((info.width / info.height) + 1)}px`;
            }
        }

        function usePasswordColor()
        {
            return (app.activeAppView == AppView.Vault && app.activePasswordValuesTable == DataType.Passwords) || 
                (app.activeAppView == AppView.User && app.activeDeviceOrganizationsTable == DataType.Devices);
        }

        watch(() => app.activePasswordValuesTable, () =>
        {
            transitionColors();
        });

        watch(() => app.userPreferences.currentColorPalette, () =>
        {
            primaryColor.value = app.userPreferences.currentPrimaryColor.value;
            transitionColors();
        });

        onMounted(() =>
        {
            if (objectPopup.value)
            {
                resizeObserver.observe(objectPopup.value);
                checkWidthToHeightRatio();
            }

            previousPrimaryColor.value = app.userPreferences.currentPrimaryColor.value;
            primaryColor.value = app.userPreferences.currentPrimaryColor.value;

            if (usePasswordColor())
            {
                previousSecondaryColorOne.value = app.userPreferences.currentColorPalette.p.o;
                secondaryColorOne.value = app.userPreferences.currentColorPalette.p.o;

                previousSecondaryColorTwo.value = app.userPreferences.currentColorPalette.p.t;
                secondaryColorTwo.value = app.userPreferences.currentColorPalette.p.t;
            }
            else
            {
                previousSecondaryColorOne.value = app.userPreferences.currentColorPalette.v.o;
                secondaryColorOne.value = app.userPreferences.currentColorPalette.v.o;

                previousSecondaryColorTwo.value = app.userPreferences.currentColorPalette.v.t;
                secondaryColorTwo.value = app.userPreferences.currentColorPalette.v.t;
            }

            transitionColors();
        });

        return {
            objectPopup,
            primaryColor,
            secondaryColorOne,
            secondaryColorTwo,
            showPopup,
            computedHeight,
            computedWidth,
            computedGlassOpacity,
            doPreventClose,
            computedBeforeHeight,
            computedBeforeWidth,
            computedMinHeight,
            computedMinWidth,
            pulsingWidth,
            showDialog,
            zIndex: popupInfo.zIndex,
            doClosePopup,
        };
    }
})
</script>

<style scoped>
.objectPopupContainer {
    /* do position fixed instead of absolute so that dropdowns work and they don't have the bug where they shift everything to the left */
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: v-bind(zIndex);
    top: 0;
    left: 0;
}

.objectPopupGlass {
    position: absolute;
    width: 105%;
    height: 105%;
    z-index: 5;
    top: 0;
    left: -3%;
    background: rgba(17, 15, 15, v-bind(computedGlassOpacity));
}

.objectyPopup {
    height: v-bind(computedHeight);
    width: v-bind(computedWidth);
    min-height: v-bind(computedMinHeight);
    min-width: v-bind(computedMinWidth);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    aspect-ratio: 1.3 / 1.5;
    background: var(--app-color);
    border-radius: 0.5rem;
    position: fixed;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    z-index: 7;
    transition: 0.3s;
}

.objectyPopup::before {
    content: "";
    position: absolute;
    height: v-bind(computedBeforeHeight);
    width: v-bind(computedBeforeWidth);
    border-radius: inherit;
    background-image: linear-gradient(0,
            v-bind(primaryColor),
            v-bind(secondaryColorOne),
            v-bind(secondaryColorTwo));
    animation: rotate 3s linear infinite;
    z-index: 7;
    transition: 0.3s;
}

.objectyPopup .closeIconContainer {
    position: absolute;
    top: 3%;
    right: 3%;
    transition: 0.3s;
    z-index: 9;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}

.objectyPopup .closeIconContainer:hover {
    transform: scale(1.05);
}

.objectyPopup .closeIconContainer .closeIcon {
    transition: 0.3s;
    color: white;
    font-size: clamp(25px, 1.5vw, 40px);
}

.objectyPopup .closeIconContainer:hover .closeIcon {
    color: v-bind(primaryColor);
}

.objectyPopup .objectyPopupContent {
    position: absolute;
    inset: 5px;
    background: var(--app-color);
    border-radius: 16px;
    z-index: 8;
}

.pulsingCircles {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: v-bind(pulsingWidth);
    max-width: 80%;
    max-height: 80%;
    aspect-ratio: 1 / 1;
    z-index: 6;
    transition: 0.3s;
}

.pulsingCircles.unlocked {
    opacity: 0;
}

.pulsingCircles .circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background-color: v-bind(primaryColor);
    animation: growAndFade 6s infinite ease-out;
}

.pulsingCircles .circle.circleOne {
    animation-delay: 0s;
}

.pulsingCircles .circle.circleTwo {
    animation-delay: 2s;
}

.pulsingCircles .circle.circleThree {
    animation-delay: 4s;
}
</style>
