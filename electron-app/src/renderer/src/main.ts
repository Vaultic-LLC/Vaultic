import { createApp } from 'vue'

import App from './App.vue'
import LoadingPopup from "./components/Loading/LoadingPopup.vue";
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

// TODO: figure out how to transition loading page out
const loadingPopup = createApp(LoadingPopup);
loadingPopup.mount('#app');

async function init()
{
	if (true /* user has license */)
	{
		const result = await window.api.server.checkLicense("");

		loadingPopup.unmount();

		// Have different results based on what is needed, i.e. Ok,
		if (result)
		{
			await stores.init();
			const app = createApp(App);

			app.use(setupCalendar, {});
			app.mount('#app');
		}
	}
	else
	{
		loadingPopup.unmount();

		// show username / password sign in page. Get from Server via SSR
	}

}

init();
