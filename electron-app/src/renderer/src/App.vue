<template>
	<StatusBar />
	<Popups />
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
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, ComputedRef, computed, provide } from 'vue';

import TableSelector from "./components/TableSelector.vue"
import FilterGroupTable from './components/Table/FilterGroupTable.vue';
import PasswordValueTable from './components/Table/PasswordValueTable.vue';
import ColorPaletteContainer from './components/ColorPalette/ColorPaletteContainer.vue';
import BreachedPasswords from "./components/BreachedPasswords/BreachedPasswords.vue"
import PasswordValueGauges from './components/Widgets/SmallMetricGauges/Combined/PasswordValueGauges.vue';
import FilterGroupGauges from './components/Widgets/SmallMetricGauges/Combined/FilterGroupGauges.vue';
import PasswordStrengthProgressChart from './components/Dashboard/PasswordStrengthProgressChart.vue';
import LoginHistoryCalendar from './components/Widgets/LoginHistoryCalendar.vue';
import SettingsIconCard from "./components/Widgets/IconCards/SettingsIconCard.vue"
import LockIconCard from "./components/Widgets/IconCards/LockIconCard.vue"
import AboutIconCard from "./components/Widgets/IconCards/AboutIconCard.vue"
import LayoutIconCard from './components/Widgets/IconCards/LayoutIconCard.vue';
import Popups from './components/Popups.vue';
import StatusBar from './components/StatusBar.vue';

import { AccountSetupModel, AccountSetupView } from './Types/Models';
import { OnSessionExpiredFunctionKey } from './Types/Keys';
import { ColorPalette } from './Types/Colors';
import { getLinearGradientFromColor } from './Helpers/ColorHelper';
import { stores } from './Objects/Stores';

export default defineComponent({
	name: 'App',
	components:
	{
		StatusBar,
		Popups,
		TableSelector,
		FilterGroupTable,
		PasswordValueTable,
		ColorPaletteContainer,
		BreachedPasswords,
		PasswordValueGauges,
		FilterGroupGauges,
		PasswordStrengthProgressChart,
		LoginHistoryCalendar,
		SettingsIconCard,
		LockIconCard,
		AboutIconCard,
		LayoutIconCard,
	},
	setup()
	{
		const accountSetupModel: Ref<AccountSetupModel> = ref({ currentView: AccountSetupView.SignIn });
		const finishedMounting: Ref<boolean> = ref(false);

		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		let backgroundColor: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.backgroundColor);
		//let backgroundClr: Ref<string> = ref('#0f111d');

		provide(OnSessionExpiredFunctionKey, onSessionExpired);

		const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(stores.settingsStore.currentPrimaryColor.value));

		function onSessionExpired(message: string = "Your session has expired. Please re sign in")
		{
			accountSetupModel.value.infoMessage = message;
			accountSetupModel.value.currentView = AccountSetupView.SignIn;
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
			stores.popupStore.showAccountSetup(AccountSetupView.SignIn);
		});

		let clr = "#0f111d";
		return {
			accountSetupModel,
			backgroundColor,
			currentColorPalette,
			clr,
			gradient,
			finishedMounting,
		}
	}
});
</script>

<style>
@import './Constants/variables.css';
@import './Constants/animations.css';
@import './Constants/transitions.css';

@media (max-width: 1000px) {
	html {
		font-size: 10px;
	}
}

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

h2 {
	margin-top: min(5px, 10%);
	margin-bottom: min(5px, 10%);
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
