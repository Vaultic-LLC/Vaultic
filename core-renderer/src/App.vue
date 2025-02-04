<template>
    <Popups />
    <ConfirmDialog></ConfirmDialog>
    <div id="mainUI" class="mainUI">
        <SideDrawer />
        <div class="center">
            <ColorPaletteContainer />
            <Transition name="fade" mode="out-in">
                <BreachedPasswords v-if="isVaultView" />
            </Transition>
            <Transition name="fade" mode="out-in">
                <div id="tables" v-if="isVaultView">
                    <FilterGroupTable />
                    <PasswordValueTable />
                </div>
                <div v-else>
                    <AccountInfoWidget />
                    <OrganizationDeviceTable />
                </div>
            </Transition>
        </div>
        <Transition name="fade">
            <PasswordValueGauges v-if="isVaultView" />
        </Transition>
        <Transition name="fade">
            <FilterGroupGauges v-if="isVaultView" />
        </Transition>
        <Transition name="fade" mode="out-in">
            <div v-if="isVaultView" class="tempWidget secureProgressChartWidget">
                <PasswordStrengthProgressChart />
            </div>
        </Transition>
        <Transition name="fade" mode="out-in">
            <div class="tempWidget loginHistoryCalendarWidget" v-if="isVaultView">
                <LoginHistoryCalendar />
            </div>
        </Transition>
        <MenuWidget />
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, onMounted, ref, ComputedRef, computed, watch } from 'vue';

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
import MenuWidget from "./components/Widgets/IconCards/MenuWidget.vue"
import SideDrawer from "./components/SideDrawer.vue"
import OrganizationDeviceTable from './components/Table/OrganizationDeviceTable.vue';
import ConfirmDialog from "primevue/confirmdialog";
import AccountInfoWidget from './components/Widgets/AccountInfoWidget.vue';

import { AccountSetupView } from './Types/Models';
import { ColorPalette } from './Types/Colors';
import { getLinearGradientFromColor } from './Helpers/ColorHelper';
import app from "./Objects/Stores/AppStore";
import * as PolyFills from "@vaultic/shared/Types/PolyFills";
import { AppView } from './Types/App';
PolyFills.a;

export default defineComponent({
    name: 'App',
    components:
    {
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
        MenuWidget,
        SideDrawer,
        OrganizationDeviceTable,
        ConfirmDialog,
        AccountInfoWidget
    },
    setup()
    {
        const isVaultView: ComputedRef<boolean> = computed(() => app.isVaultView);
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);
        const finishedMounting: Ref<boolean> = ref(false);

        const currentColorPalette: ComputedRef<ColorPalette> = computed(() => app.userPreferences.currentColorPalette);
        let backgroundColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.backgroundColor.value);
        //let backgroundClr: Ref<string> = ref('#0f111d');

        const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(app.userPreferences.currentPrimaryColor.value));

        let lastMouseover: number = 0;
        const threshold: number = 1000;

        function onMouseover()
        {
            if (Date.now() - lastMouseover < threshold)
            {
                return;
            }

            app.resetSessionTime();
            lastMouseover = Date.now();
        }

        watch(() => app.loadedUser.value, (newValue) => 
        {
            if (newValue)
            {
                document.getElementById('body')?.addEventListener('mouseover', onMouseover);
            }
            else 
            {
                document.getElementById('body')?.removeEventListener('mouseover', onMouseover);
            }
        });

        onMounted(() =>
        {
            finishedMounting.value = true;
            app.popups.showAccountSetup(AccountSetupView.SignIn);
        });

        let clr = "#0f111d";
        return {
            isVaultView,
            AppView,
            backgroundColor,
            currentColorPalette,
            clr,
            gradient,
            finishedMounting,
            isOnline
        }
    }
});
</script>

<style>
@import './Constants/variables.css';
@import './Constants/animations.css';
@import './Constants/transitions.css';
@import 'primeicons/primeicons.css';

/* @media (max-width: 1000px) {
	html {
		font-size: 10px;
	}
} */

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: var(--app-color);
    min-width: 1140px;
    min-height: 600px;
    position: fixed;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
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

.secureProgressChartWidget {
    top: 4%;
    left: 62%;
    width: 19%;
    height: 24.7%;
    min-height: 190px;
    /* TODO: test this when the chart is working again to make sure it isn't too small */
    /* min-width: 250px; */
}

.loginHistoryCalendarWidget {
    top: 70.5%;
    width: 16%;
    min-width: 240px;
    min-height: 140px;
    right: 1%;
}

/* @media (max-width: 1300px) {
    .loginHistoryCalendarWidget {
        left: max(890px, 78%);
        width: 21.5%;
    }
}

@media (max-width: 1300px) {
    .secureProgressChartWidget {
        left: max(627px, 55%);
    }
} */

@media (max-height: 750px) {
    .loginHistoryCalendarWidget {
        top: 73%;
    }
}

@media (max-height: 690px) {
    .loginHistoryCalendarWidget {
        top: 72%;
    }
}

@media (max-height: 650px) {
    .secureProgressChartWidget {
        top: max(12px, 2%);
    }

    .loginHistoryCalendarWidget {
        top: max(414px, 69%);
    }
}

.tippy-box[data-theme~='material'] {
    text-align: center;
}

.tippy-box[data-theme~='material'][data-placement^='bottom-start']>.tippy-arrow {
    left: 10px !important;
    transform: translate(0, 0) !important;
}

ion-icon {
    visibility: unset !important;
}
</style>
