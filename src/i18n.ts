import { createI18n } from 'vue-i18n'

import enUS from './locales/en-US.json'

import ukUA from './locales/uk-UA.json'
import { localeService } from './services/locale'

const messages = {
    'en-US': enUS,
    'uk-UA': ukUA,
    'uk': ukUA,
}

const i18n = createI18n({
    legacy: false,
    locale: localeService.getLocale(),
    fallbackLocale: 'en-US',
    messages,
    globalInjection: true,
})

export default i18n
