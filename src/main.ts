import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'

// Plugins
import router from './router'
import { installGlobalErrorHandler } from './shared/lib/globalErrorHandler'
import './style.css'

const app = createApp(App)
installGlobalErrorHandler(app)
app.use(router).use(i18n).mount('#app')
