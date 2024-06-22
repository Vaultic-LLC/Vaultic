<template>
    <div>
        <div class="smallMetricContainer" ref="smallMetricContainer" :key="key" @click="onClick"
            :class="{ active: active, pulse: pulse }">
            <h2 class="smallMetricContainer__amount">{{ amountOutOfTotal }}</h2>
            <div class="smallMetricContainer__title">{{ model.title }}</div>
            <Doughnut ref="doughnutChart" :data="data" :options="options" />
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import { Doughnut } from 'vue-chartjs'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { mixHexes } from '../../Helpers/ColorHelper';
import animationHelper from '../../Helpers/animationHelper';
import { stores } from '../../Objects/Stores';

ChartJS.register(ArcElement, Tooltip, Legend)

export default defineComponent({
    name: "SmallMetricGauge",
    props: ['model'],
    components:
    {
        Doughnut
    },
    setup(props)
    {
        const key: Ref<string> = ref('');
        const doughnutChart: Ref<any> = ref(null);
        const primaryColor: Ref<string> = ref(props.model.color);
        const gauge: Ref<HTMLElement | null> = ref(null);
        const smallMetricContainer: Ref<HTMLElement | null> = ref(null);
        const active: ComputedRef<boolean> = computed(() => props.model.active);
        const pulseColor: ComputedRef<string> = computed(() => props.model.pulseColor ? props.model.pulseColor : props.model.color);
        const pulse: ComputedRef<boolean> = computed(() =>
        {
            if (props.model.pulse === false || active.value)
            {
                return false;
            }

            return props.model.pulse === true || (props.model.filledAmount / props.model.totalAmount * 100 >= stores.settingsStore.percentMetricForPulse);
        });

        const totalAmount: ComputedRef<number> = computed(() => props.model.totalAmount == 0 ? 1 : props.model.totalAmount);
        let fillAmount: ComputedRef<number> = computed(() => props.model.totalAmount == 0 ? 0 : props.model.filledAmount / props.model.totalAmount * 100);
        let amountOutOfTotal: ComputedRef<string> = computed(() => `${props.model.filledAmount} / ${props.model.totalAmount}`);
        const textColor: Ref<string> = computed(() => fillAmount.value == 0 ? "white" : "white");
        const textWidth: ComputedRef<string> = computed(() =>
        {
            const digits = props.model.filledAmount.toString().length + props.model.totalAmount.toString().length;
            if (digits > 5)
            {
                return "1vw";
            }
            else if (digits > 4)
            {
                return "1.25vw";
            }

            return "1.5vw";
        });

        const options: any =
        {
            resposive: true,
            animation:
            {
                duration: 1000,
                easing: 'linear'
            },
            plugins: {
                legend:
                {
                    display: false
                },
                tooltip:
                {
                    enabled: false
                }
            },
            cutout: '90%'
        };

        const data: Ref<any> =
            ref({
                labels: [props.model.title, ""],
                datasets: [
                    {
                        data: [props.model.filledAmount, totalAmount.value - props.model.filledAmount],
                        //backgroundColor: [primaryColor.value, '#191919'],
                        backgroundColor: function (context)
                        {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;

                            if (!chartArea)
                            {
                                // This case happens on initial chart load
                                return;
                            }

                            // let gradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);
                            const x = chartArea.width / 2;
                            let gradient = ctx.createRadialGradient(x, x, 0, x, x, x);
                            gradient.addColorStop(0, mixHexes(primaryColor.value, '#867E7E'));
                            //gradient.addColorStop(fillAmount.value / 100 / 2, primaryColor.value);
                            //gradient.addColorStop(fillAmount.value / 100, mixHexes(primaryColor.value, '#363131'));
                            gradient.addColorStop(1, primaryColor.value);
                            // hex value already has opacity
                            // if (primaryColor.value.length > 7)
                            // {
                            // 	gradient.addColorStop(0, primaryColor.value);
                            // 	gradient.addColorStop(0.35, primaryColor.value);
                            // 	gradient.addColorStop(1, primaryColor.value);
                            // }
                            // else
                            // {
                            // 	gradient.addColorStop(0, primaryColor.value + "88");
                            // 	gradient.addColorStop(0.35, primaryColor.value + "44");
                            // 	gradient.addColorStop(1, primaryColor.value + "00");
                            // }

                            return [gradient, '#191919'];
                        },
                        borderColor: 'transparent',
                    }
                ]

            });

        function updateData()
        {
            if (!doughnutChart?.value?.chart?.data?.datasets[0]?.data)
            {
                return;
            }

            doughnutChart.value.chart.data.datasets[0].data = [props.model.filledAmount, props.model.totalAmount - props.model.filledAmount];
            doughnutChart.value.chart.data.datasets[0].backgroundColor = [primaryColor.value, '#191919'];
            doughnutChart.value.chart.data.datasets[0].borderColor = 'transparent';

            doughnutChart.value.chart.update();
        }

        async function onClick()
        {
            props.model.onClick();
            syncAnimations();
        }

        function syncAnimations()
        {
            // use a timeout so the animation actually starts. Otherwise it won't be found
            setTimeout(() => animationHelper.syncAnimations('pulseMetricGauge'), 100);
        }

        watch(() => props.model.color, (newValue) =>
        {
            primaryColor.value = newValue;
            updateData();
            syncAnimations();
        });

        watch(() => props.model.filledAmount, () =>
        {
            updateData();
            syncAnimations();
        });

        watch(() => pulse.value, (newValue) =>
        {
            if (newValue)
            {
                syncAnimations();
            }
        });

        onMounted(() =>
        {
            if (pulse.value)
            {
                syncAnimations();
            }
        });

        return {
            doughnutChart,
            key,
            active,
            smallMetricContainer,
            gauge,
            primaryColor,
            fillAmount,
            amountOutOfTotal,
            textColor,
            options,
            data,
            pulse,
            pulseColor,
            textWidth,
            onClick
        }
    }
})
</script>

<style scoped>
.smallMetricContainer {
    position: relative;
    width: clamp(67px, 6vw, 150px);
    aspect-ratio: 1 / 1;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    border-radius: 50%;
    cursor: pointer;
    transition: 0.3s;
    box-shadow: 0 0 0 v-bind(primaryColor);
}

.smallMetricContainer.active {
    box-shadow: 0 0 25px v-bind(primaryColor);
}

.smallMetricContainer.pulse {
    animation: pulseMetricGauge 1s infinite;
}

.smallMetricContainer:hover {
    box-shadow: 0 0 25px v-bind(primaryColor);
}

.smallMetricGaugeProgress {
    position: relative;
    height: auto;
    width: 100%;
    aspect-ratio: 1 /1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.6s;
}

.smallMetricGaugeProgress::before {
    content: "";
    position: absolute;
    height: 84%;
    width: 84%;
    background-color: var(--app-color);
    border-radius: inherit;
}

@keyframes pulseMetricGauge {
    0% {
        box-shadow: 0 0 0 v-bind(pulseColor);
    }

    50% {
        box-shadow: 0 0 25px v-bind(pulseColor);
    }

    100% {
        box-shadow: 0 0 0 v-bind(pulseColor);
    }
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

.smallMetricContainer__amount {
    width: 80%;
    opacity: 0;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -65%);
    color: v-bind(textColor);
    font-weight: 700;
    font-size: clamp(12px, v-bind(textWidth), 36px);
    transition: 0.2s;
    user-select: none;
    animation: fadeIn 1s linear forwards;
    animation-delay: 1s;
}

.smallMetricContainer__title {
    opacity: 0;
    position: absolute;
    top: 106%;
    font-weight: 300;
    font-size: clamp(8px, 0.6vw, 36px);
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.75);
    transition: 0.2s;
    user-select: none;
    animation: fadeIn 1s linear forwards;
    animation-delay: 1s;
}

.smallMetricContainer__checkmark {
    color: v-bind(primaryColor);
    font-size: 50px;
}
</style>
