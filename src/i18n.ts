import { createI18n } from 'vue-i18n';

import { localeService } from './services/locale';

import enUS from './locales/en-US.json';
import ukUA from './locales/uk-UA.json';

const messages = {
    'en-US': enUS,
    'uk-UA': ukUA
};

const i18n = createI18n({
    legacy: false,
    locale: localeService.getLocale(),
    fallbackLocale: 'en-US',
    messages,
    globalInjection: true
});

export default i18n;
