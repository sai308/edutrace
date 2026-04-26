import { logger } from '@/shared/lib/logger'
// Import locale data
import enUS from '../locales/en-US.json'
import ukUA from '../locales/uk-UA.json'

const LOCALE_KEY = 'edutrace_locale'
const DEFAULT_LOCALE = 'en-US'

const locales = {
    'en-US': enUS,
    'uk-UA': ukUA,
}

type Locale = keyof typeof locales

export const localeService = {
    getLocale(): Locale {
        try {
            return (localStorage.getItem(LOCALE_KEY) as Locale) || DEFAULT_LOCALE
        } catch (e) {
            logger.warn('Failed to get locale from localStorage:', e)
            return DEFAULT_LOCALE
        }
    },

    setLocale(locale: string) {
        try {
            localStorage.setItem(LOCALE_KEY, locale)
        } catch (e) {
            logger.error('Failed to save locale to localStorage:', e)
        }
    },

    /**
     * Get a translation for a key path (e.g., 'loader.switchingWorkspace')
     * @param {string} keyPath - Dot-separated path to translation key
     * @returns {string} Translated text or key path if not found
     */
    getTranslation(keyPath: string) {
        const locale = this.getLocale()

        const messages = locales[locale] || locales[DEFAULT_LOCALE]

        // Navigate through the object using the key path
        const keys = keyPath.split('.')
        let value: unknown = messages

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = (value as Record<string, unknown>)[key]
            } else {
                return keyPath // Return key path if not found
            }
        }

        return typeof value === 'string' ? value : keyPath
    },
}
