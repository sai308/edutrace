# Observability & Diagnostics

EduTrace is offline-first with no backend. All observability is client-side: in-memory ring buffer, sessionStorage persistence, a live status indicator, and a user-triggered diagnostics export.

---

## Architecture overview

```
Every catch block
      │
      ▼
logger.error(msg, err, category?)
      │
      ├─► ring buffer (128 entries, sessionStorage-backed)
      │
      └─► reportError()  ──►  hasRecentError = true (5 s TTL)
                                      │
                              AppStatusIndicator
                              (header icon: idle / working / error / offline)
```

Worker-heavy composables additionally:
```
activeWorkerTasks.value++   (before worker call)
activeWorkerTasks.value--   (finally)
      │
      ▼
AppStatusIndicator → 'working' state (spinner)
```

---

## 1. Logger — `src/shared/lib/logger.ts`

Ring buffer of 128 `LogEntry` objects. Silent in production (no `console` output). Restored from `sessionStorage` on module load so entries survive a same-tab page reload.

### LogEntry shape

```ts
interface LogEntry {
    level: 'log' | 'warn' | 'error'
    category?: LogCategory   // optional — see categories below
    message: string
    context?: unknown        // Error objects are serialized to { name, message, stack }
    timestamp: string        // ISO 8601
}
```

### API

```ts
logger.log(message, context?, category?)
logger.warn(message, context?, category?)
logger.error(message, context?, category?)

logger.buildReport(dbVersion, locale, limit?): DiagnosticsReport
logger.export(): string   // full ring as JSON
```

`logger.error` automatically calls `reportError()` — every logged error briefly sets the header error indicator with no extra code at call sites.

### Error context serialization

Pass raw `Error` objects as `context`. The logger serializes them to `{ name, message, stack }` before storing. This preserves stack traces through JSON round-trips (raw `Error` objects serialize to `{}`).

```ts
// correct — stack is preserved
logger.error('DB write failed', e)

// wrong — context loses the stack
logger.error('DB write failed', { message: e.message })
```

### Categories

`LogCategory = 'db' | 'worker' | 'storage' | 'ui' | 'parse' | 'navigation'`

Category is optional. Omit it when the context makes the origin obvious. Add it at high-value sites where filtering the diagnostics export by category is useful.

```ts
logger.error('Failed to load groups data:', error, 'worker')
logger.error('StorageService: Error getting key', e, 'storage')
logger.error('Database unavailable during navigation:', e, 'navigation')
```

### Persistence

Ring buffer is written to `sessionStorage` key `edutrace:logs` on every push. Survives same-tab page reloads. Does **not** persist across tabs or after the browser session ends. On quota error the write is silently skipped and entries survive in memory only.

---

## 2. App Status — `src/shared/lib/appStatus.ts`

Module-level reactive signals consumed by `useAppStatus` and surfaced in the header.

```ts
export const activeWorkerTasks = ref(0)   // count of in-flight worker operations
export const hasRecentError = ref(false)  // true for 5 s after any reportError() call

export function reportError(): void       // sets hasRecentError, resets 5 s timer
export const reportWorkerError = reportError  // legacy alias — prefer reportError
```

`reportError` is called automatically by `logger.error`. Call it explicitly only when skipping the logger (rare).

---

## 3. App Status Indicator — `src/components/AppStatusIndicator.vue`

Icon in the dashboard header. Driven by `useAppStatus` which derives a single `AppStatus` from the signals above plus `useOnline()`.

| Status | Condition | Visual |
|---|---|---|
| `offline` | `!isOnline` | WifiOff (yellow) |
| `working` | `activeWorkerTasks > 0` | Loader2 spinner (primary) |
| `error` | `hasRecentError` | CircleAlert (destructive) |
| `idle` | baseline | green dot |

Priority: `offline > working > error > idle`.

---

## 4. Worker error handling — `src/shared/lib/workerError.ts`

Typed error class wrapping all Web Worker failures.

```ts
type WorkerErrorCode = 'PARSE_ERROR' | 'WORKER_TIMEOUT' | 'SERIALIZATION_ERROR' | 'UNKNOWN'

class WorkerError extends Error {
    readonly code: WorkerErrorCode
}

withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>
classifyWorkerError(e: unknown): WorkerError
```

### Worker call pattern

All three workers (Marks, Summary, Groups) follow the same pattern:

```ts
// in the service
const result = await withTimeout(this.worker.doWork(...payload), 30_000)
    .catch(e => { throw classifyWorkerError(e) })

// in the composable
activeWorkerTasks.value++
try {
    await service.doWork(...)
}
catch (e) {
    logger.error('Work failed:', e, 'worker')
    if (e instanceof WorkerError && e.code === 'WORKER_TIMEOUT')
        toast.error(t('workerErrors.timeout'))
    else if (e instanceof WorkerError && e.code === 'PARSE_ERROR')
        toast.error(e.message)
    else
        toast.error(t('workerErrors.unknown'))
}
finally {
    activeWorkerTasks.value = Math.max(0, activeWorkerTasks.value - 1)
}
```

Timeout constants: parser worker `30_000 ms`, summary worker `60_000 ms`, groups worker `30_000 ms`.

### Rules

- Always wrap worker calls with `withTimeout` + `classifyWorkerError`. Never await a worker call bare.
- Increment `activeWorkerTasks` in the **composable**, not the service. Services are UI-agnostic.
- Map `WorkerError.code` to i18n toast keys (`workerErrors.*`). Never show raw error messages to users from worker failures.

---

## 5. Stats service — `src/shared/services/stats.service.ts`

On-demand (not real-time). Used in settings pages and the diagnostics export.

```ts
getEntityCounts(): Promise<EntityCounts>   // IDB .count() per store
getEntitySizes(): Promise<EntitySizes>     // Blob(JSON.stringify(data)).size per entity
getAllWorkspacesSizes(): Promise<Record<string, number>>
```

Size estimation uses `Blob` (not `JSON.stringify(...).length`) for accurate UTF-8 byte counts.

---

## 6. Diagnostics export — `src/pages/GlobalSettingsPage.vue`

Dev & Diagnostics section exposes two user actions:

| Action | Content | Format |
|---|---|---|
| Copy Diagnostics | Last 10 log entries + app/DB version + userAgent | JSON to clipboard |
| Export Logs | Full 128-entry ring | JSON file download |

Both call `logger.buildReport(DB_VERSION, locale, limit?)`.

`DiagnosticsReport` shape:

```ts
interface DiagnosticsReport {
    generatedAt: string   // ISO 8601
    appVersion: string    // from __APP_VERSION__
    dbVersion: number
    locale: string
    userAgent: string
    recentLogs: LogEntry[]
}
```

---

## Adding observability to a new module

Checklist for any new module that runs worker operations:

1. **Service** — wrap worker call with `withTimeout` + `classifyWorkerError`.
2. **Composable** — track `activeWorkerTasks.value++/--` around the async call.
3. **Error handling** — `catch` block calls `logger.error(msg, e, 'worker')` and maps `WorkerError.code` to i18n toast.
4. **Non-worker errors** — `logger.error(msg, e)` in every catch block. `reportError()` fires automatically; no extra wiring needed.
5. **Category** — pass `LogCategory` as the third arg when the source isn't obvious from message alone.
