<template>
    <div class="calendarWidgetContainer">
        <div class="calendarWidgetContainer__title">
            <h2>
                Recent Logins
            </h2>
        </div>
        <Calendar transparent expanded borderless :isDark="true" :color="'gray'" :attributes="attributes" />
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { Calendar } from 'v-calendar-tw';

import 'v-calendar-tw/style.css';
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "LoginHistoryCalendar",
    components:
    {
        Calendar,
    },
    props: ['refresh'],
    setup()
    {
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const attributes = computed(() =>
        {
            let attr: any[] = [];
            Object.keys(app.currentVault.loginHistory).forEach(day =>
            {
                attr.push(...app.currentVault.loginHistory[day].map((l) =>
                {
                    return {
                        key: l,
                        dates: [l],
                        dot: true,
                        popover: {
                            label: new Date(l).toLocaleTimeString(),
                            visibility: "hover"
                        },
                    }
                }));
            });

            return attr;
        });

        return {
            attributes,
            color
        }
    }
})
</script>
<style>
.calendarWidgetContainer {
    background-color: rgb(44 44 51 / 16%);
    border-radius: 20px;
    padding-top: 2%;
}

.calendarWidgetContainer__title {
    color: white;
    font-size: clamp(10px, 0.8vw, 17px);
}

.vc-weekday {
    color: white;
}

.vc-dot {
    transition: 0.3s;
    background-color: v-bind(color);
}

.vc-container button {
    background-color: transparent !important;
    font-family: inherit;
}

.vc-nav-container button {
    font-family: inherit;
}

.vc-nav-item.is-active {
    border: 1px solid v-bind(color) !important;
}

.vc-nav-container button:not(.is-active) {
    background-color: transparent !important;
    color: white !important;
}

.vc-dark {
    --vc-focus-ring: 0 0 0 2px v-bind(color);
}

.vc-container {
    width: 100%
}

.vc-dots {
    flex-wrap: wrap;
    row-gap: 2px;
}

.vc-day-layer {
    bottom: auto;
    top: 80%;
}

.vc-header {
    margin-top: clamp(0px, 0.2vw, 10px);
    margin-bottom: clamp(0px, 0.2vw, 10px);
}

.vc-header .vc-arrow {
    width: clamp(10px, 1.5vw, 28px);
    height: clamp(12px, 1.5vw, 30px);
}

.vc-header .vc-title {
    font-size: clamp(10px, 0.7vw, 15px);
}

.vc-day {
    min-height: 0px;
}

.vc-weekday {
    padding: 0;
    font-size: clamp(7px, 0.75vw, 14px);
}

.vc-day-content {
    height: clamp(13px, 3vh, 45px);
    font-size: clamp(7px, 0.75vw, 14px);
}

@media (max-height: 1180px) {
    .vc-day-content {
        height: clamp(13px, 2.5vh, 45px);
    }
}

@media (max-height: 750px) {
    .vc-day-content {
        height: clamp(13px, 1.8vh, 45px);
    }
}

.vc-dots {
    width: clamp(3px, 0.2vw, 5px);
    height: clamp(3px, 0.5vw, 6px);
    overflow: hidden;
}

.vc-dot {
    width: clamp(3px, 0.2vw, 5px);
    height: clamp(3px, 0.2vw, 5px);
    margin-right: 0px !important;
    margin-top: clamp(0px, 0.2vw, 1px);
}
</style>
