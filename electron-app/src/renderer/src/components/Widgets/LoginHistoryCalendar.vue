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
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "LoginHistoryCalendar",
	components:
	{
		Calendar,
	},
	setup()
	{
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		const attributes = computed(() =>
		{
			let attr: any[] = [];
			Object.keys(stores.appStore.loginHistory).forEach(day =>
			{
				attr.push(...stores.appStore.loginHistory[day].map((l) =>
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

.vc-dots {
	flex-wrap: wrap;
	row-gap: 2px;
}

.vc-day-layer {
	bottom: auto;
	top: 80%;
}

.vc-header {
	margin-top: 0px;
}

.vc-header .vs-arrow {
	width: clamp(10px, 1.5vw, 28px);
	height: clamp(12px, 1.5vw, 30px);
}

.vc-weekday {
	padding: 0;
	font-size: clamp(7px, 0.75vw, 14px);
}

.vc-day-content {
	height: clamp(10px, 1.8vh, 28px);
	font-size: clamp(7px, 0.75vw, 14px);
}
</style>
