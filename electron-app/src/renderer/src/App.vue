<template>
	<Transition name="fade" mode="out-in">
		<LoadingPopup v-if="showLoadingIndicator" :color="loadingColor" :text="loadingText"
			:glassOpacity="loadingOpacity" />
	</Transition>
	<Teleport to="#body">
		<Transition name="fade" mode="out-in">
			<UnknownResponsePopup v-if="showUnknownResponsePopup" :statusCode="unknownResponseStatusCode" @onOk="showUnknownResponsePopup = false"  />
		</Transition>
	</Teleport>
	<Teleport to="#body">
		<Transition name="fade" mode="out-in">
			<AccountSetupPopup v-if="accountSetupModel.currentView != 0" :model="accountSetupModel" />
		</Transition>
	</Teleport>
	<Teleport to="#body">
		<Transition name="lockFade" mode="out-in">
			<GlobalAuthenticationPopup v-if="needsAuthentication" @onAuthenticationSuccessful="onGlobalAuthSuccessful" />
		</Transition>
	</Teleport>
	<Transition name="fade">
		<RequestedAuthenticationPopup v-if="requestAuth" :authenticationSuccessful="onAuthSuccess"
			:authenticationCanceled="onAuthCancel" :setupKey="needsToSetupKey" :color="requestAuthColor" />
	</Transition>
	<div id="mainUI" class="mainUI">
		<div class="center">
			<ColorPaletteContainer />
			<BreachedPasswords />
			<div id="tables">
				<FilterGroupTable />
				<PasswordValueTable />
			</div>
		</div>
		<div class="tempWidget" :style="{ right: '2%', top: '4%' }">
			<PasswordValueGauges />
		</div>
		<div class="tempWidget" :style="{ right: '2%', top: '45%' }">
			<FilterGroupGauges />
		</div>
		<div class="tempWidget" :style="{ top: '4%', left: '58%', width: '21%', height: '25%' }">
			<PasswordStrengthProgressChart />
		</div>
		<div class="tempWidget" :style="{ top: '72%', right: '2%', width: '17%' }">
			<LoginHistoryCalendar />
		</div>
		<div class="iconWidgets" :style="{ top: '89%', left: '3%', width: '25%', height: '8%' }">
			<LockIconCard :style="{ 'grid-row': '1', 'grid-column': 1 }" />
			<SettingsIconCard :style="{ 'grid-row': '1', 'grid-column': 2 }" />
			<!-- <LayoutIconCard :style="{ 'grid-row': '1', 'grid-column': 3 }" /> -->
			<AboutIconCard :style="{ 'grid-row': '1', 'grid-column': 3 }" />
		</div>
	</div>
	<Transition name="fade" mode="out-in">
		<ToastPopup v-if="showToast" :color="toastColor" :text="toastText" :success="toastSuccess" />
	</Transition>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, ComputedRef, computed, provide, watch } from 'vue';

import TableSelector from "./components/TableSelector.vue"
import FilterGroupTable from './components/Table/FilterGroupTable.vue';
import GlobalAuthenticationPopup from './components/Authentication/GlobalAuthenticationPopup.vue';
import PasswordValueTable from './components/Table/PasswordValueTable.vue';
import ColorPaletteContainer from './components/ColorPalette/ColorPaletteContainer.vue';
import ToastPopup from './components/ToastPopup.vue';
import RequestedAuthenticationPopup from './components/Authentication/RequestedAuthenticationPopup.vue';
import BreachedPasswords from "./components/BreachedPasswords/BreachedPasswords.vue"
import PasswordValueGauges from './components/Widgets/SmallMetricGauges/Combined/PasswordValueGauges.vue';
import FilterGroupGauges from './components/Widgets/SmallMetricGauges/Combined/FilterGroupGauges.vue';
import PasswordStrengthProgressChart from './components/Dashboard/PasswordStrengthProgressChart.vue';
import LoginHistoryCalendar from './components/Widgets/LoginHistoryCalendar.vue';
import SettingsIconCard from "./components/Widgets/IconCards/SettingsIconCard.vue"
import LockIconCard from "./components/Widgets/IconCards/LockIconCard.vue"
import AboutIconCard from "./components/Widgets/IconCards/AboutIconCard.vue"
import LayoutIconCard from './components/Widgets/IconCards/LayoutIconCard.vue';
import SliderField from './components/InputFields/SliderField.vue';
import LoadingPopup from './components/Loading/LoadingPopup.vue';
import AccountSetupPopup from "./components/Account/AccountSetupPopup.vue"

import { AccountSetupModel, AccountSetupView, SingleSelectorItemModel } from './Types/Models';
import { HideLoadingIndicatorFunctionKey, RequestAuthenticationFunctionKey, ShowLoadingIndicatorFunctionKey, ShowToastFunctionKey, ShowUnknownResonsePopupFunctionKey } from './Types/Keys';
import { ColorPalette } from './Types/Colors';
import { DataType } from './Types/Table';
import { getLinearGradientFromColor } from './Helpers/ColorHelper';
import { stores } from './Objects/Stores';
import UnknownResponsePopup from './components/UnknownResponsePopup.vue';

export default defineComponent({
	name: 'App',
	components:
	{
		TableSelector,
		FilterGroupTable,
		GlobalAuthenticationPopup,
		PasswordValueTable,
		ColorPaletteContainer,
		ToastPopup,
		RequestedAuthenticationPopup,
		BreachedPasswords,
		PasswordValueGauges,
		FilterGroupGauges,
		PasswordStrengthProgressChart,
		LoginHistoryCalendar,
		SettingsIconCard,
		LockIconCard,
		AboutIconCard,
		LayoutIconCard,
		SliderField,
		LoadingPopup,
		AccountSetupPopup
	},
	setup()
	{
		const accountSetupModel: Ref<AccountSetupModel> = ref({ currentView: AccountSetupView.SignIn });
		const finishedMounting: Ref<boolean> = ref(false);

		const needsAuthentication: Ref<boolean> = ref(stores.needsAuthentication);
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		let backgroundColor: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.backgroundColor);
		//let backgroundClr: Ref<string> = ref('#0f111d');

		const toastColor: Ref<string> = ref('');
		const showToast: Ref<boolean> = ref(false);
		const toastText: Ref<string> = ref('');
		const toastSuccess: Ref<boolean> = ref(false);

		const requestAuthColor: Ref<string> = ref('');
		const needsToSetupKey: Ref<boolean> = ref(false);
		const requestAuth: Ref<boolean> = ref(false);
		const onAuthSuccess: Ref<{ (key: string): void }> = ref((_: string) => { });
		const onAuthCancel: Ref<{ (): void }> = ref(() => { });

		const loadingColor: Ref<string> = ref('');
		const loadingText: Ref<string> = ref('');
		const loadingOpacity: Ref<number | undefined> = ref(undefined);
		const showLoadingIndicator: Ref<boolean> = ref(false);

		const showUnknownResponsePopup: Ref<boolean> = ref(false);
		const unknownResponseStatusCode: Ref<number | undefined> = ref(undefined);

		provide(ShowToastFunctionKey, showToastFunc);
		provide(RequestAuthenticationFunctionKey, requestAuthentication);
		provide(ShowLoadingIndicatorFunctionKey, showLoadingIndicatorFunc);
		provide(HideLoadingIndicatorFunctionKey, hideLoadingIndicatorFunc);
		provide(ShowUnknownResonsePopupFunctionKey, showUnknownResponsePopupFunc);

		const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(stores.settingsStore.currentPrimaryColor.value));

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

		function showToastFunc(color: string, title: string, success: boolean)
		{
			toastColor.value = color;
			toastText.value = title;
			toastSuccess.value = success;
			showToast.value = true;

			setTimeout(() => showToast.value = false, 2000);
		}

		function showLoadingIndicatorFunc(color: string, text: string, opacity?: number)
		{
			loadingColor.value = color;
			loadingText.value = text;
			loadingOpacity.value = opacity;

			showLoadingIndicator.value = true;
		}

		function hideLoadingIndicatorFunc()
		{
			showLoadingIndicator.value = false;
		}

		function showUnknownResponsePopupFunc(statusCode?: number)
		{
			unknownResponseStatusCode.value = statusCode;
			showUnknownResponsePopup.value = true;
		}

		function requestAuthentication(color: string, onSuccess: (key: string) => void, onCancel: () => void)
		{
			requestAuthColor.value = color;

			if (!stores.canAuthenticateKeyAfterEntry())
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

		function onGlobalAuthSuccessful()
		{
			stores.needsAuthentication = false;
		}

		let lastMouseover: number = 0;
		const threshold: number = 1000;

		onMounted(async () =>
		{
			document.getElementById('body')?.addEventListener('mouseover', (_) =>
			{
				if (Date.now() - lastMouseover < threshold)
				{
					return;
				}

				stores.appStore.resetSessionTime();
				lastMouseover = Date.now();
			});

			finishedMounting.value = true;
		});

		watch(() => stores.needsAuthentication, (newValue) =>
		{
			needsAuthentication.value = newValue;
		});

		let clr = "#0f111d";
		return {
			accountSetupModel,
			needsAuthentication,
			backgroundColor,
			currentColorPalette,
			clr,
			passwordTableControl,
			valuesTableControl,
			filtersTableControl,
			groupsTableControl,
			color,
			toastColor,
			showToast,
			toastText,
			toastSuccess,
			requestAuthColor,
			requestAuth,
			onAuthSuccess,
			onAuthCancel,
			needsToSetupKey,
			gradient,
			loadingColor,
			loadingText,
			showLoadingIndicator,
			finishedMounting,
			loadingOpacity,
			onGlobalAuthSuccessful,
			showUnknownResponsePopup,
			unknownResponseStatusCode
		}
	}
});
</script>

<style>
@import './Constants/variables.css';
@import './Constants/animations.css';
@import './Constants/transitions.css';

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: var(--app-color);
}

body {
	font-family: Avenir, Helvetica, Arial, sans-serif !important;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	background-color: #0f111d;
	overflow: hidden;
	text-align: center;
}

h2,
div {
	user-select: none;
}

.tempWidget {
	position: absolute;
}

.tempWidget.background {
	background: var(--widget-background-color);
	border-radius: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: 25px;
}

.iconWidgets {
	position: absolute;
	background: var(--widget-background-color);
	display: grid;
	border-radius: 20px;
}

.tippy-box[data-theme~='material'] {
	text-align: center;
}

.tippy-box[data-theme~='material'][data-placement^='bottom-start']>.tippy-arrow {
	left: 10px !important;
	transform: translate(0, 0) !important;
}
</style>
