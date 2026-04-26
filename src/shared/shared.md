# Shared

## Purpose

Cross-cutting infrastructure consumed by every feature module. Provides: the IndexedDB singleton and base repository class, workspace lifecycle management, identity reconciliation, settings persistence, backup/restore pipelines, grade conversion utilities, shared TypeScript types, reusable Vue composables, shared UI components, and the `cn()` / `valueUpdater` utility library. Nothing in `src/shared/` is feature-specific — all feature modules depend on it; it depends on nothing outside itself.

---

## Directory Structure

```
src/shared/
├── services/
│   ├── BaseRepository.ts              Generic typed CRUD base class
│   ├── DatabaseService.ts             IndexedDB singleton; schema + migrations
│   ├── StorageService.ts              localStorage / sessionStorage adapter
│   ├── backup.service.ts              Full and selective export/import pipelines
│   ├── settings.repository.ts         Workspace-scoped settings CRUD
│   ├── stats.service.ts               Entity count and storage-size aggregation
│   ├── toast.ts                       Global toast notification state + API
│   ├── opfs.ts                        Origin Private File System (OPFS) adapter
│   ├── workspace.repository.ts        Multi-workspace lifecycle management
│   ├── reconciliation/
│   │   └── IdentityReconciler.ts      Email-first → normalized-name student deduplication
│   └── tests/
│       └── opfs.test.ts
├── composables/
│   ├── useCalendar.ts                 Calendar month navigation + day generation
│   ├── useColors.ts                   Score-based CSS color class resolver
│   ├── useColumnVisibility.ts         Table column visibility with localStorage persistence
│   ├── useFileDrop.ts                 Drag-and-drop handler for CSV files
│   ├── useFormatters.ts               Localized date / time / duration formatters
│   ├── useMarkFormat.ts               Mark display formatting (raw / 5-scale / ECTS)
│   ├── useModalClose.ts               Global ESC-key modal stack manager
│   ├── useQuerySync.ts                Bidirectional URL query ↔ reactive state sync
│   ├── useSort.ts                     Table sort state (field + direction)
│   └── useWorkspace.ts                Active workspace reactive accessor
├── lib/
│   ├── utils.ts                       cn() Tailwind class merger; valueUpdater() for TanStack Table
│   ├── workerError.ts                 WorkerError class, withTimeout(), classifyWorkerError()
│   ├── appStatus.ts                   Global worker-task counter and error flash state
│   └── logger.ts                      Ring-buffer logger with diagnostics report builder
├── components/
│   ├── ColumnPicker.vue               Column visibility dropdown for tables
│   ├── ConfirmModal.vue               Reusable confirmation dialog (danger / primary variants)
│   ├── DataTableColumnHeader.vue      Sortable table header cell
│   ├── DataTableViewOptions.vue       Column visibility dropdown (TanStack Table variant)
│   ├── DropZone.vue                   Drag-and-drop CSV file zone
│   ├── FileImportDialog.vue           Generic Dialog + DropZone wrapper for CSV upload flows
│   ├── FilterModal.vue                Teacher management modal (search, select, persist to settings)
│   └── QrCodeModal.vue                QR code generator modal (meet links)
├── constants/
│   └── headers.ts                     CSV header keyword lists for file detection
├── types/
│   ├── Database.d.ts                  IDBCustomSchema (all stores + indexes)
│   ├── Settings.d.ts                  SettingsMap, PrintSettings, ExamSettings, SettingKey
│   └── workspaces.d.ts                Workspace, CreateWorkspaceOptions, WorkspaceExportData
└── utils/
    ├── grades.ts                      Grade scale conversion functions
    ├── groupNormalization.ts          Fuzzy group-name matcher
    └── workspace-utils.ts             Icon registry for workspace avatars
```

---

## Services

### BaseRepository

Generic base class for all feature repositories. Constructor takes a `StoreName` (keyof `IDBCustomSchema`) and a reference to the `DatabaseService` singleton.

| Method | Description |
|---|---|
| `getAll()` | Return all records in the store |
| `getById(id)` | Lookup by primary key |
| `save(item)` | Upsert (put) — returns the assigned key |
| `delete(id)` | Remove by primary key |
| `bulkPut(items)` | Upsert multiple records in a single transaction |
| `bulkDelete(ids)` | Delete multiple records in a single transaction |
| `clear()` | Wipe entire store |
| `count()` | Return record count |

All `bulk*` operations run inside a single IDB transaction for atomicity.

---

### DatabaseService

Singleton wrapping the `idb` library. Opened lazily on first access via `getInstance()`.

- **DB_VERSION**: `17` (bump here + add migration block when adding stores/indexes).
- **Workspace-aware naming**: default workspace → `'edutrace-db'`; named workspaces → `'edutrace-db-${workspaceId}'`.
- **`initSchema(db, oldVersion, newVersion, transaction)`**: runs incremental `if (oldVersion < N)` migration blocks for every version from 1 to current.

Object stores (11 total):

| Store | Key path | Notable indexes |
|---|---|---|
| `meets` | `id` | `date`, `groupName` |
| `settings` | `key` | — |
| `groups` | `id` | `name` |
| `tasks` | `id` | `normalizedName` (unique) |
| `units` | `id` | `normalizedName` (unique), `ordinal` |
| `marks` | `id` | `task_student` (compound, unique), `studentId`, `taskId` |
| `members` | `id` | `groupName`, `email`, `normalizedName` |
| `modules` | `id` | `groupName` (legacy, kept for compatibility) |
| `finalAssessments` | `id` | `student_type` (compound, unique) |
| `sessions` | `id` | `group_type` (compound, unique), `groupName` |
| `plans` | `id` | `sessionId`, `studentId` |

---

### StorageService

Thin adapter over `localStorage` and `sessionStorage` that auto-serializes/deserializes JSON values. Used for settings keys and workspace metadata that must survive page reloads but live outside IndexedDB.

---

### BackupService

Handles full and per-store export/import with workspace isolation.

**Export:**
- `exportAll()` — serializes all 11 stores into a single JSON object with a `version` field.
- `exportStore(storeName)` — single-store export (used by Settings pages).

**Import:**
- `importAll(data)` — clears all stores then bulk-puts imported records.
- `importStore(storeName, records)` — single-store import; clears store first.
- **Task ID remapping**: on marks import, task IDs from the file are reconciled against existing tasks by `normalizedName`; mismatches are remapped to keep referential integrity.
- **`enrichGroupWithCourse(group, tasks)`**: helper that attaches task details to group records during import for older export formats.
- **Versioned formats**: marks export v3 includes `members` in the same payload.

---

### SettingsRepository

All settings are persisted in localStorage, namespaced per workspace.

**Key scoping rule:**
- Default workspace → bare key (e.g., `'durationLimit'`).
- Named workspace → `'${key}_${workspaceId}'`.

| Method | Description |
|---|---|
| `getDurationLimit()` / `saveDurationLimit(n)` | Minutes cap; `0` = unlimited |
| `getDefaultTeacher()` / `saveDefaultTeacher(name)` | Single default teacher name |
| `getTeachers()` / `saveTeachers(list)` | Teacher list; save triggers member role sync |
| `getIgnoredUsers()` / `saveIgnoredUsers(list)` | Names excluded from analytics |
| `getExamSettings()` / `saveExamSettings(obj)` | Reserved exam config |
| `getPrintSettings()` / `savePrintSettings(obj)` | Print form defaults |
| `getSessionSquash()` / `saveSessionSquash(bool)` | Enable/disable session merging |
| `getSessionSquashThreshold()` / `saveSessionSquashThreshold(n)` | Gap in minutes |
| `clearSettings()` | Remove all keys for the current workspace |

**Side effect on `saveTeachers(list)`**: iterates all `members` records and sets `role = 'teacher'` for names in the list, `role = 'student'` for all others. The members store is the authoritative role source.

**Internal helpers:**
- `_getWorkspaceKey(key)` — generates workspace-scoped key.
- `_getSetting<K>()` — type-coercing getter (string → number/boolean for legacy stored values).
- `_saveSetting<K>()` — type-aware setter.

---

### ToastService — `toast.ts`

Global toast notification state. Exposes a reactive message queue consumed by the app-level `Toaster.vue` component.

| Export | Description |
|---|---|
| `toast.success(msg)` | Green success notification |
| `toast.error(msg)` | Red error notification |
| `toast.info(msg)` | Blue informational notification |
| `toast.warning(msg)` | Amber warning notification |

Messages are auto-dismissed after a configurable timeout. The queue is a Vue `ref` — `Toaster.vue` renders it reactively.

---

### OPFSService — `opfs.ts`

Adapter for the browser's [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) API. Used to store large binary files (e.g., `.docx` templates) outside IndexedDB.

| Method | Description |
|---|---|
| `opfs.saveFile(dir, name, data)` | Write an `ArrayBuffer` or `Blob` to a directory |
| `opfs.getFile(dir, name)` | Read a file as `ArrayBuffer` |
| `opfs.deleteFile(dir, name)` | Remove a file |
| `opfs.listFiles(dir)` | List file names in a directory |
| `opfs.exists(dir, name)` | Check whether a file exists |

Consumed by `documentGenerator` (Sessions module) and the Documents Settings page.

---

### StatsService

Provides aggregate metrics for the Settings UI (count badges and storage size displays).

| Method | Description |
|---|---|
| `getEntityCounts()` | Returns `Record<StoreName, number>` using `db.count()` per store |
| `getEntitySizes()` | Serializes all records to a `Blob` and returns byte size per store |
| `getAllWorkspacesSizes()` | Sums sizes across all workspace databases |

`getEntityCounts()` uses the optimized IDB `.count()` call (does not load records into memory).

---

### WorkspaceRepository

Manages the multi-workspace lifecycle. Workspace metadata is stored in localStorage; each workspace has its own IndexedDB database.

| Method | Description |
|---|---|
| `getWorkspaces()` | List all workspaces |
| `getActiveWorkspace()` | Return the currently selected workspace |
| `setActiveWorkspace(id)` | Switch workspace; triggers DB reconnect |
| `createWorkspace(options)` | Create new workspace; optionally clone settings from current |
| `updateWorkspace(id, data)` | Rename or update workspace metadata |
| `deleteWorkspace(id)` | Delete workspace + its IndexedDB database; `'default'` cannot be deleted |
| `exportWorkspace(id)` | Serialize full workspace data to `WorkspaceExportData` |
| `importWorkspace(data)` | Restore from exported format |

**`MAINTENANCE_STORES`**: a static list of stores that are included in workspace-level backup/restore but excluded from certain bulk-clear operations.

---

### IdentityReconciler

Deduplicates students when the same person appears under different names (e.g., from CSV imports). Processes in priority order:

1. **Email match** — if both the incoming record and an existing member share the same non-empty email, they are the same person.
2. **Normalized-name match** — `name.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '')` compared against current name and all `aliases`.

**Batch safety**: as matches are found, new entries are added to the lookup maps so that subsequent records in the same import batch can match against already-reconciled names.

**Merge strategy**: `{ ...existingStudent, ...incomingMatch }` — incoming fields overwrite existing fields. Callers decide what to persist.

---

## Composables

All composables in `src/shared/composables/` are pure Vue composition functions — no side effects at module load time. Import via `@/shared/composables/<name>`.

| Composable | Returns | Used by |
|---|---|---|
| `useCalendar()` | `{ days, month, year, prev, next }` | Analytics, Reports calendar views |
| `useColors()` | `{ colorClass(score) }` | Students, Reports participant tables |
| `useColumnVisibility(key, defaults)` | `{ visible, toggle, reset }` + localStorage persistence | Groups, Students views |
| `useFileDrop(onFiles)` | `{ isDragging, isInvalid }` drag state | DropZone component |
| `useFormatters()` | `{ formatDate, formatTime, formatDuration, … }` | 10+ views and tables |
| `useMarkFormat()` | `{ getFormattedMark, getMarkTooltip, … }` | Marks, Students, Summary |
| `useModalClose(onClose)` | registers modal in ESC stack | All modal components |
| `useQuerySync(map)` | syncs `ref`s ↔ URL query params | Groups, Students, Marks, Summary, Analytics, Plans |
| `useSort(defaultField)` | `{ sortField, sortDir, toggleSort }` | Students, virtual tables |
| `useWorkspace()` | `{ activeWorkspace }` reactive accessor | Workspace-aware UI components |

---

## Lib

### `lib/utils.ts`

Two foundational utilities used throughout the entire UI layer. Import via `@/shared/lib/utils`.

| Export | Description |
|---|---|
| `cn(...inputs)` | Merges Tailwind class strings via `clsx` + `tailwind-merge`; resolves conflicting utilities correctly |
| `valueUpdater(updaterOrValue, ref)` | Helper for TanStack Vue Table — applies a functional or direct state update to a `Ref` |

`cn()` is imported by virtually every UI component. Never concatenate Tailwind class strings without it.

---

### `lib/workerError.ts`

Typed error boundary utilities for all Web Worker call sites.

| Export | Description |
|---|---|
| `WorkerError` | `Error` subclass with `code: WorkerErrorCode` property |
| `WorkerErrorCode` | `'PARSE_ERROR' \| 'WORKER_TIMEOUT' \| 'SERIALIZATION_ERROR' \| 'UNKNOWN'` |
| `withTimeout<T>(promise, ms)` | Wraps a promise; rejects with `WorkerError('WORKER_TIMEOUT')` if it exceeds `ms` milliseconds |
| `classifyWorkerError(e)` | Converts any thrown value to a typed `WorkerError` by inspecting message/name (DataCloneError → SERIALIZATION_ERROR, "Invalid…" → PARSE_ERROR, else → UNKNOWN) |

Every worker call site (`marks.service.ts`, `summary.service.ts`, `reports.service.ts`) wraps the Comlink call with `withTimeout` and rethrows via `classifyWorkerError`. Composables then map `WorkerError.code` to i18n toast messages under the `workerErrors.*` namespace.

---

### `lib/appStatus.ts`

Global reactive state for worker activity indicators.

| Export | Description |
|---|---|
| `activeWorkerTasks` | `Ref<number>` — count of in-flight worker operations; incremented before, decremented after |
| `hasRecentError` | `Ref<boolean>` — set to `true` on any worker error; auto-clears after 5 s |
| `reportWorkerError()` | Sets `hasRecentError` and schedules the auto-clear timer |

Consumed by the app header to show a loading indicator and a brief error flash.

---

### `lib/logger.ts`

Structured ring-buffer logger. Keeps the last 100 entries in memory; prints to `console` only in dev mode.

| Export | Description |
|---|---|
| `logger.log(msg, ctx?)` | Informational entry |
| `logger.warn(msg, ctx?)` | Warning entry |
| `logger.error(msg, ctx?)` | Error entry |
| `logger.buildReport(dbVersion, locale)` | Returns a `DiagnosticsReport` with app version, DB version, locale, user-agent, and recent log entries |
| `logger.export()` | Returns recent log entries as a formatted JSON string |

All service and composable error catch blocks use `logger.error` rather than `console.error` directly.

---

## Constants

### `headers.ts`

Keyword arrays used by the Reports module to detect file type from CSV column headers:

| Constant | Purpose |
|---|---|
| `MEET_REPORT_KEYWORDS` | Headers that identify a Google Meet attendance CSV |
| `MARKS_CSV_REQUIRED_HEADERS` | Minimum columns a marks CSV must contain |
| `MARKS_CSV_KEYWORDS` | Extended keyword set for marks file detection (EN + UK variants) |

---

## Types

### `Database.d.ts` — `IDBCustomSchema`

Full TypeScript interface for the IndexedDB schema. Each key is a store name mapping to `{ key, value, indexes }`. Used as the generic parameter to `openDB<IDBCustomSchema>()` from the `idb` library, giving compile-time safety on all store and index names.

### `Settings.d.ts`

```typescript
SettingsMap        // All setting keys + their value types
SettingKey         // exported; keyof SettingsMap
PrintSettings      // subject, formOfControl, semester, academicYear, totalHours, examiner, practicalTeacher
ExamSettings       // type alias for Record<string, unknown> — reserved; no properties accessed anywhere
```

### `workspaces.d.ts`

```typescript
Workspace              // id, name, icon, createdAt, isDefault
CreateWorkspaceOptions // name, icon, cloneSettings?
WorkspaceExportData    // workspace metadata + all store records
```

---

## Utilities

### `grades.ts`

All grade conversion functions used across Marks, Summary, Students, and Sessions modules.

| Function / Type | Description |
|---|---|
| `to5Scale(value)` | Convert 100-point → 5-point (thresholds: <60→2, <75→3, <90→4, ≥90→5) |
| `toECTS(value)` | Convert 100-point → ECTS letter (A/B/C/D/E/Fx/F) |
| `getECTSColorClass(ects)` | Returns Tailwind color class string for an ECTS letter (A→green … F→red) |
| `computeECTSStats(grades)` | Counts per ECTS grade and absent over an array of `(number \| null)[]` values |
| `EctsStats` | `{ A, B, C, D, E, FX, F, absent: number }` — return type of `computeECTSStats` |
| `createMarkFormatter(format)` | Returns a formatter function for `'5-scale'`, `'100-scale'`, or `'ects'` |
| `formatMarkToFiveScale(mark)` | Format a `Mark` record's score to 5-scale string |
| `convertGradeTo100(value, format)` | Convert display-scale value back to 100-point internal representation |
| `from5ScaleTo100(value)` | 5-point → 100-point (midpoint mapping) |
| `fromECTSTo100(letter)` | ECTS letter → 100-point midpoint |

Internal representation is always 100-point. Display conversion is applied at render time only.

---

### `groupNormalization.ts` — `normalizeGroupName(name, existingGroups)`

Fuzzy matcher that resolves an input group name to an existing group record:

1. Strip all non-alphanumeric characters (supports Cyrillic): `name.replace(/[^a-zа-яіїєґ0-9]/gi, '')`.
2. Lowercase both sides.
3. Find the first existing group whose normalized name matches.
4. If no match, return the original input unchanged.

Used in `studentsService.saveStudent()` to prevent group name fragmentation from minor formatting differences in imports.

---

### `workspace-utils.ts`

Icon registry for workspace avatar selection UI.

| Export | Contents |
|---|---|
| `scienceIcons` | Science/STEM icon names from `lucide-vue-next` |
| `educationIcons` | Education-themed icon names |
| `businessIcons` | Business/admin icon names |
| `allSelectionIcons` | Union of all three arrays |
| `getIconTitle(iconName)` | Returns human-readable display label for an icon name |

---

## Components

Shared Vue components live in `src/shared/components/`. Import via `@/shared/components/<Name>.vue`. These components have no module-specific business logic — they are generic building blocks reused across two or more feature modules.

### `ColumnPicker.vue`
Dropdown button that lists all available table columns as toggleable items, plus a Reset option. Emits `toggle-column(key)` and `reset`. Used alongside `useColumnVisibility`.

### `ConfirmModal.vue`
General-purpose confirmation dialog. Props: `title`, `message`, `confirmText`, `cancelText`, `variant` (`'danger'` | `'primary'`). Registers with `useModalClose` for ESC support.

### `DataTableColumnHeader.vue`
Table `<th>` cell with sort affordance. Props: `column` (TanStack column object), `title`. Renders sort direction icons and calls `column.toggleSorting()` on click.

### `DataTableViewOptions.vue`
Dropdown menu listing all hideable TanStack Table columns as checkboxes, with a Reset button. Accepts the TanStack `table` instance as a prop.

### `DropZone.vue`
File drop target for CSV uploads. Shows drag-active and invalid-file-type states. Wraps `useFileDrop`. Accepts an optional `prompt` string to override the default drop label. Used inside `FileImportDialog`.

### `FileImportDialog.vue`
Generic Dialog wrapper around `DropZone` for CSV upload flows. Closes itself automatically after files are dropped.

**Props:** `open: boolean`, `isProcessing: boolean`, `title: string`, `description: string`, `prompt?: string`

**Emits:** `update:open`, `files-dropped`

Used by Marks import (`MarksView`) and Reports upload (`ReportsPage`). Callers supply i18n-resolved title/description/prompt.

### `FilterModal.vue`
Teacher management modal for the Settings page. Loads all members from the database, displays a search-filtered list split into Selected / Available sections, persists selections to `settingsRepository`, and emits `update:items` on every change. Supports manual name entry for names not yet in the database.

### `QrCodeModal.vue`
Generates and displays a QR code for a Google Meet join link.

**Props:** `isOpen: boolean`, `meetId: string`, `title: string`

**Features:**
- QR generation via the `qrcode` npm library (rendered to `<canvas>`).
- **Copy link** button: copies the Meet URL to clipboard.
- **Download PNG** button: exports the canvas as a PNG file named after the meet title.

Used by the Analytics module's meet detail view.

---

## Business Rules & Shared Constraints

### Workspace Isolation
Every feature that reads/writes data goes through `DatabaseService.getInstance()`, which returns the database for the currently active workspace. Switching workspaces reconnects to a different IndexedDB database — no data leaks between workspaces.

### normalizedName Uniqueness
Both `tasks` and `units` stores enforce a unique `normalizedName` index. Pattern: `value.toLowerCase().replace(/\s+/g, '')`. Duplicate inserts throw an IDB `ConstraintError`.

### Composite Unique Indexes
- `marks.task_student` — one mark per (taskId, studentId) pair.
- `finalAssessments.student_type` — one assessment per (studentId, assessmentType) pair.
- `sessions.group_type` — one session per (groupName, sessionType) pair.

### Internal Grade Scale
All grade values are stored as 100-point integers internally. Conversion to display scales (5-point, ECTS) happens only at render time via `createMarkFormatter()`.
