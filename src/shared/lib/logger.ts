type LogLevel = 'log' | 'warn' | 'error'

interface LogEntry {
    level: LogLevel
    message: string
    context?: unknown
    timestamp: string
}

export interface DiagnosticsReport {
    generatedAt: string
    appVersion: string
    dbVersion: number
    locale: string
    userAgent: string
    recentLogs: LogEntry[]
}

const RING_BUFFER_SIZE = 100

const ring: LogEntry[] = []

function push(entry: LogEntry) {
    if (ring.length >= RING_BUFFER_SIZE)
        ring.shift()
    ring.push(entry)
}

function record(level: LogLevel, message: string, context?: unknown) {
    const entry: LogEntry = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
    }
    push(entry)
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console[level](message, ...(context !== undefined ? [context] : []))
    }
}

export const logger = {
    log: (message: string, context?: unknown) => record('log', message, context),
    warn: (message: string, context?: unknown) => record('warn', message, context),
    error: (message: string, context?: unknown) => record('error', message, context),

    /**
     * Build a diagnostics report containing app metadata and recent log entries.
     * Accepts db/locale info from callers to avoid circular imports.
     */
    buildReport(dbVersion: number, locale: string): DiagnosticsReport {
        return {
            generatedAt: new Date().toISOString(),
            appVersion: '__APP_VERSION__',
            dbVersion,
            locale,
            userAgent: navigator.userAgent,
            recentLogs: [...ring],
        }
    },

    /** Export recent log entries as a JSON string for bug reports. */
    export(): string {
        return JSON.stringify(ring, null, 2)
    },
}
