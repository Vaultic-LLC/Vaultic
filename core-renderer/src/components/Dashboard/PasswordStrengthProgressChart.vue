<template>
    <div class="strengthGraphContainer">
        <div class="strengthGraphContainer__header">
            <div v-if="canLoadWidget" class="strengthGraphContainer__resetButton" @click="reset">
                Reset
            </div>
            <div class="strengthGraphContainer__title">
                <h2>Security Over Time</h2>
            </div>
        </div>
        <div v-if="!canLoadWidget" class="strengthGraphContainer__chart">
            <WidgetSubscriptionMessage />
        </div>
        <div v-else-if="!failedToLoad" ref="chartContainer" class="strengthGraphContainer__chart">
            <Transition name="fade" mode="out-in">
                <div :key="key" v-if="showStatusMessage" class="strengthGraphContainer__noData">
                    {{ statusMessage }}
                </div>
            </Transition>
            <Transition name="fade" mode="out-in">
                <div v-if="loading" class="strengthGraphContainer__loadingIndicator">
                    <div>Loading</div>
                    <LoadingIndicator :color="color" />
                </div>
            </Transition>
            <Line class="strengthGraphContainer__chartCanvas" :key="refreshKey" ref="lineChart" :data="data"
                :options="options">
            </Line>
        </div>
        <div v-else class="strengthGraphContainer__chart">
            <WidgetErrorMessage :message="'Unable to load Chart Data at this time. Please try again later'" />
        </div>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, watch, toRaw, onUnmounted, ComputedRef, computed } from 'vue';

import LoadingIndicator from '../Loading/LoadingIndicator.vue';
import WidgetSubscriptionMessage from '../Widgets/WidgetSubscriptionMessage.vue'; 
import WidgetErrorMessage from '../Widgets/WidgetErrorMessage.vue';

import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler } from "chart.js"
import { Line } from "vue-chartjs"
import { hexToRgb, mixHexes, rgbToHex, toSolidHex } from '../../Helpers/ColorHelper';
import zoomPlugin from 'chartjs-plugin-zoom';
import { tween } from '../../Helpers/TweenHelper';
import { RGBColor } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";
import { api } from '../../API';
import { DataType } from '../../Types/DataTypes';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, zoomPlugin)

export default defineComponent({
    name: "PasswordStrengthProgressChart",
    components:
    {
        Line,
        LoadingIndicator,
        WidgetErrorMessage,
        WidgetSubscriptionMessage
    },
    setup()
    {
        const failedToLoad: Ref<boolean> = ref(false);
        const canLoadWidget: ComputedRef<boolean> = computed(() => app.canShowSubscriptionWidgets.value);

        const loading: Ref<boolean> = ref(false);
        const refreshKey: Ref<string> = ref('');
        const key: Ref<string> = ref('');
        const chartContainer: Ref<HTMLElement | null> = ref(null);
        const lineChart: Ref<any> = ref(null);

        const color: Ref<string> = ref(app.activePasswordValuesTable == DataType.Passwords ?
            app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value : app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value);

        let lableArray: Ref<number[]> = ref([...app.currentVault.passwordStore.currentAndSafePasswordsCurrent]);
        let chartOneArray: Ref<number[]> = ref([...app.currentVault.passwordStore.currentAndSafePasswordsSafe]);

        let table: Ref<string> = ref(app.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values")
        let target: Ref<(number | undefined)[]> = ref(app.currentVault.passwordStore.currentAndSafePasswordsCurrent.map(_ => app.currentVault.passwordStore.passwords.length));
        let max: Ref<number> = ref(Math.max(...app.currentVault.passwordStore.currentAndSafePasswordsSafe));

        const resizeObserver: ResizeObserver = new ResizeObserver(refreshChart);

        let options: Ref<any> = ref({});

        const showStatusMessage: Ref<boolean> = ref(false);
        const statusMessage: Ref<string> = ref('');

        const data: Ref<any> = ref({
            labels: toRaw(lableArray.value),
            datasets: getDataset()
        });

        function updateData(newColor?: string, oldColor?: string)
        {
            if (!lineChart.value)
            {
                return;
            }

            lineChart.value.chart.options.animation.duration = 1000;
            lineChart.value.chart.update();

            lineChart.value.chart.data.labels = toRaw(lableArray.value);
            lineChart.value.chart.data.datasets[0].data = chartOneArray.value;
            lineChart.value.chart.data.datasets[0].label = 'Secure ' + table.value;

            lineChart.value.chart.data.datasets[1].data = target.value;

            lineChart.value.chart.options.scales.y.max = max.value;

            if (newColor && oldColor)
            {
                updateColors(newColor, oldColor, 500);
            }
            else
            {
                lineChart.value.chart.update();
            }
        }

        function updateColors(newColor: string, oldColor: string, length: number)
        {
            if (!lineChart.value)
            {
                return;
            }

            const from: RGBColor | null = hexToRgb(oldColor);
            const to: RGBColor | null = hexToRgb(newColor);

            lineChart.value.chart.options.animation.duration = length;
            lineChart.value.chart.update();

            tween<RGBColor>(from!, to!, 500, (object) =>
            {
                // this becomes null for some reason on first load
                if (!lineChart.value)
                {
                    return;
                }

                object.r = Math.round(object.r);
                object.g = Math.round(object.g);
                object.b = Math.round(object.b);

                const hexColor: string = rgbToHex(object.r, object.g, object.b);
                setChartColorsAndUpdate(`rgba(${object.r}, ${object.g}, ${object.b}, ${object.alpha})`, hexColor, hexColor);
            });
        }

        function setChartColorsAndUpdate(chartOneBorderColor: string, chartTwoBorderColor: string, backgroundColor: string)
        {
            if (!lineChart.value)
            {
                return;
            }

            lineChart.value.chart.data.datasets[0].borderColor = chartOneBorderColor;
            lineChart.value.chart.data.datasets[1].borderColor = mixHexes(chartTwoBorderColor, "888888");

            lineChart.value.chart.data.datasets[0].backgroundColor = getGradient(lineChart.value.chart, backgroundColor);

            lineChart.value.chart.update();
        }

        // should only be called when first loading. Otherwise just update the options through the line chart
        function setOptions(animationTime: number)
        {
            let boxSize = getBoxWidthAndHeight();
            if (!boxSize)
            {
                boxSize = [defaultLegendBoxWidth, defaultLegendBoxHeight];
            }

            options.value = {
                responsive: true,
                maintainAspectRatio: false,
                elements:
                {
                    point:
                    {
                        radius: 10
                    }
                },
                animation:
                {
                    duration: animationTime,
                    easing: 'linear'
                },
                plugins:
                {
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        labels: {
                            boxWidth: boxSize[0],
                            boxHeight: boxSize[1],
                            padding: 10
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: false
                            },
                            drag: {
                                enabled: false
                            },
                            mode: 'xy',
                            scaleMode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            scaleMode: 'xy'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            // color: appHexColor()
                        }
                    },
                    y: {
                        max: max.value,
                        min: -0.1,
                        grid: {
                            // color: appHexColor()
                        }
                    }
                }
            };
        }

        function getDataset()
        {
            return [
                {
                    label: 'Secure ' + table.value,
                    data: [],
                    backgroundColor: function (context: any)
                    {
                        const chart = context.chart;
                        return getGradient(chart, color.value);
                    },
                    fill: true,
                    borderColor: color.value,
                    pointBackgroundColor: color.value,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: "Target",
                    data: [],
                    borderColor: mixHexes(color.value, "888888"),
                    fill: false,
                    pointBackgroundColor: mixHexes(color.value, "888888"),
                    pointRadius: 0,
                    tension: 0.4,
                    hidden: true,
                }
            ]
        }

        const defaultLegendBoxWidth = 35;
        const defaultLegendBoxHeight = 10;
        const maxChartContainerWidth = 538;

        function getBoxWidthAndHeight(): [number, number] | undefined
        {
            const info = chartContainer.value?.getBoundingClientRect();
            if (info)
            {
                const ratio = info.width / maxChartContainerWidth;
                return [defaultLegendBoxWidth * ratio, defaultLegendBoxHeight * ratio]
            }

            return undefined;
        }

        async function refreshChart()
        {
            // this fixes the bug where the graph won't resize correctly when clicking the minimize / expand button in the top toolbar
            await new Promise((resolve) => setTimeout(resolve, 100));
            const info = chartContainer.value?.getBoundingClientRect();
            if (info)
            {
                const boxSize = getBoxWidthAndHeight();
                if (boxSize)
                {
                    lineChart.value.chart.options.plugins.legend.labels.boxWidth = boxSize[0];
                    lineChart.value.chart.options.plugins.legend.labels.boxHeight = boxSize[1];
                    reset();
                }
            }
        }

        function getGradient(chart: any, hexColor: string)
        {
            const { ctx, chartArea } = chart;

            if (!chartArea)
            {
                // This case happens on initial chart load
                return;
            }

            let gradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);

            // hex value already has opacity, remove it
            hexColor = toSolidHex(hexColor);

            gradient.addColorStop(0, hexColor + "88");
            gradient.addColorStop(0.35, hexColor + "44");
            gradient.addColorStop(1, hexColor + "00");

            return gradient;
        }

        function reset()
        {
            setOptions(500);
            updateData(color.value, color.value);
        }

        // TODO: I should cache the data instead of requesting it every time the table chanages. 
        // only re request it if the data actually changes
        async function recalcData()
        {
            if (!app.isOnline)
            {
                return;
            }

            let newColor: string = "";
            let requestData: { Values: { current: number[], safe: number[]} } = { Values: { current: [], safe: [] } };
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                // no need to send the request since we don't have enough data anyways
                if (app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length < 2)
                {
                    // make sure there isn't any old data in the way of the message
                    chartOneArray.value = [];
                    updateData();

                    return;
                }

                requestData.Values = 
                {
                    current: app.currentVault.passwordStore.currentAndSafePasswordsCurrent,
                    safe: app.currentVault.passwordStore.currentAndSafePasswordsSafe
                };

                newColor = app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value;
                table.value = "Passwords";
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                // no need to send the request since we don't have enough data anyways
                if (app.currentVault.valueStore.currentAndSafeValuesCurrent.length < 2)
                {
                    // make sure there isn't any old data in the way of the message
                    chartOneArray.value = [];
                    updateData();

                    return;
                }

                requestData.Values = 
                { 
                    current: app.currentVault.valueStore.currentAndSafeValuesCurrent,
                    safe: app.currentVault.valueStore.currentAndSafeValuesSafe
                };
                
                newColor = app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value;
                table.value = "Values";
            }

            loading.value = true;
            const response = await api.server.user.getChartData(JSON.stringify(requestData));
            loading.value = false;

            if (response.Success)
            {
                failedToLoad.value = false;
                showStatusMessage.value = false;
                statusMessage.value = "";

                lableArray.value = response.ChartData!.Y;
                chartOneArray.value = response.ChartData!.DataX;
                target.value = response.ChartData!.TargetX;
                max.value = response.ChartData!.Max;
            }
            else
            {
                failedToLoad.value = true;

                chartOneArray.value = [];
                updateData();
            }

            // if the previous chart didn't have enough data, then the chart won't be loaded. Set a timeout so the chart
            // can load and then update to the new data
            setTimeout(() =>
            {
                setChartColorsAndUpdate(newColor, newColor, newColor);
                color.value = newColor;

                updateData();
            }, 1);
        }

        function onDataChange()
        {
            recalcData();
        }

        watch(() => app.activePasswordValuesTable, () =>
        {
            recalcData();
        });

        watch(() => app.userPreferences.currentColorPalette, (newValue, oldValue) =>
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                updateColors(newValue.passwordsColor.value.primaryColor.value, oldValue.passwordsColor.value.primaryColor.value, 0);
                color.value = newValue.passwordsColor.value.primaryColor.value;
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                updateColors(newValue.valuesColor.value.primaryColor.value, oldValue.valuesColor.value.primaryColor.value, 0);
                color.value = newValue.valuesColor.value.primaryColor.value;
            }
        });

        watch(() => statusMessage.value, () =>
        {
            key.value = Date.now().toString();
        });

        watch(() => chartOneArray.value.length, (newValue) =>
        {
            if (newValue <= 1)
            {
                showStatusMessage.value = true;
                statusMessage.value = `Not enough data. Add at least 2 ${app.activePasswordValuesTable == DataType.Passwords ? "Passwords" : "Values"} to get started.`;
            }
        });

        onMounted(() =>
        {
            if (chartContainer.value)
            {
                resizeObserver.observe(chartContainer.value)
            }

            app.currentVault.passwordStore.addEvent("onChanged", onDataChange);
            app.currentVault.valueStore.addEvent("onChanged", onDataChange);
        });

        onUnmounted(() =>
        {
            app.currentVault.passwordStore.removeEvent("onChanged", onDataChange);
            app.currentVault.valueStore.removeEvent("onChanged", onDataChange);
        });

        setOptions(1000);

        return {
            canLoadWidget,
            lineChart,
            chartContainer,
            key,
            options,
            data,
            color,
            showStatusMessage,
            statusMessage,
            refreshKey,
            loading,
            updateData,
            reset
        }
    }
}) as any;
</script>

<style>
.strengthGraphContainer {
    width: 100%;
    height: 100%;
    border-radius: 20px;
    background: rgb(44 44 51 / 16%);
    padding-top: 0.7vw;
}

.strengthGraphContainer__header {
    display: flex;
    justify-content: center;
}

.strengthGraphContainer__resetButton {
    position: absolute;
    top: 5%;
    left: 2%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    width: 13%;
    min-width: 38px;
    height: 7%;
    color: white;
    border-radius: clamp(7px, 0.4vw, 0.425rem);
    border: clamp(1.5px, 0.1vw, 2px) solid v-bind(color);
    transition: 0.3s;
    font-size: clamp(10px, 0.7vw, 17px);
    cursor: pointer;
}

.strengthGraphContainer__resetButton:hover {
    box-shadow: 0 0 25px v-bind(color);
}

.strengthGraphContainer__title {
    width: 75%;
    color: white;
    font-size: clamp(10px, 0.8vw, 17px);
}

.strengthGraphContainer__chart {
    position: relative;
    height: 84%;
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 0.3vw;
}

.strengthGraphContainer__noData {
    position: absolute;
    color: gray;
    text-align: center;
    font-size: clamp(12px, 1.3vw, 25px);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
}

.strengthGraphContainer__loadingIndicator {
    color: white;
    width: 50%;
    height: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.strengthGraphContainer__chartCanvas {
    width: 100% !important;
    height: 100% !important;
}
</style>
