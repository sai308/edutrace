# ARCHITECTURE.md — EduTrace

## 1. Overview

EduTrace is a client-side SPA with no backend. Every layer runs in the browser:

```
Browser
├── Vue 3 SPA (Vite + TypeScript)
│   ├── Feature modules  (src/modules/<Name>/)
│   ├── Shared services  (src/shared/services/)
│   └── Web Workers      (src/workers/)
├── IndexedDB            (via `idb` library, one DB per workspace)
├── localStorage         (workspace list, active workspace, settings migration compat)
├── sessionStorage       (log ring-buffer)
└── OPFS                 (Origin Private File System — .docx templates per workspace)
```

---

## 2. Stack

| Concern | Technology |
|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) |
| Language | TypeScript (strict, `noUnusedLocals`, `noUnusedParameters`) |
| Build | Vite + `@vitejs/plugin-vue` |
| Styling | Tailwind CSS v4 (Vite plugin — no PostCSS config) |
| UI primitives | Reka UI (headless, ARIA-compliant) — wrapped in `src/components/ui/` |
| Tables | TanStack Vue Table (`@tanstack/vue-table`) |
| State | Composition API refs + module-level singletons (no Pinia/Vuex) |
| Routing | Vue Router (hash-free, `createWebHistory`) |
| i18n | Vue I18n — `en-US.json` / `uk-UA.json` |
| DB access | `idb` (typed IndexedDB wrapper) |
| Off-thread work | Web Workers via Comlink |
| PWA | `vite-plugin-pwa` (Workbox) |
| Testing | Vitest + JSDOM + `fake-indexeddb` |

---

## 3. Data Layer

### 3.1 Storage topology

| Store | What lives there |
|---|---|
| IndexedDB (per workspace) | All app data (meets, groups, marks, etc.) |
| `localStorage` | Workspace list, active workspace ID, some legacy settings keys |
| `sessionStorage` | Logger ring-buffer (128 entries, key `edutrace:logs`) |
| OPFS | `.docx` templates per workspace (`templates/<workspaceId>/`) |

### 3.2 Access pattern

```
Page / View
  └── Service  (*.service.ts)  — business logic, orchestrates repositories
        └── Repository  (*.repository.ts)  — typed CRUD for one object store
              └── DatabaseService  (singleton)  — IDB connection promise
```

`BaseRepository<T>` (generic over store name) provides: `getAll`, `getById`, `add`, `put`, `delete`, `getAllFromIndex`, and bulk operations. All repository methods are async.

### 3.3 DatabaseService

- Singleton at `src/shared/services/DatabaseService.ts`.
- Exports `databaseService` (instance) and `DB_VERSION = 17`.
- Opens the active workspace's named IDB database on first call to `getDb()`.
- The `upgrade` callback dispatches on `case oldVersion` to run incremental migrations. No data is dropped without user confirmation.
- `DEFAULT_DB_NAME = 'edutrace-db'` (the default workspace database).

### 3.4 Schema — object stores (v17)

| Store | Key | Value | Indexes |
|---|---|---|---|
| `meets` | `string` | `Meet` | `meetId`, `date` |
| `groups` | `string\|number` | `Group` | `meetId`, `name` |
| `tasks` | `number` | `Task` | `name`, `normalizedName` |
| `units` | `number` | `Unit` | `name`, `normalizedName` |
| `marks` | `number` | `Mark` | `taskId`, `studentId`, `task_student`, `createdAt`, `groupName` |
| `members` | `string` | `Member` | `name`, `groupName`, `role` |
| `modules` | `number` | `Module` | `groupId`, `groupName` |
| `finalAssessments` | `number` | `FinalAssessment` | `studentId`, `assessmentType`, `student_type` |
| `sessions` | `string` | `SessionReport` | `groupId`, `sessionType`, `group_type` |
| `plans` | `string` | `Plan` | `studentId`, `sessionType` |
| `settings` | `keyof SettingsMap` | typed value | — |
| `students` | `any` | `any` | — (legacy, migration compat only — do not write) |

### 3.5 Settings

All workspace-scoped settings are stored in the `settings` IDB store via `settings.repository.ts`. The full key inventory is defined in `src/shared/types/Settings.d.ts`:

```
durationLimit         number          — meet duration cap (minutes)
defaultTeacher        string | null   — pre-filled in GroupModal
ignoredUsers          string[]        — excluded from student stats
teachers              string[]        — teacher name list
sessionSquash         boolean         — merge consecutive reconnections (stored in localStorage for backwards compat)
sessionSquashThreshold number         — merge window (minutes), stored in IDB
examSettings          ExamSettings    — reserved for future exam config
printSettings         PrintSettings   — session document defaults (subject, specialty, examiner, etc.)
summaryThresholds     Record<groupId, SummaryThresholds>   — per-group eligibility config
```

### 3.6 Workspace isolation

Each workspace is an independent named IDB database. The workspace list and active ID live in `localStorage`. `WorkspaceRepository` manages:
- CRUD on the workspace list
- `switchWorkspace(id)` → sets active ID in `localStorage` → caller does `window.location.reload()`
- Multi-workspace export/import (serializes all 11 stores per workspace to JSON)
- Settings copy on workspace creation (`CreateWorkspaceOptions.exportSettings`)

---

## 4. Module Structure

```
src/modules/<ModuleName>/
  components/
    <Feature>List/
      DataTable.vue      — TanStack table owner; exposes `table` via defineExpose; toolbar/footer are slots
      columns.ts         — createColumns(emit, t, ...extras) factory; no component state
  composables/           — reactive state wrappers around services
  pages/                 — route-level components
  views/                 — embedded view components (tabs, sub-sections)
  services/
    *.service.ts         — business logic
    *.repository.ts      — IDB access for one store
    tests/               — Vitest unit/integration tests
  types/                 — *.d.ts domain types
  models/                — (optional) classes/enums (e.g. session.model.ts)
```

**Active modules:** `Analytics`, `Groups`, `Marks`, `Members`, `Plans`, `Reports`, `Sessions`, `Settings`, `Students`, `Summary`, `Tasks`, `Units`.

> Note: The sidebar/UI label "Modules" maps to `src/modules/Units/` and the `units` IDB store. The `modules` store is a separate concept managed by `src/modules/Summary/`.

---

## 5. Routing

All main routes are under `DashboardLayout` (sidebar + header). Static pages use `DefaultLayout`.

```
/                      → redirect to /attendance/analytics
/settings              → GlobalSettingsPage       (no DB guard)
/about                 → AboutPage                (no DB guard)
/guide                 → GuidePage                (no DB guard)

/attendance/analytics           → AnalyticsPage
/attendance/analytics/:id       → AnalyticsDetailsPage
/attendance/reports             → ReportsPage
/attendance/reports/:id         → ReportDetailsPage
/attendance/settings            → ReportsSettingsPage

/org/groups                     → GroupsPage
/org/students                   → StudentsPage
/org/members                    → MembersPage
/org/settings                   → OrganizationSettingsPage

/control/marks                  → MarksPage
/control/modules                → UnitsPage          (UI label: "Modules")
/control/summaries              → SummariesPage
/control/tasks                  → TasksPage
/control/settings               → ControlSettingsPage

/documents/session              → SessionsPage
/documents/individual           → PlansPage
/documents/settings             → DocumentsSettingsPage
```

A `beforeEach` guard calls `databaseService.getDb()` before entering any route under `/attendance`, `/org`, `/control`, or `/documents`. Navigation is cancelled if the DB fails to open. `/settings`, `/about`, `/guide` are exempt.

---

## 6. Shared State Pattern

High-frequency composables use **module-level singleton refs** — state declared outside the function body so all callers share one reactive instance, avoiding redundant IDB fetches:

```ts
// module-level singleton
const meets = ref<Meet[]>([])
const isLoading = ref(false)

export function useMeets() {
  // all callers share the same `meets` ref
  return { meets, isLoading, ... }
}
```

Applies to: `useMeets`, `useGroups`, `useTasks`, `useMarks`.

Route-parameterized composables (`useAnalyticsDetails`, `useStudentProfile`) remain per-instance.

---

## 7. Web Workers

Three workers in `src/workers/`, exposed via Comlink:

| Worker | Exposes | Timeout |
|---|---|---|
| `parser.worker.js` | `parseMarksCSV(text, filename, groupName)`, `parseMeetReport(text, filename)` | 30 000 ms |
| `summary.worker.js` | `calculateSummary(...)` → `StudentSummaryData[]` | 60 000 ms |
| `groups.worker.js` | `processGroupsData(...)` → per-group stats (avgMark, mode, median, attendance) | — |

All call sites wrap with `withTimeout` and `classifyWorkerError` from `src/shared/lib/workerError.ts`:
- `WorkerError(code, message)` — typed error, codes: `PARSE_ERROR | WORKER_TIMEOUT | SERIALIZATION_ERROR | UNKNOWN`
- `withTimeout<T>(promise, ms)` — rejects with `WorkerError('WORKER_TIMEOUT')` on expiry
- `classifyWorkerError(e)` — coerces any thrown value into a `WorkerError`

Workers are mocked globally in `tests/setup.ts` (JSDOM has no real Worker).

---

## 8. Document Generation

Two patterns for `.docx` output:

### 8.1 Template-based (Sessions)

Files in `src/modules/Sessions/services/`:
- `templateGenerator.ts` — `generateTemplateBlob(): Blob` — produces a starter `.docx` with Mustache placeholders in OOXML. Users download, customize in Word/LibreOffice, re-upload.
- `documentGenerator.ts` — `generateFromTemplate(options)` — reads template from OPFS, fills placeholders via **docxtemplater** + **PizZip**, returns `Blob`.
- `sessionDocument.service.ts` — orchestrates: reads `PrintSettings`, resolves OPFS template (falls back to generated starter), calls `documentGenerator`.

Custom templates are stored per workspace in OPFS at `templates/<workspaceId>/`.

### 8.2 Raw OOXML (Summary)

`src/modules/Summary/services/summaryExport.service.ts` assembles OOXML in memory with **PizZip** directly (no template):
- `exportSummaryDocx(students, groupName): Blob` — A4, Times New Roman, 9921 twips content width
- `exportSummaryCsv(students, groupName): Blob` — plain CSV

Strips `status`, `statusCause`, `completedAt`; sorts students A-Z via `localeCompare`.

**Rule:** user-customizable documents → docxtemplater + OPFS; non-customizable → raw OOXML helpers.

---

## 9. CSV Import Pipeline (Marks)

```
MarksImportDialog.vue
  └── useMarksFileQueue composable
        ├── mode: 'known-only'   — skip files whose filename prefix ≠ any group
        └── mode: 'create-on-fly' — pause queue on unknown prefix
              ├── AlertDialog: "Create group or Skip?"
              ├── marksService.suggestMeetIdsForFile(file)
              │     ├── Path 1: CSV student names ↔ Meet.participants → meetId
              │     └── Path 2: CSV student names ↔ Member records → groupName → meetId
              └── GroupModal (pre-filled with top-ranked meetId)
```

Parsing runs in `parser.worker.js` (PapaParse via Comlink). Identity resolution uses `IdentityReconciler` — priority: email match → normalized name match → new record.

---

## 10. Observability

### Logger (`src/shared/lib/logger.ts`)

Ring buffer (128 entries) persisted to `sessionStorage` under `edutrace:logs`. Categories: `db | worker | storage | ui | parse | navigation`. In dev mode, entries also go to `console`. `logger.error()` calls `reportError()` to set the 5-second error indicator in the UI.

```ts
logger.log(message, context?, category?)
logger.warn(message, context?, category?)
logger.error(message, context?, category?)
logger.buildReport(dbVersion, locale, limit?) → DiagnosticsReport
logger.export() → JSON string of ring buffer
```

### App status (`src/shared/lib/appStatus.ts`)

Two module-level refs:
- `activeWorkerTasks: ref(0)` — incremented/decremented by worker call sites (drives loading indicator)
- `hasRecentError: ref(false)` — set true by `reportError()`, auto-clears after 5 s

---

## 11. PWA

- `registerType: 'prompt'` — SW waits for user approval before activating.
- `injectRegister: null` — no auto-registration script; `PwaUpdatePrompt.vue` uses `useRegisterSW()` directly.
- Workbox precaches: `**/*.{js,css,html,ico,png,svg,woff,woff2}`.
- `navigateFallback: '/index.html'` — SPA offline fallback for all navigation requests.
- `clientsClaim: true` — new SW takes control of all open tabs immediately.
- Update polling: every hour via `r.update()` in `PwaUpdatePrompt.vue`.
- No runtime caching rules needed (all data is IndexedDB).

---

## 12. Build & Chunking

Manual chunks (Rollup `manualChunks`):

| Chunk | Contents |
|---|---|
| `vendor-vue` | vue, vue-router, @vue/* |
| `vendor-i18n` | vue-i18n, @intlify |
| `vendor-ui` | reka-ui |
| `vendor-table` | @tanstack |
| `vendor-charts` | @unovis (analytics pages only) |
| `vendor-docs` | docxtemplater, pizzip, docx-preview (documents section only) |
| `vendor-qrcode` | qrcode (groups page only) |
| `vendor-icons-index` | lucide entry/index |
| `vendor-icons-1` | lucide icons a–m |
| `vendor-icons-2` | lucide icons n–z |
| `vendor-icons-core` | lucide core utilities |
| `vendor-vueuse` | @vueuse |
| `vendor-date` | date-fns |
| `vendor` | remaining node_modules |

`build.modulePreload: { polyfill: true }` emits `<link rel="modulepreload">` for all static entry-point imports so chunks are fetched in parallel with HTML parsing.

---

## 13. Testing

| Test type | Location | Notes |
|---|---|---|
| Service unit/integration | `src/modules/*/services/tests/` | Uses real `fake-indexeddb` — no DB mocks |
| Repository bulk ops | `src/shared/services/tests/BaseRepository.bulk.test.js` | |
| Workspace CRUD | `src/shared/services/tests/workspace.repository.test.ts` | Export/import round-trips |
| Locale service | `src/services/tests/locale.service.test.ts` | |
| IDB migrations | `tests/migrations/database-migrations.test.ts` | Seeds old version, triggers `getDb()`, asserts schema |
| Marks import E2E | `tests/integration/marks-import.test.ts` | CSV text → worker parse → reconcile → fake IDB |
| Worker logic | `src/workers/tests/` | |

**Key constraints:**
- `vi.resetModules()` runs in `beforeEach` — use static imports in integration tests; dynamic `import()` creates orphaned DB connections that block `deleteDatabase`.
- `File` is globally stubbed (`tests/setup.ts`) — the real `File` API is unavailable in JSDOM.
- `beforeEach` deletes all test databases, clears localStorage/sessionStorage, resets module registry.

---

## 14. First-load UX

`index.html` includes two inline scripts that run before any JS bundle:
1. **Theme** — reads `localStorage['vueuse-color-scheme']`, adds `.dark` to `<html>` to prevent flash.
2. **Loading spinner** — `#app-loading` inside `#app`: 112 px logo + CSS ring animation. Removed when Vue mounts.

---

## 15. Shared Utilities Reference

**`src/shared/services/`** — singletons:

| File | Purpose |
|---|---|
| `DatabaseService.ts` | IDB singleton, migrations, `getDb()` |
| `BaseRepository.ts` | Generic typed CRUD base class |
| `settings.repository.ts` | Workspace settings get/set |
| `workspace.repository.ts` | Workspace CRUD + multi-workspace backup |
| `backup.service.ts` | Single-workspace JSON export/import |
| `stats.service.ts` | Record counts + estimated storage size |
| `toast.ts` | `toast.success/error/info/warning(msg, ms?)` |
| `StorageService.ts` | `local` / `session` typed localStorage/sessionStorage adapters |
| `opfs.ts` | OPFS read/write/delete helpers |
| `reconciliation/IdentityReconciler.ts` | Email-first → name-normalized CSV-to-member matching |

**`src/shared/utils/`** — pure functions (no Vue, no services):

| File | Exports |
|---|---|
| `grades.ts` | `to5Scale`, `toECTS`, `toNationalGrade`, `to100Scale`, `normalizeImportScore`, `createMarkFormatter`, `convertGradeTo100`, `from5ScaleTo100`, `fromECTSTo100`, `computeECTSStats`, `getECTSColorClass` |
| `download.ts` | `downloadBlob(blob, filename)`, `downloadJson(data, prefix)` |
| `groupNormalization.ts` | `normalizeGroupName(input, existingGroups)` — canonical name matching |
| `workspace-utils.ts` | Icon lists (`allSelectionIcons`), `getIconTitle(pascalName)` |

**`src/shared/composables/`** — cross-module:

| Composable | Purpose |
|---|---|
| `useFormatters` | Date, duration, mark, percentage formatters |
| `useMarkFormat` | Grade scale conversion composable |
| `useCompactName` | "First L." compact display |
| `useCalendar` | Calendar grid, month nav, localized weekday names |
| `useQuerySync` | Two-way URL query ↔ ref binding |
| `useWorkspace` | Singleton workspace refs + `loadWorkspaces()` |
| `useWorkspaceModals` | Dialog state for workspace CRUD |
| `useFileDrop` | Drag-drop event handler |
| `useColors` | Attendance score → Tailwind class (`getScoreColor`) |
| `usePwaInstall` | PWA install prompt + deferred trigger |
| `useAppStatus` | `activeWorkerTasks`, `hasRecentError` |
| `useModalClose` | Esc + click-outside dismiss |
