<template>
	<Teleport to="#body">
		<Transition name="lockFade" mode="out-in">
			<GlobalAuthenticationPopup v-if="needsAuthentication" />
		</Transition>
	</Teleport>
	<Transition name="fade">
		<RequestedAuthenticationPopup v-if="requestAuth" :authenticationSuccessful="onAuthSuccess"
			:authenticationCanceled="onAuthCancel" :setupKey="needsToSetupKey" />
	</Transition>
	<Transition name="appFade">
		<div v-if="coverMainUI" class="mainUICover"></div>
	</Transition>
	<div id="mainUI" class="mainUI">
		<SideDrawer />
		<div class="center">
			<ColorPaletteContainer />
			<BreachedPasswords />
			<TableSelector :singleSelectorItems="[filtersTableControl, groupsTableControl]"
				:style="{ 'left': '5%', 'top': '30%', 'width': '10%' }" />
			<TableSelector :singleSelectorItems="[passwordTableControl, valuesTableControl]"
				:style="{ 'left': '33%', 'top': '30%', 'width': '20%' }" />
			<div id="tables">
				<FilterGroupTable />
				<LoginHistoryTable />
				<PasswordValueTable />
			</div>
			<div class="footer" />
		</div>
		<MetricDrawer />
	</div>
	<Transition name="fade" mode="out-in">
		<ToastPopup v-if="showToast" :text="toastText" :success="toastSuccess" />
	</Transition>
	<!-- <div id="glassBackground" class="glassBackground">
	</div> -->
	<!-- <div ref="cursor" class="cursor">
	</div> -->
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, ComputedRef, computed, provide, watch } from 'vue';

import SideDrawer from './components/SideDrawer.vue';
import MetricDrawer from "./components/MetricDrawer.vue"
import TableSelector from "./components/TableSelector.vue"
import FilterGroupTable from './components/Table/FilterGroupTable.vue';
import GlobalAuthenticationPopup from './components/Authentication/GlobalAuthenticationPopup.vue';
import PasswordValueTable from './components/Table/PasswordValueTable.vue';
import ColorPaletteContainer from './components/ColorPalette/ColorPaletteContainer.vue';
import LoginHistoryTable from './components/Table/LoginHistoryTable.vue';
import ToastPopup from './components/ToastPopup.vue';
import RequestedAuthenticationPopup from './components/Authentication/RequestedAuthenticationPopup.vue';
import BreachedPasswords from "./components/BreachedPasswords/BreachedPasswords.vue"

import { SingleSelectorItemModel } from './Types/Models';
import { stores } from './Objects/Stores';
import { RequestAuthenticationFunctionKey, ShowToastFunctionKey } from './Types/Keys';
import { ColorPalette } from './Types/Colors';
import { DataType } from './Types/Table';

export default defineComponent({
	name: 'App',
	components:
	{
		SideDrawer,
		MetricDrawer,
		TableSelector,
		FilterGroupTable,
		GlobalAuthenticationPopup,
		PasswordValueTable,
		ColorPaletteContainer,
		LoginHistoryTable,
		ToastPopup,
		RequestedAuthenticationPopup,
		BreachedPasswords
	},
	setup()
	{
		// const cursor: Ref<HTMLElement | null> = ref(null);
		const needsAuthentication: Ref<boolean> = ref(stores.appStore.needsAuthentication);
		const coverMainUI: Ref<boolean> = ref(stores.appStore.needsAuthentication);
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		let backgroundColor: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.backgroundColor);
		let backgroundClr: Ref<string> = ref('#0f111d');

		const showToast: Ref<boolean> = ref(false);
		const toastText: Ref<string> = ref('');
		const toastSuccess: Ref<boolean> = ref(false);

		const needsToSetupKey: Ref<boolean> = ref(false);
		const requestAuth: Ref<boolean> = ref(false);
		const onAuthSuccess: Ref<{ (key: string): void }> = ref((key: string) => { })
		const onAuthCancel: Ref<{ (): void }> = ref(() => { })

		provide(ShowToastFunctionKey, showToastFunc);
		provide(RequestAuthenticationFunctionKey, requestAuthentication)

		const passwordTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Passwords"),
				color: ref(currentColorPalette.value.passwordsColor.primaryColor),
				isActive: computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords),
				onClick: () => { stores.appStore.activePasswordValuesTable = DataType.Passwords; }
			}
		});

		const valuesTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Values"),
				color: ref(currentColorPalette.value.valuesColor.primaryColor),
				isActive: computed(() => stores.appStore.activePasswordValuesTable == DataType.NameValuePairs),
				onClick: () => { stores.appStore.activePasswordValuesTable = DataType.NameValuePairs; }
			}
		});

		const filtersTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Filters"),
				color: ref(currentColorPalette.value.filtersColor),
				isActive: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Filters; }
			}
		});

		const groupsTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Groups"),
				color: ref(currentColorPalette.value.groupsColor),
				isActive: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Groups),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Groups; }
			}
		});

		const color: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activeFilterGroupsTable)
			{
				case DataType.Groups:
					return stores.settingsStore.currentColorPalette.groupsColor;
				case DataType.Filters:
				default:
					return stores.settingsStore.currentColorPalette.filtersColor
			}
		});

		function showToastFunc(title: string, success: boolean)
		{
			toastText.value = title;
			toastSuccess.value = success;
			showToast.value = true;

			setTimeout(() => showToast.value = false, 2000);
		}

		function requestAuthentication(onSuccess: (key: string) => void, onCancel: () => void)
		{
			// TODO: Check if we need to create a key and show a different popup / popup with differnt
			// wording
			if (!stores.encryptedDataStore.canAuthenticateKey)
			{
				needsToSetupKey.value = true;
			}
			else
			{
				needsToSetupKey.value = false;
			}

			onAuthSuccess.value = (key: string) =>
			{
				requestAuth.value = false;
				onSuccess(key);
			};

			onAuthCancel.value = () =>
			{
				requestAuth.value = false;
				onCancel();
			}

			requestAuth.value = true;
		}

		let lastMouseover: number = 0;
		const threshold: number = 1000;
		onMounted(() =>
		{
			document.getElementById('body')?.addEventListener('mouseover', (e) =>
			{
				// if (cursor.value)
				// {
				// 	cursor.value.style.left = e.clientX + "px";
				// 	cursor.value.style.top = e.clientY + "px";
				// }

				if (Date.now() - lastMouseover < threshold)
				{
					return;
				}

				stores.appStore.resetSessionTime();
				lastMouseover = Date.now();
			});
		});

		watch(() => stores.appStore.needsAuthentication, (newValue) =>
		{
			needsAuthentication.value = newValue;
			if (newValue)
			{
				coverMainUI.value = true;
			}
			else
			{
				setTimeout(() => coverMainUI.value = false, 500);
			}
		});

		let clr = "#0f111d";
		return {
			needsAuthentication,
			backgroundColor,
			currentColorPalette,
			clr,
			passwordTableControl,
			valuesTableControl,
			filtersTableControl,
			groupsTableControl,
			color,
			showToast,
			toastText,
			toastSuccess,
			requestAuth,
			onAuthSuccess,
			onAuthCancel,
			needsToSetupKey,
			coverMainUI,
			//cursor
		}
	}
});
</script>

<style>
@import './variables.css';

.lockFade-enter-active,
.lockFade-leave-active {
	transition: opacity 1.5s ease-in;
	/* z-index: 100; */
}

.lockFade-enter-from,
.lockFade-leave-to {
	opacity: 0;
	/* z-index: 100; */
}

.appFade-enter-active {
	transition: opacity 1.5s ease-in;
}

.appFade-leave-active {
	transition: opacity 0.5s ease-in;
}

.appFade-enter-from,
.appFade-leave-to {
	opacity: 0;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: var(--app-color);
}

body {
	background-color: #0f111d;
	overflow: hidden;
}

.footer {
	height: 50px;
}

h2,
div {
	user-select: none;
}

.mainUICover {
	position: fixed;
	width: 100%;
	height: 100%;
	background-color: black;
	z-index: 90;
}

/* .glassBackground {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	background: #1a191d3b;
	border-radius: 16px;
	box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
	backdrop-filter: blur(4.6px);
	-webkit-backdrop-filter: blur(4.6px);
} */

/* .mainUI {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 3;
}

.cursor {
	position: absolute;
	z-index: 1;
	width: 200px;
	height: 200px;
	background-color: blue;
	border-radius: 50%;
	transform: translate(-50%, -50%);
	filter: blur(50px);
} */
</style>
