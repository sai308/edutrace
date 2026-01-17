import { useI18n } from 'vue-i18n';

export function useFormatters() {
    const { t } = useI18n();

    function formatDate(dateStr: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            });
        } catch (e) {
            return String(dateStr);
        }
    }

    function formatDateTime(dateStr: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                ...options
            });
        } catch (e) {
            return String(dateStr);
        }
    }

    function formatTime(dateStr: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                ...options
            });
        } catch (e) {
            return String(dateStr);
        }
    }

    function formatDuration(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return '-';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}${t('duration.hours')} ${m}${t('duration.minutes')}`;
        return `${m}${t('duration.minutes')}`;
    }

    function formatCompactDate(isoString: string | number | Date | null | undefined): string {
        if (!isoString) return '-';
        try {
            return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return String(isoString);
        }
    }

    return {
        formatDate,
        formatDateTime,
        formatTime,
        formatDuration,
        formatCompactDate
    };
}
