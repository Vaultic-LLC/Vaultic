import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import appStore from '@/lib/renderer/Objects/Stores/AppStore';
import setupStoreModifyBridges from '@/lib/Helpers/StoreModifyBridgeHelper';
import setExtensionAPI from '@/lib/Helpers/ExtensionAPI';
import app from '@/lib/renderer/Objects/Stores/AppStore';

const appUI = createApp(App);
appUI.use(PrimeVue, {
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

app.userPreferences.loadLastUsersPreferences().then(() =>
{
    appUI.use(ConfirmationService);
    appUI.mount('#app');
});