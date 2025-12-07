import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import appStore from '@/lib/renderer/Objects/Stores/AppStore';
import setupStoreModifyBridges from '@/lib/Helpers/StoreModifyBridgeHelper';
import setExtensionAPI from '@/lib/Helpers/ExtensionAPI';

const app = createApp(App);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.darkMode',
        }
    }
});

appStore.popups.hideAccountSetup();
setupStoreModifyBridges();
setExtensionAPI();

app.use(ConfirmationService);
app.mount('#app');