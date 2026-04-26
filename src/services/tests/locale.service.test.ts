import { describe, expect, it } from 'vitest'
import { localeService } from '../locale'

describe('getLocale', () => {
    it('returns "en-US" when nothing is stored', () => {
        expect(localeService.getLocale()).toBe('en-US')
    })

    it('returns the locale stored in localStorage', () => {
        localStorage.setItem('edutrace_locale', 'uk-UA')
        expect(localeService.getLocale()).toBe('uk-UA')
    })
})

describe('setLocale', () => {
    it('persists the locale to localStorage', () => {
        localeService.setLocale('uk-UA')
        expect(localStorage.getItem('edutrace_locale')).toBe('uk-UA')
    })

    it('round-trips correctly through getLocale', () => {
        localeService.setLocale('uk-UA')
        expect(localeService.getLocale()).toBe('uk-UA')
    })
})

describe('getTranslation', () => {
    it('returns a translated string for a valid key path', () => {
        localeService.setLocale('en-US')
        const result = localeService.getTranslation('nav.settings')
        expect(typeof result).toBe('string')
        expect(result).not.toBe('nav.settings')
    })

    it('returns the key path when the key does not exist', () => {
        localeService.setLocale('en-US')
        const result = localeService.getTranslation('nonexistent.key.path')
        expect(result).toBe('nonexistent.key.path')
    })

    it('returns translations for the active locale', () => {
        localeService.setLocale('en-US')
        const en = localeService.getTranslation('nav.settings')
        localeService.setLocale('uk-UA')
        const uk = localeService.getTranslation('nav.settings')
        expect(en).not.toBe(uk)
    })
})
