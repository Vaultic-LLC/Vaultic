import { createApp } from 'vue'
import App from './App.vue'
import createTestData from './Utilities/TestUtility';
import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";

Coloris.init();
Coloris({
	el: "#coloris",
	clearButton: true,
	closeButton: true,
	theme: 'default',
	themeMode: 'dark',
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

await createTestData();
createApp(App).mount('#app')
