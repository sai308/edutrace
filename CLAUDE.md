# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EduTrace** is an offline-first educational management SPA (Vue 3 + TypeScript) for tracking attendance, grades, and student/group records. All data is stored client-side in IndexedDB — there is no backend server. The app supports multiple workspaces (isolated IndexedDB databases) and two UI languages (English, Ukrainian).

## Commands

```bash
pnpm dev              # Start Vite dev server
pnpm build            # Type-check + build for production
pnpm check            # Type-check only (no build)
pnpm test             # Run all tests with Vitest
pnpm test:ui          # Vitest with browser UI
pnpm test:coverage    # Generate coverage report
```

**Run a single test file:**
```bash
pnpm vitest run src/modules/Marks/services/tests/marks.service.test.ts
```

**Run tests matching a pattern:**
```bash
pnpm vitest run --reporter=verbose -t "test name pattern"
```

## MANDATORY: Use LeanKG — No Exceptions

**NEVER use grep, find, or Read to navigate code without trying LeanKG first.**

Before ANY codebase search or navigation task, use LeanKG MCP tools. This is a hard rule, not a suggestion.

| Task                          | Required tool                  |
|-------------------------------|--------------------------------|
| Where is X defined?           | `search_code` or `find_function` |
| What breaks if I change Y?    | `get_impact_radius`            |
| What tests cover Y?           | `get_tested_by`                |
| How does X work?              | `get_context`                  |
| Overview of a file            | `query_file`                   |
| Dependencies of X             | `get_dependencies`             |

Fallback to `grep`/`Read` **only** if LeanKG returns no result or errors. If you fall back, note why.

## Architecture

### Data Layer

All persistence goes through `src/shared/services/DatabaseService.ts` — a singleton wrapping IndexedDB via the `idb` library. The schema is versioned (currently v17) with explicit migration handlers per version bump.

The access pattern is: **Page/View → Service → Repository → DatabaseService**

- **Repositories** (`*.repository.ts`) extend `BaseRepository<StoreName>` and provide typed CRUD + query methods for a single object store.
- **Services** (`*.service.ts`) contain business logic, orchestrate multiple repositories, and expose data to Vue components.

Object stores: `meets`, `groups`, `tasks`, `units`, `marks`, `members`, `modules`, `finalAssessments`, `sessions`, `plans`, `settings`. A legacy `students` store exists in the schema (key: `any`, value: `any`) for migration compatibility — do not write to it.

### Programmatic DOCX Generation

Two different approaches are used for `.docx` generation:

**Template-based (Sessions):** `src/modules/Sessions/services/` uses **docxtemplater** + **PizZip** to fill a `.docx` template stored in OPFS with session data. Three files collaborate:
- `templateGenerator.ts` — generates a blank starter template (Mustache placeholders in OOXML) and returns it as `generateTemplateBlob(): Blob`. Users can download this, customize it in Word/LibreOffice, and re-upload it. The template holds all the academic form structure.
- `documentGenerator.ts` — `documentGenerator.generateFromTemplate(options)` reads the template from OPFS, fills Mustache placeholders via docxtemplater, and optionally saves the output back to OPFS. Returns the generated `Blob`.
- `sessionDocument.service.ts` — orchestrates the above: reads `PrintSettings`, resolves the correct OPFS template, calls `documentGenerator`, handles fallback if no custom template exists.

**Raw OOXML (Summary):** `src/modules/Summary/services/summaryExport.service.ts` assembles a minimal OOXML package in memory using **PizZip** directly (no template, no docxtemplater):
- `exportSummaryDocx(students, groupName): Blob` — produces the final grade summary table. Uses OOXML helper functions (`run`, `para`, `tc`, `tr`, `tbl`). A4 format, Times New Roman, narrow margins (9921 twips content width), column widths in twips (`dxa`).
- `exportSummaryCsv(students, groupName): Blob` — plain CSV output of the same data.

The summary export strips `status`, `statusCause`, and `completedAt` fields and sorts students alphabetically (A-Z) via `localeCompare`. When adding a new raw DOCX generator (without a user-editable template), follow the OOXML helper pattern. For user-customizable documents, follow the docxtemplater + OPFS pattern.

**Summary module serialization:** `src/modules/Summary/services/examSerialization.ts` defines `SummaryTask` and `SummaryModule` interfaces and exports `serializeTask(task)` / `serializeModule(module)` helpers used when persisting module data to the `modules` store.

### Web Workers

Heavy computations are offloaded to Web Workers via [Comlink](https://github.com/GoogleChromeLabs/comlink):
- `src/workers/parser.worker.js` — CSV parsing (PapaParse). Exposes `parseMarksCSV(text, filename, groupName)` and `parseMeetReport(text, filename)`. When `groupName` is empty, the parser falls back to extracting it from the filename prefix (`{prefix}_*.csv`).
- `src/workers/summary.worker.js` — Summary/grade aggregation. Exposes `calculateSummary(...)` which aggregates marks, modules, and attendance data into `StudentSummaryData[]`.
- `src/workers/groups.worker.js` — Group stats computation. Exposes `processGroupsData(...)` which computes `avgTaskCompletion`, `avgMark`, mode mark, median mark, member counts, all Meet IDs, and all teacher names per group. Used by `groups.service.ts`.

Workers are mocked globally in `tests/setup.ts`.

**Worker error handling** — all worker call sites wrap calls with `withTimeout` and `classifyWorkerError` from `src/shared/lib/workerError.ts`:
- `WorkerError(code, message)` — typed error class with `code: WorkerErrorCode` (`PARSE_ERROR | WORKER_TIMEOUT | SERIALIZATION_ERROR | UNKNOWN`).
- `withTimeout<T>(promise, ms)` — rejects with `WorkerError('WORKER_TIMEOUT')` if the promise exceeds `ms`.
- `classifyWorkerError(e)` — converts any thrown value into a `WorkerError` by inspecting message/name.

Timeout constants: parser worker `30_000 ms`, summary worker `60_000 ms`. Components map error codes to i18n toast messages via `workerErrors.*` keys.

### Module Structure

Feature modules live under `src/modules/<ModuleName>/` and follow a consistent layout:

```
src/modules/<ModuleName>/
  components/     # Vue components specific to this feature
    <Feature>List/
      DataTable.vue   # TanStack table — owns state, exposes table ref, toolbar/footer are slots
      columns.ts      # createColumns(emit, t, ...) factory
  composables/    # Vue composables (reactive state + service wrappers)
  pages/          # Page-level components (used by router)
  views/          # View-level components (embedded in pages)
  services/       # Business logic + repositories
    tests/        # Unit tests for services
  types/          # TypeScript type declarations (*.d.ts)
  models/         # (optional) Domain model classes/enums (e.g. session.model.ts, plan.model.ts)
```

Modules: `Analytics`, `Groups`, `Marks`, `Members`, `Plans`, `Reports`, `Sessions`, `Settings`, `Students`, `Summary`, `Tasks`, `Units`.

### Shared Services & Utilities

**`src/shared/services/`** — application-level singletons used across modules:

| File | Purpose |
|---|---|
| `DatabaseService.ts` | IndexedDB singleton (v17), schema migrations, `getDb()` |
| `BaseRepository.ts` | Abstract base class for all repositories — typed CRUD, bulk ops, index queries |
| `settings.repository.ts` | Workspace-scoped settings get/set (key-value in `settings` store). Keys defined in `src/shared/types/Settings.d.ts` — `SettingsMap`: `durationLimit`, `defaultTeacher`, `ignoredUsers`, `teachers`, `sessionSquash`, `sessionSquashThreshold`, `examSettings`, `printSettings`, `summaryThresholds` (per-group `SummaryThresholds` keyed by group ID) |
| `workspace.repository.ts` | Workspace CRUD; multi-workspace export/import/wipe — workspace list and active ID in `localStorage`, full IDB data (all 11 stores) per workspace in separate named databases |
| `backup.service.ts` | Single-workspace export/import — serializes all IDB stores of the active workspace to JSON |
| `stats.service.ts` | App-level statistics: record counts and estimated storage size per entity |
| `toast.ts` | Toast notification singleton — `toast.success/error/info/warning(msg, ms?)` |
| `StorageService.ts` | `localStorage` abstraction with typed key access |
| `opfs.ts` | Origin Private File System helpers — read/write/delete files in OPFS per workspace |
| `reconciliation/IdentityReconciler.ts` | Name/email matching for CSV import: matches CSV rows to existing Member records |

**`src/shared/utils/`** — pure utility functions (no Vue, no services):

| File | Purpose |
|---|---|
| `grades.ts` | Grade scale conversions: `to5Scale`, `toECTS`, `toNationalGrade`, `to100Scale`, `normalizeImportScore`, `createMarkFormatter`, `convertGradeTo100` (any format → 100pt), `from5ScaleTo100`/`fromECTSTo100` (reverse), `computeECTSStats`, `getECTSColorClass` |
| `download.ts` | `downloadBlob(blob, filename)` and `downloadJson(data, prefix)` — browser download helpers |
| `groupNormalization.ts` | `normalizeGroupName(input, existingGroups)` — strips non-alphanumeric chars and matches input against existing group names, returning canonical casing |
| `workspace-utils.ts` | Icon lists for workspace picker (`scienceIcons`, `educationIcons`, `businessIcons`, `allSelectionIcons`) and `getIconTitle(name)` — converts PascalCase icon name to display label |

**`src/shared/composables/`** — cross-module Vue composables:

| Composable | Purpose |
|---|---|
| `useFormatters` | Date, duration, mark, percentage formatters — call in `.vue`, pass functions into `createColumns` |
| `useMarkFormat` | Grade scale conversion (raw → 5-point, 100-point, ECTS) |
| `useCompactName` | Formats full name as "First L." for compact display |
| `useCalendar` | Calendar grid generation (`generateCalendarDays`), month navigation, localized weekday names |
| `useQuerySync` | Two-way URL query ↔ ref binding for sort/filter persistence across navigation |
| `useWorkspace` | Module-level singleton refs: `workspaces`, `currentWorkspaceId`, `activeWorkspace`. Exposes `loadWorkspaces()` to refresh from `localStorage`. `DashboardLayout` uses it in a `watchEffect` to override `--primary`, `--primary-foreground`, `--workspace-color`, `--sidebar-accent`, and `--sidebar-accent-foreground` on `:root` whenever the workspace changes. Actual switching is done by `workspaceRepository.switchWorkspace()` followed by `window.location.reload()`. |
| `useWorkspaceModals` | Workspace management dialog state (create/edit/delete/import) |
| `useFileDrop` | File drag-drop event handler |
| `useColors` | Attendance score → Tailwind class mapping (`getScoreColor`) |
| `usePwaInstall` | PWA install prompt detection and deferred install trigger |
| `useAppStatus` | App initialization state + DB error flag |
| `useModalClose` | Esc key + click-outside dismiss logic for custom overlays |

### Marks CSV Import Flow

The import UI lives in `src/modules/Marks/components/MarksImportDialog.vue` and is driven by the `useMarksFileQueue` composable (`src/modules/Marks/composables/useMarksFileQueue.ts`).

**Import modes** (persisted via `useStorage`):
- `known-only` — files whose filename prefix does not match any existing group are silently skipped.
- `create-on-fly` — unknown group prefix pauses the queue and triggers a two-step confirmation:
  1. An `AlertDialog` asks "Create group or Skip?". This is a **blocking decision point** (not destructive), so `AlertDialog` is used to prevent Esc-dismissal from leaving the queue in limbo.
  2. If the user chooses Create, `marksService.suggestMeetIdsForFile(file)` runs before the `GroupModal` opens. It returns candidate Meet IDs ranked by participant-name overlap with the students in the CSV, using two lookup paths:
     - **Path 1 (meets):** CSV student names vs. `participants` in existing `Meet` records → meetId of matching meets.
     - **Path 2 (members):** CSV student names vs. existing `Member` records → their `groupName` → the `meetId` of that group.
  3. The top-ranked meetId (if any) is pre-filled into the GroupModal's Meet ID field. All known meetIds remain available in the dropdown as a fallback.

**Queue completion:** when all files are processed the import dialog closes itself automatically (emits `update:open, false`) and the parent reloads marks data. The file queue display and close button are only shown once at least one file has entered the queue.

### Path Aliases

Defined in `vite.config.ts` and mirrored in `tsconfig.app.json`:

| Alias | Resolves to |
|---|---|
| `@` | `src/` |
| `@Analytics` | `src/modules/Analytics` |
| `@Groups` | `src/modules/Groups` |
| `@Marks` | `src/modules/Marks` |
| `@Members` | `src/modules/Members` |
| `@Plans` | `src/modules/Plans` |
| `@Reports` | `src/modules/Reports` |
| `@Sessions` | `src/modules/Sessions` |
| `@Students` | `src/modules/Students` |
| `@Summary` | `src/modules/Summary` |
| `@Tasks` | `src/modules/Tasks` |
| `@Units` | `src/modules/Units` |

### Routing

All routes are under `DashboardLayout` (sidebar + header). `DashboardLayout` runs a `watchEffect` that overrides `--primary`, `--primary-foreground`, `--workspace-color`, `--sidebar-accent`, and `--sidebar-accent-foreground` on `:root` from the active workspace color. `--primary-foreground` is auto-computed for WCAG contrast using `contrastForeground(hex)`. This makes all `bg-primary`/`text-primary` utilities, hover states, and the sidebar active accent automatically workspace-colored with no per-component logic. See `DESIGN.md §2 — Workspace color accent` for the full surface inventory.

Route groups by nav section:
- `/attendance/` — analytics, reports, settings
- `/org/` — groups, students, members, settings
- `/control/` — marks, modules, summaries, tasks, settings
- `/documents/` — session, individual plans

Routes are lazy-loaded. Each route has `meta.title` and `meta.breadcrumbs`.

A `beforeEach` guard in `src/router/index.ts` calls `databaseService.getDb()` before entering any module route (`/attendance`, `/org`, `/control`, `/documents`). Navigation is cancelled if the DB is unavailable. Static routes (`/about`, `/guide`, `/settings`) are exempt.

**Global Settings** (`/settings`) — `src/pages/GlobalSettingsPage.vue` — cross-workspace settings page linked from the sidebar footer. Sections: Appearance (language + theme), Workspaces (list, per-workspace export, import, delete), Sync (coming-soon placeholder), Dev & Diagnostics (app/DB version, copy diagnostics). Uses `workspaceRepository` for workspace CRUD and `localeService` for locale persistence. Exempt from the DB guard because workspace metadata lives in `localStorage`, not IndexedDB.

**Control Settings** (`/control/settings`) — `src/modules/Settings/pages/ControlSettingsPage.vue` — data management page for Marks, Tasks, and Modules (JSON export/import/delete per store) plus a **Summary Export** card. Summary Export lets the user select a group, then download the final grade table as CSV or DOCX. Status and date columns are excluded; students are sorted A-Z. The card calls `summaryService.getGroups()` on mount, then on export: fetches modules via `summaryService.getModulesByGroup()`, loads grades via `summaryService.loadExamData()`, and delegates file generation to `summaryExport.service.ts`.

**Reports Settings** (`/attendance/settings`) — `src/modules/Settings/pages/ReportsSettingsPage.vue` — attendance/meet data management. Sections: meet data export/import/delete, `durationLimit` setting (auto-applies to all meets on save), `sessionSquashThreshold` setting (minutes for merging back-to-back meets).

**Organization Settings** (`/org/settings`) — `src/modules/Settings/pages/OrganizationSettingsPage.vue` — data management for Students, Groups, and Members stores (JSON export/import/delete per store).

**Documents Settings** (`/documents/settings`) — `src/modules/Settings/pages/DocumentsSettingsPage.vue` — manages `PrintSettings` (subject, specialty, examiner, etc.) persisted via `settings.repository`, plus OPFS template upload/download/delete for the session document generator.

### UI Components

Reka UI (headless, accessible) is the component primitive library. Custom wrappers live in `src/components/ui/`. Styling uses Tailwind CSS v4 (with the Vite plugin — no PostCSS config needed).

### Tables

All data tables use **TanStack Vue Table** (`@tanstack/vue-table`). The canonical pattern per module is:

- `<Feature>List/columns.ts` — exports `createColumns(emit, t, ...extras)`. Column definitions only; no component state.
- `<Feature>List/DataTable.vue` — imports columns, owns all TanStack state (sorting, filtering, selection, visibility), exposes `table` via `defineExpose`, provides `toolbar` and `footer` named slots so parent pages control search inputs, bulk actions, and pagination controls.

Shared table utilities in `src/shared/components/`:
- `DataTableColumnHeader.vue` — sortable column header with animated sort icons. Use for every sortable column; never render sort icons manually.
- `DataTableViewOptions.vue` — column visibility dropdown. Receives the `table` instance.

Rules to follow:
- Global text search is always wired as `watch(searchQuery, q => table.setGlobalFilter(q))` — never pre-filter the data array before passing it to `useVueTable`.
- Default visibility hides optional stat columns (e.g. `modeMark`, `medianMark` in Groups) via the initial `columnVisibility` ref.
- `useFormatters()` is a composable — call it in the `.vue` file and pass the needed functions into `createColumns`, not inside `columns.ts` directly.
- See `guidelines/tables.md` for the full rule set with code examples (sub-documents: `table-features.md`, `table-layout.md`, `table-columns.md`, `table-sticky.md`).

### Internationalization

Vue I18n with locale files at `src/locales/en-US.json` and `src/locales/uk-UA.json`. Always add new keys to both files.

#### Long-form content: locale-split components

Vue I18n is for UI strings — button labels, error messages, short phrases. **Do not use i18n JSON for long-form content** (guide pages, documentation, rich multi-section text). JSON key fragmentation makes long content unreadable and unmaintainable for translators.

Instead, use **locale-split TypeScript data modules** loaded via dynamic import:

```
src/pages/guide/
  en-US.ts          ← full English content as typed data array
  uk-UA.ts          ← full Ukrainian content (imports shared types from en-US.ts)
GuidePage.vue       ← shell: watchEffect + dynamic import based on locale
```

```ts
// GuidePage.vue pattern
const sections = shallowRef<GuideSection[]>([])
watchEffect(async () => {
    const mod = locale.value === 'uk-UA'
        ? await import('./guide/uk-UA')
        : await import('./guide/en-US')
    sections.value = mod.sections
})
```

Rules:
- The data modules are pure TypeScript — no Vue imports, no i18n calls. Icons are referenced by Lucide name string and resolved by the shell component.
- `uk-UA.ts` imports the shared type (`GuideSection`) from `en-US.ts` to stay in sync.
- Vite code-splits each locale module automatically; the SW precaches both chunks so offline works.
- Structural changes (adding a section) require edits to both files — this is intentional and mirrors what a translation process requires.

## Testing

Tests use **Vitest** with JSDOM. Key setup in `tests/setup.ts`:
- `fake-indexeddb` provides an in-memory IndexedDB — no real browser needed.
- `beforeEach` resets the DB connection, deletes all test databases, clears storage, and calls `vi.resetModules()` so repository singletons are rebuilt per test.
- `File` is globally stubbed with a mock implementation.

When writing tests for repositories or services, rely on the fake-indexeddb setup — do not mock the database.

**Test suites:**
- `src/modules/*/services/tests/` — unit/integration tests per module service.
- `src/shared/services/tests/workspace.repository.test.ts` — workspace CRUD, export/import round-trips with IDB data verification.
- `src/services/tests/locale.service.test.ts` — `localeService` get/set/round-trip and `getTranslation` key resolution.
- `tests/migrations/database-migrations.test.ts` — IDB schema migration tests. Each test seeds an old-version database via `openDB`, then triggers `databaseService.getDb()` to run migrations and asserts the resulting schema/data.
- `tests/integration/marks-import.test.ts` — end-to-end import pipeline: CSV text → `workerForTesting.parseMarksCSV` → `MarksReconciler.reconcile` → real fake-indexeddb repositories.

**Critical:** Integration tests must use static imports (not dynamic `import()`). `vi.resetModules()` in `beforeEach` creates orphaned DB connections if modules are dynamically re-imported per test, causing `deleteDatabase` to block.

## PWA

EduTrace is a fully installable PWA. The setup uses **`vite-plugin-pwa`** (Workbox under the hood) with `registerType: 'prompt'`.

### Service Worker strategy

Since all data lives in IndexedDB and there is no backend API, the SW only needs to precache static build outputs:

- `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']` — everything Vite emits is precached at build time.
- No runtime caching rules are needed.
- `cleanupOutdatedCaches: true` — stale SW caches from previous versions are removed automatically.
- `clientsClaim: true` — new SW takes control of all open tabs immediately after activation.

### Update flow

`registerType: 'prompt'` means the SW waits for user approval before activating. `PwaUpdatePrompt.vue` (`src/components/PwaUpdatePrompt.vue`) uses `useRegisterSW` from `virtual:pwa-register/vue` and shows a fixed bottom banner with a **Reload** button when `needRefresh` is true. SW registration also polls for updates every hour via `r.update()`.

The first-install `offlineReady` event fires a toast via the existing toast service.

### Icons

Source icon: `public/logo.svg`. Generated assets (committed to `public/`):
- `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`
- `maskable-icon-512x512.png` — padded for Android adaptive icons
- `apple-touch-icon-180x180.png`
- `favicon.ico`

To regenerate icons after changing `public/logo.svg`:
```bash
pnpm pwa:icons
```
Config: `pwa-assets.config.ts`.

### Adding new cacheable file types

If the app starts serving a new static asset type (e.g. `.wasm`, `.json`), add the extension to `globPatterns` in `vite.config.ts` → `VitePWA → workbox`.

## Guidelines

Architectural decisions and coding conventions are documented in `guidelines/` and at the repo root:

- `DESIGN.md` — UI/UX principles: layout, color tokens, typography, spacing, component patterns, page anatomy (including the **Header Row Pattern** — always `flex-row`, mandatory items counter on mobile, static description on desktop, icon-only buttons on mobile, no `border-b`, `text-2xl` fixed), modal rules, feedback, icons, animation, and responsive conventions.
- `guidelines/tables.md` — canonical rules for data tables: core pattern (Rules 1–3) + checklist. Sub-documents: `table-features.md` (filtering, pagination, bulk), `table-layout.md` (page anatomy, mobile toolbar), `table-columns.md` (date cells, row actions, ordinal, compact names), `table-sticky.md` (sticky header/columns, z-index).
- `guidelines/detail-pages.md` — canonical structure for entity detail pages with a multi-view tab switcher (header zone, stats strip, view content, URL sync, loading/not-found states).
- `guidelines/dialogs.md` — surface types (Dialog / AlertDialog / Sheet), sizing, anatomy, props API, stack depth, scrollable dialogs, profile dialog pattern, and migration plan for hand-rolled overlays.
- `guidelines/calendar-views.md` — canonical structure for calendar views inside detail pages: multi-session variant (AnalyticsCalendarView) vs. single-session variant (ReportCalendarView), `useCalendar` composable usage, month jump-on-mount pattern.
- `guidelines/edge-cases.md` — diagnosed performance and correctness edge cases with fixes and rules to prevent recurrence (e.g. TanStack search freeze, memory leak from unstable data references, Set/Array type mismatches).
- `guidelines/empty-states.md` — canonical rules for empty state rendering: two-scenario model (no-data-at-all vs. filtered-empty), header row visibility matrix, data-source selector persistence rule, no-selection placeholder variant, and navigation CTA patterns.
- `guidelines/dropdown-pickers.md` — canonical shape for single-value selector dropdowns (`DropdownMenu` + `Button` trigger, `bg-primary/15 text-primary font-medium` on active item). Covers group pickers and format/scale pickers. Includes exclusion: `TeamSwitcher.vue` uses `Check` icon instead.
- `guidelines/observability.md` — client-side observability architecture: logger (ring buffer, sessionStorage persistence, Error serialization, categories), app status indicator, worker error handling pattern (`withTimeout` + `classifyWorkerError` + `activeWorkerTasks`), stats service, diagnostics export, and checklist for new modules.

## First-load UX

`index.html` includes two inline pieces that run before any JS bundle loads:

1. **Theme script** — reads `localStorage['vueuse-color-scheme']` synchronously and adds `.dark` to `<html>` if needed, preventing a flash of wrong theme.
2. **Loading spinner** — `#app-loading` inside `#app`: a 112 px lockup with the project logo centered inside a CSS ring animation. Vue removes it when the app mounts (the app root replaces `#app` content).

The build also emits `<link rel="modulepreload">` for all static entry-point imports (`build.modulePreload: { polyfill: true }` in `vite.config.ts`), so chunks are fetched in parallel with HTML parsing.

## Shared State Pattern

High-frequency composables (`useMeets`, `useGroups`, `useTasks`, `useMarks`) use **module-level singleton refs** — state variables are declared outside the function body so all callers share one reactive instance. This avoids redundant IndexedDB fetches when multiple components mount the same composable.

Composables that are parameterized by route (e.g. `useAnalyticsDetails`, `useStudentProfile`) remain per-instance.

## TypeScript

Strict mode is enabled with `noUnusedLocals` and `noUnusedParameters`. Fix all type errors before committing. The project uses `.d.ts` files within each module's `types/` folder for domain type definitions.
