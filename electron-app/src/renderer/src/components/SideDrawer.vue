<template>
	<div class="sideDrawer">
		<ul>
			<li class="sideDrawerListItem" @click="lockApp" @mouseout="activeItem = ''" @mouseover="activeItem = 'lock'"
				:class="{ active: activeItem == 'lock' }">
				<a href="#">
					<span class="sideDrawerListItemIcon">
						<ion-icon class="buttonIcon" name="lock-closed-outline"></ion-icon>
					</span>
					<div class="sideDrawerListItemText">
						Lock
					</div>
				</a>
			</li>
			<li class="sideDrawerListItem" @click="showEditSettingsPopup = true" @mouseout="activeItem = ''"
				@mouseover="activeItem = 'settings'" :class="{ active: activeItem == 'settings' }">
				<a href="#">
					<span class="sideDrawerListItemIcon">
						<ion-icon class="buttonIcon" name="settings-outline"></ion-icon>
					</span>
					<div class="sideDrawerListItemText">
						Settings
					</div>
				</a>
			</li>
			<div class="indicator"></div>
		</ul>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditSettingsPopup" :closePopup="closeSettings">
					<EditSettingsPopup :model="settingsState" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, ref, Ref } from 'vue';

import ObjectPopup from './ObjectPopups/ObjectPopup.vue';
import EditSettingsPopup from './ObjectPopups/EditPopups/EditSettingsPopup.vue';

import { stores } from "../Objects/Stores/index"
import { SettingsState } from '../Objects/Stores/SettingsStore';

export default defineComponent({
	name: "SideDrawer",
	components: {
		ObjectPopup,
		EditSettingsPopup
	},
	setup()
	{
		const showEditSettingsPopup: Ref<boolean> = ref(false);
		const settingsState: ComputedRef<SettingsState> = computed(() => stores.settingsStore.state);

		let activeItem: Ref<string> = ref('');

		const lockApp = () =>
		{
			stores.appStore.authenticated = false;
		}

		function closeSettings()
		{
			showEditSettingsPopup.value = false;
		}

		return {
			activeItem,
			showEditSettingsPopup,
			settingsState,
			lockApp,
			closeSettings
		}
	}
})
</script>

<style>
.sideDrawer {
	height: 100%;
	width: 50px;
	position: fixed;
	/* background-color: var(--app-color); */
	background-color: #0c0f16;
	left: 0;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column-reverse;
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
}

.sideDrawer ul {
	display: flex;
	flex-direction: column;
	padding: 0;
}

.sideDrawer ul li {
	position: relative;
	list-style: none;
	width: auto;
	height: auto;
	z-index: 1;
}

.sideDrawer ul li a {
	padding-left: 10px;
	position: relative;
	display: flex;
	justify-content: end;
	align-items: center;
	flex-direction: row;
	color: #fff;
	text-align: center;
}

.sideDrawer ul li a .sideDrawerListItemIcon {
	position: relative;
	line-height: 75px;
	transition: 0.5s;
	font-size: 30px;
}

.sideDrawer ul li.active a .sideDrawerListItemIcon {
	font-size: 35px;
}

.sideDrawer ul li a .sideDrawerListItemText {
	position: absolute;
	font-size: 12px;
	color: #fff;
	left: 70px;
	font-weight: 400;
	transition: 0.25s;
	text-transform: uppercase;
	transform: scale(0);
	text-decoration: none;
}

.sideDrawer ul li.active a .sideDrawerListItemText {
	transform: scale(1);
}

.sideDrawer ul li:nth-child(1).active .sideDrawerListItemText {
	padding: 10px;
	border-radius: 10px;
	background: #f53b57;
}

.sideDrawer ul li:nth-child(2).active .sideDrawerListItemText {
	padding: 10px;
	border-radius: 10px;
	background: #0fbcf9;
}

.indicator {
	position: absolute;
	left: 0;
	width: 50px;
	height: 70px;
	border-radius: 10px;
	transition: 0.5s;
}

.sideDrawer ul li:nth-child(1).active~.indicator {
	background: #f53b57;
	box-shadow: 0 15px 25px #f53b57;
	transform: translateY(calc(70px * 0));
}

.sideDrawer ul li:nth-child(2).active~.indicator {
	background: #0fbcf9;
	box-shadow: 0 15px 25px #0fbcf9;
	transform: translateY(calc(70px * 1));
}
</style>
