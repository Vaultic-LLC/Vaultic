<template>
	<div class="menuWidgetContainer">
		<LockIconCard id="lockIconCard" />
		<SettingsIconCard id="settingsIconCard" />
		<AboutIconCard id="aboutIconCard" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import LockIconCard from './LockIconCard.vue';
import SettingsIconCard from './SettingsIconCard.vue';
import AboutIconCard from './AboutIconCard.vue';

export default defineComponent({
	name: "MenuWidget",
	components:
	{
		LockIconCard,
		SettingsIconCard,
		AboutIconCard
	},
	setup()
	{
	}
})
</script>
<style>
.menuWidgetContainer {
	position: absolute;
	top: max(534px, 89%);
	left: 3%;
	width: 25%;
	min-width: 285px;
	height: 8%;
	background: var(--widget-background-color);
	display: grid;
	border-radius: 1vw;
}

@media (max-width: 1300px) {
	.menuWidgetContainer {
		left: max(11px, 1%);
	}
}

#lockIconCard {
	grid-row: 1;
	grid-column: 1;
}

#settingsIconCard {
	grid-row: 1;
	grid-column: 2;
}

#aboutIconCard {
	grid-row: 1;
	grid-column: 3;
}
</style>
