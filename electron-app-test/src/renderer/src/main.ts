import { createApp } from 'vue'

import App from './core/App.vue'
import { api } from "./core/API"
import app from './core/Objects/Stores/AppStore';

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';
import PrimeVue from 'primevue-vaultic/config';
import Aura from '@primevue/themes/aura';
import ConfirmationService from 'primevue-vaultic/confirmationservice';
import runAllTests, { runAllDeleteAccountTests, runAllMergingDataTests, runAllPasswordTests, runCryptUtilityTests, runAllValueTests, runAllGroupTests, runAllFilterTests, runAllTransactionTests, runServerHelperTests, runImportExportHelperTests } from "../tests/tests/index"

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

function onError()
{
    // hide the loading indicator in case it was showing when the error occured.
    app.popups.hideLoadingIndicator();
    app.popups.showAlert("Error", "An error has occured, please try again. If the issue persists, try restarting the app or", true);
}

window.addEventListener('error', (e: ErrorEvent) =>
{
    if (e?.error instanceof Error)
    {
        const error: Error = e.error as Error

        try
        {
            if (!app.isOnline)
            {
                return;
            }

        }
        catch { }
    }

    onError();
});

window.addEventListener('unhandledrejection', (e) =>
{
    if (e?.reason instanceof Error)
    {
        const error: Error = e.reason as Error

        try
        {
            if (!app.isOnline)
            {
                return;
            }

        }
        catch { }
    }

    onError();
});

api.environment.failedToInitalizeDatabase().then((failed: boolean) =>
{
    if (failed)
    {
        initApp();
        app.popups.showAlert(
            "Failed to load local data",
            "We have detected that your local database has been tampered with and will need to be re created. All un backed up local data will be lost.", false,
            {
                text: "Ok",
                onClick: async () =>
                {
                    await api.environment.recreateDatabase();
                }
            }
        );

        return;
    }

    app.userPreferences.loadLastUsersPreferences().then(initApp).catch(initApp);
});

function initApp()
{
    const app = createApp(App);
    app.config.performance = true;

    app.use(setupCalendar, {});
    app.use(PrimeVue, {
        theme: {
            preset: Aura,
            options: {
                darkModeSelector: '.darkMode',
            }
        }
    });

    app.use(ConfirmationService);
    app.mount("#app");

    // gives time to set breakpoints if needed
    setTimeout(() =>
    {
        runAllDeleteAccountTests();
    }, 10000);
}
