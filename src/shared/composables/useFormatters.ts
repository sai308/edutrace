import { useI18n } from 'vue-i18n'

// Ukrainian month abbreviations as produced by Google Classroom locale exports.
const UA_MONTHS: Record<string, number> = {
    січ: 1,
    лют: 2,
    бер: 3,
    квіт: 4,
    трав: 5,
    черв: 6,
    лип: 7,
    серп: 8,
    вер: 9,
    жовт: 10,
    лист: 11,
    груд: 12,
}

// Parses "22 січ. 2026 р." → Date(2026, 0, 22). Returns null if the string doesn't match.
function parseUkrainianDate(str: string): Date | null {
    const m = str.trim().match(/^(\d{1,2})\s+([\u0400-\u04FF]+)\.?\s+(\d{4})/)
    if (!m)
        return null
    const month = UA_MONTHS[m[2]!]
    if (!month)
        return null
    return new Date(Number(m[3]), month - 1, Number(m[1]))
}

export function useFormatters() {
    const { t } = useI18n()

    function formatDate(
        dateStr: string | number | Date | null | undefined,
        options: Intl.DateTimeFormatOptions = {},
    ): string {
        if (!dateStr)
            return '-'
        try {
            let date = new Date(dateStr)
            if (isNaN(date.getTime()) && typeof dateStr === 'string') {
                date = parseUkrainianDate(dateStr) ?? date
            }
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options,
            })
        }
        catch {
            return String(dateStr)
        }
    }

    function formatDateTime(
        dateStr: string | number | Date | null | undefined,
        options: Intl.DateTimeFormatOptions = {},
    ): string {
        if (!dateStr)
            return '-'
        try {
            return new Date(dateStr).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                ...options,
            })
        }
        catch {
            return String(dateStr)
        }
    }

    function formatTime(
        dateStr: string | number | Date | null | undefined,
        options: Intl.DateTimeFormatOptions = {},
    ): string {
        if (!dateStr)
            return '-'
        try {
            return new Date(dateStr).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                ...options,
            })
        }
        catch {
            return String(dateStr)
        }
    }

    function formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined)
            return '-'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0)
            return `${h}${t('duration.hours')} ${m}${t('duration.minutes')}`
        return `${m}${t('duration.minutes')}`
    }

    function formatSurname(fullName: string | null | undefined): string {
        if (!fullName)
            return '-'
        return fullName.trim().split(' ')[0] || '-'
    }

    return {
        formatDate,
        formatDateTime,
        formatTime,
        formatDuration,
        formatSurname,
    }
}
