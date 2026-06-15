import type { App } from 'vue'
import { logger } from './logger'

/**
 * Install global error handlers that funnel every unhandled failure into the
 * logger ring buffer (and therefore into the diagnostics export / app status
 * indicator) without any extra wiring at call sites.
 *
 * Three surfaces are covered:
 *   1. Vue component errors  — app.config.errorHandler
 *   2. Unhandled promise rejections — window.onunhandledrejection
 *   3. Uncaught synchronous errors  — window.onerror
 *
 * Each call site passes the `'ui'` category so the entries are easy to filter
 * in the diagnostics export. `logger.error` fires `reportError()` automatically,
 * so the header error indicator is set with no extra code here.
 *
 * @see guidelines/observability.md
 */
export function installGlobalErrorHandler(app: App): void {
    // 1. Vue component error boundary
    //    `info` is a Vue-specific string describing the lifecycle hook or handler
    //    that threw (e.g. "setup function", "v-on handler").
    app.config.errorHandler = (err, _instance, info) => {
        logger.error(`Vue error [${info}]`, err instanceof Error ? err : new Error(String(err)), 'ui')
    }

    // 2. Unhandled promise rejections (async code outside Vue's error boundary)
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason
        const err = reason instanceof Error ? reason : new Error(String(reason ?? 'Unknown rejection'))
        logger.error('Unhandled promise rejection', err, 'ui')
    })

    // 3. Uncaught synchronous errors (e.g. top-level script errors, third-party)
    window.addEventListener('error', (event) => {
        // Ignore cross-origin script errors — they arrive with no useful info.
        if (!event.error && !event.message)
            return
        const err = event.error instanceof Error
            ? event.error
            : new Error(event.message || 'Unknown error')
        logger.error('Uncaught error', err, 'ui')
    })
}
