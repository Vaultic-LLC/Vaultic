<template>
	<div class="calendarWidgetContainer">
		<h2 class="calendarWidgetContainer__title">
			Recent Logins
		</h2>
		<Calendar transparent expanded borderless :isDark="true" :color="'gray'" :attributes="attributes" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { Calendar } from 'v-calendar';

import 'v-calendar/style.css';
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
		const attributes = computed(() => stores.appStore.loginHistory.map(l =>
		{
			return {
				dates: [l.datetime],
				dot: true,
				popover: {
					label: new Date(l.datetime).toLocaleTimeString(),
				},
			}
		}));

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
	margin-top: 20px;
	color: white;
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
</style>
