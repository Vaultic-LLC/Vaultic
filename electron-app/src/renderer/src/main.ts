import { createApp } from 'vue'

import App from './App.vue'
//import createTestData from './Utilities/TestUtility';

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";
import { setupCalendar } from 'v-calendar-tw';
import { stores } from './Objects/Stores';

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

const test = "test";
const key = "TheCompositeMan$1234";
const hash = window.api.utilities.hash.insecureHash(test);
window.api.utilities.crypt.encrypt(key, test).then((value) =>
{
	if (value.success && value.value)
	{
		window.api.utilities.crypt.decrypt(key, "zm9ymI3Y3+lf85pMfs6/jKmN/jx3dUhT5aDNkvY9O68=").then((decryptValue) =>
		{
			console.log(hash);
			console.log(value.value);
			console.log(decryptValue.value);
		});
	}
});
