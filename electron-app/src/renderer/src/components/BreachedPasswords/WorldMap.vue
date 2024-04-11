<template>
    <div :key="refreshKey" class="worldMapContainer">
        <!-- <svg class="worldMapContainer__map" width="400" height="400">

		</svg> -->
        <canvas ref="canvasElement" id="worldMapCanvas" class="worldMapContainer__map" :width="width" :height="height">
        </canvas>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import * as d3 from "d3";
import countries from "../../assets/Files/world.json";
import * as TWEEN from '@tweenjs/tween.js'
import { RGBColor } from '@renderer/Types/Colors';
import { hexToRgb, rgbToHex, toSolidHex } from '@renderer/Helpers/ColorHelper';
import { tween } from '@renderer/Helpers/TweenHelper';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
    name: "WorldMap",
    props: ['scan'],
    setup(props)
    {
        const canvasElement: Ref<HTMLCanvasElement | null> = ref(null);
        const refreshKey: Ref<string> = ref('');
        const color: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor);
        const width: Ref<number> = ref(500);
        const height: Ref<number> = ref(300);
        const resizeObserver: ResizeObserver = new ResizeObserver(() => init());
        let colorTransitionTween: any;
        let pulseTween: any;
        let endPulseTween: boolean = false;
        let previousColor: RGBColor | null = hexToRgb(color.value);
        let pulsingInterval: NodeJS.Timeout | null = null;
        let firstInit: boolean = false;

        function clearCurrentScans()
        {
            if (pulsingInterval != null)
            {
                clearInterval(pulsingInterval);
            }

            if (pulseTween)
            {
                //endPulseTween = true;
                pulseTween.end();
            }
        }

        function init()
        {
            if (canvasElement.value == null)
            {
                return;
            }

            if (!canvasElement.value.parentElement)
            {
                return;
            }

            clearCurrentScans();

            width.value = canvasElement.value.parentElement.offsetWidth;
            height.value = canvasElement.value.parentElement.offsetHeight;

            // Set a projection for the map. Projection = transform a lat/long on a position on the 2d map.
            var projection = d3.geoNaturalEarth1()
                .scale(width.value / 1.7 / Math.PI)
                .translate([width.value / 2, height.value / 2])

            // Get the 'context'
            var ctx = canvasElement.value.getContext('2d');
            if (ctx == null)
            {
                return;
            }

            // geographic path generator for given projection and canvas context
            const pathGenerator = d3.geoPath(projection, ctx);
            ctx.beginPath();
            pathGenerator(countries);

            const newRGB: RGBColor | null = hexToRgb(color.value);
            if (!newRGB || !previousColor)
            {
                return;
            }

            let startColorTransitionTime: number;
            colorTransitionTween = new TWEEN.Tween(previousColor).to(newRGB, 1000).onUpdate((object) =>
            {
                ctx?.reset();

                const pathGenerator = d3.geoPath(projection, ctx);
                ctx!.beginPath();
                pathGenerator(countries);

                ctx!.fillStyle = getGradient(object);
                //ctx!.fillStyle = rgbToHex(Math.round(object.r), Math.round(object.g), Math.round(object.b));
                ctx!.fill();

                // ctx!.strokeStyle = "#282525";
                // ctx!.stroke()
            }).start()
            // .onComplete(() =>
            // {
            // 	startPulsing();
            // })

            function animate(time)
            {
                if (!startColorTransitionTime)
                {
                    startColorTransitionTime = time;
                }

                const elapsedTime = time - startColorTransitionTime;
                if (elapsedTime < 1100)
                {
                    colorTransitionTween.update(time)
                    requestAnimationFrame(animate);
                }
            }

            function getGradient(newColor: RGBColor): CanvasGradient
            {
                let gradient = ctx!.createLinearGradient(0, height.value / 2, width.value + 10, height.value / 2);

                let hex: string = rgbToHex(Math.round(newColor.r), Math.round(newColor.g), Math.round(newColor.b));

                gradient.addColorStop(0, `rgba(${newColor.r}, ${newColor.g}, ${newColor.b}, ${newColor.alpha})`);
                gradient.addColorStop(1, hex + "11");

                return gradient;
            }

            function startPulsing()
            {
                pulsingInterval = setInterval(() =>
                {
                    let startPulsingTime: number;
                    pulseTween = new TWEEN.Tween({ x: 0 }).to({ x: 1.0 }, 2000).onUpdate((object) =>
                    {
                        if (endPulseTween)
                        {
                            return;
                        }

                        ctx?.reset();

                        var proj = d3.geoNaturalEarth1()
                            .scale(width.value / 1.7 / Math.PI)
                            .translate([width.value / 2, height.value / 2])

                        const pathGenerator = d3.geoPath(proj, ctx);
                        ctx!.beginPath();
                        pathGenerator(countries);

                        ctx!.fillStyle = getPulse(object.x);
                        ctx!.fill();

                        // ctx!.strokeStyle = "#000000";
                        // ctx!.stroke()

                    }).easing(TWEEN.Easing.Cubic.Out).start()

                    function animatePulse(time)
                    {
                        if (!startPulsingTime)
                        {
                            startPulsingTime = time;
                        }

                        const elapsedTime: number = time - startPulsingTime;
                        if (elapsedTime < 2100)
                        {
                            pulseTween.update(time)
                            requestAnimationFrame(animatePulse);
                        }
                    }

                    function getPulse(x: number)
                    {
                        let gradient = ctx!.createLinearGradient(0, height.value / 2, width.value + 10, height.value / 2);

                        let tempClr: string = toSolidHex(color.value);

                        // TODO: This needs to end the same as the other gradient
                        gradient.addColorStop(0, tempClr);
                        gradient.addColorStop(Math.max(x - 0.01, 0), tempClr + "11");
                        gradient.addColorStop(Math.max(x - 0.01, 0), tempClr);
                        gradient.addColorStop(Math.min(x + 0.01, 1), tempClr);
                        gradient.addColorStop(1, tempClr + "11");

                        return gradient;
                    }

                    requestAnimationFrame(animatePulse)
                }, 2000)
            }

            function tweenColor(to: string, from: string)
            {
                let tweenTo: RGBColor | null = hexToRgb(to);
                let tweenFrom: RGBColor | null = hexToRgb(from);

                tween<RGBColor>(tweenFrom!, tweenTo!, 500, (object) =>
                {
                    ctx?.reset();

                    var proj = d3.geoNaturalEarth1()
                        .scale(width.value / 1.7 / Math.PI)
                        .translate([width.value / 2, height.value / 2])

                    const pathGenerator = d3.geoPath(proj, ctx);
                    ctx!.beginPath();
                    pathGenerator(countries);

                    ctx!.fillStyle = getGradient(object);
                    ctx!.fill();
                });
            }

            if (firstInit)
            {
                watch(() => props.scan, (newValue) =>
                {
                    clearCurrentScans();
                    if (newValue)
                    {
                        startPulsing();
                    }
                });

                watch(() => color.value, (newValue, oldValue) =>
                {
                    tweenColor(newValue, oldValue);
                });
            }

            requestAnimationFrame(animate);
            previousColor = hexToRgb(color.value);
            endPulseTween = false;
        }

        onMounted(() =>
        {
            firstInit = true;
            if (canvasElement.value && canvasElement.value.parentElement)
            {
                resizeObserver.observe(canvasElement.value.parentElement)
            }

            init();

            firstInit = false;
        });

        return {
            color,
            refreshKey,
            width,
            height,
            canvasElement
        }
    }
})
</script>
<style>
.worldMapContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
}
</style>
