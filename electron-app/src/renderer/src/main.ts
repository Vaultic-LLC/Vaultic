import { createApp } from 'vue'

import App from './core/App.vue'
import { api } from "./core/API"

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';
import app from './core/Objects/Stores/AppStore';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';

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
		'#7752FE',
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

window.addEventListener('error', (e: ErrorEvent) =>
{
	if (e?.error instanceof Error)
	{
		const error: Error = e.error as Error

		try
		{
			window.api.server.app.log(error.message, error.stack ?? "ErrorHandler");
		}
		catch { }
	}
});

window.addEventListener('unhandledrejection', (e) =>
{
	if (e?.reason instanceof Error)
	{
		const error: Error = e.reason as Error

		try
		{
			window.api.server.app.log(error.message, error.stack ?? "UnhandlerRejectionHandler");
		}
		catch { }
	}
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

// read userpreferences before any UI elements for themeing

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
}
