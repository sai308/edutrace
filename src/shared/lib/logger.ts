import { reportError } from './appStatus'

type LogLevel = 'log' | 'warn' | 'error'
export type LogCategory = 'db' | 'worker' | 'storage' | 'ui' | 'parse' | 'navigation'

interface LogEntry {
    level: LogLevel
    category?: LogCategory
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

const RING_BUFFER_SIZE = 128
const STORAGE_KEY = 'edutrace:logs'

function loadFromStorage(): LogEntry[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as LogEntry[]) : []
    }
    catch {
        return []
    }
}

function serializeContext(ctx: unknown): unknown {
    if (ctx instanceof Error)
        return { name: ctx.name, message: ctx.message, stack: ctx.stack }
    return ctx
}

const ring: LogEntry[] = loadFromStorage()

function push(entry: LogEntry) {
    if (ring.length >= RING_BUFFER_SIZE)
        ring.shift()
    ring.push(entry)
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ring))
    }
    catch { /* quota exceeded — survives in memory only */ }
}

function record(level: LogLevel, message: string, context?: unknown, category?: LogCategory) {
    const entry: LogEntry = {
        level,
        ...(category !== undefined && { category }),
        message,
        context: serializeContext(context),
        timestamp: new Date().toISOString(),
    }
    push(entry)
    if (level === 'error')
        reportError()
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console[level](message, ...(context !== undefined ? [context] : []))
    }
}

export const logger = {
    log: (message: string, context?: unknown, category?: LogCategory) => record('log', message, context, category),
    warn: (message: string, context?: unknown, category?: LogCategory) => record('warn', message, context, category),
    error: (message: string, context?: unknown, category?: LogCategory) => record('error', message, context, category),

    /**
     * Build a diagnostics report containing app metadata and recent log entries.
     * Accepts db/locale info from callers to avoid circular imports.
     */
    buildReport(dbVersion: number, locale: string, limit?: number): DiagnosticsReport {
        const logs = limit === undefined ? [...ring] : ring.slice(-limit)
        return {
            generatedAt: new Date().toISOString(),
            appVersion: __APP_VERSION__,
            dbVersion,
            locale,
            userAgent: navigator.userAgent,
            recentLogs: logs,
        }
    },

    /** Export recent log entries as a JSON string for bug reports. */
    export(): string {
        return JSON.stringify(ring, null, 2)
    },
}
