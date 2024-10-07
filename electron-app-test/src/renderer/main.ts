import { createApp } from 'vue'

import App from './core/App.vue'
import { api } from "./core/API"
import app from './core/Objects/Stores/AppStore';

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';
import runAllTests, { runCryptUtilityTests, runAllValueTests, runAllGroupTests, runAllFilterTests, runAllTransactionTests, runServerHelperTests, runImportExportHelperTests } from "../tests/index"

api.setAPI(window.api);

Coloris.init();
Coloris({
    el: "#coloris",
    clearButton: true,
    closeButton: true,
    theme: 'default',
    themeMode: 'dark',
    focusInput: true,
    swatches: [
        '#a712ec',
        '#7752FE"',
        '#03C4A1',
        '#19A7CE',
        '#3339ef',
        '#FB2576',
        '#b5fc00',
        '#ffa801',
        '#0f111d',
        '#161e29',
        '#0f141a'
    ]
});

// read userpreferences before any UI elements for themeing
app.userPreferences.loadLastUsersPreferences().then(initApp).catch(initApp);

async function initApp()
{
    const app = createApp(App);

    app.use(setupCalendar, {});
    app.mount("#app");

    runAllTests();
}