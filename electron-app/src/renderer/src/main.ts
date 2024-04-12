import { createApp } from 'vue'

import App from './App.vue'
//import createTestData from './Utilities/TestUtility';

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';

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

window.addEventListener('error', (e: ErrorEvent) =>
{
	if (e?.error instanceof Error)
	{
		const error: Error = e.error as Error
		window.api.server.app.log(error.message, error.stack ?? "");
	}
});

window.addEventListener('unhandledrejection', (e) =>
{
	if (e?.reason instanceof Error)
	{
		const error: Error = e.reason as Error
		window.api.server.app.log(error.message, error.stack ?? "");
	}
});

const app = createApp(App);

app.use(setupCalendar, {});
app.mount("#app");
