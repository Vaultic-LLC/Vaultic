import { createApp } from 'vue'
import './style.css'
import App from './Core/Renderer/App.vue'

api.setAPIResolver(window.api);

const app = createApp(App);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.darkMode',
        }
    }
});

app.use(ConfirmationService);
app.mount('#app');