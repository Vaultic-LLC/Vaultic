import { createApp } from 'vue'

import App from './core/App.vue'
import { api } from "./core/API"

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';
import { stores } from './core/Objects/Stores';

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
		window.api.server.app.log(error.message, error.stack ?? "ErrorHandler");
	}
});

window.addEventListener('unhandledrejection', (e) =>
{
	if (e?.reason instanceof Error)
	{
		const error: Error = e.reason as Error
		window.api.server.app.log(error.message, error.stack ?? "UnhandlerRejectionHandler");
	}
});

// read userpreferences before any UI elements for themeing
stores.userPreferenceStore.readState('').then(initApp).catch(initApp);

function initApp()
{
	const app = createApp(App);

	app.use(setupCalendar, {});
	app.mount("#app");
}
