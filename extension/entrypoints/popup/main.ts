import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import appStore from '@/lib/renderer/Objects/Stores/AppStore';
import setupStoreModifyBridges from '@/lib/Helpers/StoreModifyBridgeHelper';

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

app.use(ConfirmationService);
app.mount('#app');