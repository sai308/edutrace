# Marks Module

## Purpose

Imports, stores, and manages student grades for tasks. Accepts CSV exports from grading tools, parses them in a Web Worker, reconciles student and task identities against existing records, and persists marks with duplicate detection. Provides filtering, sync-status tracking, and bulk operations on the resulting mark records.

**Primary users:** Teachers who import grade sheets and track which marks have been synced to external systems.

---

## Directory Structure

```
Marks/
├── types/
│   └── marks.d.ts                   Mark, FlatMark, MarksParsedData, ReconciliationResult, BulkSaveStats, Member (re-export)
├── services/
│   ├── marks.repository.ts          IndexedDB CRUD with validation, duplicate detection, and sync tracking
│   ├── marks.service.ts             Orchestrates parsing → reconciliation → persistence
│   ├── tests/
│   │   ├── marks.service.test.ts    Unit tests for MarksService (mocked repositories)
│   │   └── marks.repository.test.ts Integration tests for MarksRepository (fake-indexeddb)
│   └── reconciliation/
│       ├── MarksReconciler.ts       Resolves parsed data against existing students and tasks
│       └── MarksReconciler.test.js
├── composables/
│   ├── useMarks.ts                  Reactive state: groups, marks, suggestions; CRUD + import operations
│   └── useMarksFileQueue.ts         File queue state machine: parse filenames, match groups, queue processing
├── pages/
│   └── MarksPage.vue                Route entry; syncs `?group=` query param; wires composable to view
├── views/
│   └── MarksView.vue                Filter state, filteredMarks computed, delete UI, delegates file queue to composable
└── components/
    ├── MarksList/
    │   ├── DataTable.vue            TanStack table renderer (typed props: ActiveFilters, MarkFormat, Group)
    │   └── columns.ts               Column definitions; exports UIMark, ActiveFilters types
    ├── MarksImportModal.vue         Drag-drop file upload dialog
    └── MarksFilterSheet.vue         Side panel with advanced filters; exports MarksFilters type
```

---

## Data Model

### Mark
```typescript
{
  id?: string | number
  taskId: string
  studentId: string
  score?: number
  value: string | number       // Display value
  maxPoints?: number
  synced?: boolean             // Sent to external system
  syncedAt?: string | null
  createdAt: string
  updatedAt?: string
  groupName: string
}
```

### FlatMark (denormalized for display)
```typescript
{
  id: string | number
  studentName: string
  groupName: string
  taskName: string
  taskDate: string
  maxPoints?: number
  score?: number
  synced?: boolean
  createdAt: string
}
```

### UIMark (FlatMark + UI tooltip state, in columns.ts)
```typescript
interface UIMark extends FlatMark {
  showTooltip?: boolean;
}
```

### ActiveFilters (view-level filter state, in columns.ts)
```typescript
interface ActiveFilters {
  synced: 'all' | 'unsynced';
  dateFrom: string;
  group: string | null;
  hideFailed: boolean;
}
```

### BulkSaveStats
```typescript
{ added: number; updated: number; skipped: number }
```

---

## Business Rules & Logic

### CSV Import Flow
1. File text is sent to `parser.worker` via Comlink → returns `MarksParsedData`.
2. Group name is normalized via `normalizeGroupName()`.
3. `MarksReconciler.reconcile()` resolves parsed students and tasks against the database.
4. Resolved students are bulk-upserted; tasks are bulk-upserted.
5. Marks are bulk-persisted via `bulkSaveSafe()`.
6. Returns `{ newMarksCount, skippedMarksCount, updatedMarksCount }`.

### Student Reconciliation
- `IdentityReconciler` matches parsed names to existing members via email first, then normalized name.
- New members receive a UUID and are created; existing members retain their IDs.

### Task Reconciliation
- Task names are normalized (`toLowerCase().replace(/\s+/g,'')`).
- Collisions within the same batch (e.g., "Task 1" and "Task1" → same key) are resolved via incremental Map seeding.
- A Map-based deduplication pass prevents `ConstraintError` during bulk insert.

### Mark Persistence Rules (`bulkSaveSafe`)
- **Validation**: `taskId`, `studentId`, and `groupName` are required — throws if missing.
- **Synced mark**: skip entirely (do not overwrite). Counts as `skipped`.
- **Existing mark, score unchanged, not synced**: skip (no write needed). Counts as `skipped`.
- **Existing mark, score changed, not synced**: update score. Counts as `updated`.
- **New mark**: insert with provided `createdAt`. Counts as `added`.

### Sync Toggle
- Flips `synced` boolean; sets `syncedAt = now` when syncing, `syncedAt = null` when unsyncing.
- Synced marks are protected from CSV re-import overwrite.
- `marksService.toggleSynced` accepts `Pick<Mark, 'id' | 'synced'>` — works with both `Mark` and `FlatMark`.

---

## Repository — `marks.repository.ts`

| Method | Description |
|---|---|
| `saveMark(mark)` | Upsert single mark via composite index; validates required fields |
| `bulkSaveSafe(marks)` | Persist multiple marks with validation; return BulkSaveStats |
| `getMarksByTask(taskId)` | Query by taskId index |
| `getMarksByStudent(studentId)` | Query by studentId index |
| `getMarksByGroup(groupName)` | Query by groupName index |
| `updateMarkSynced(id, synced)` | Toggle sync status + set/clear syncedAt |
| `deleteMarks(ids)` | Bulk delete by ID array |
| `getAllMarks()` | Return all marks (raw) |
| `getAllMarksWithRelations()` | Return marks with resolved task/student names; skips orphaned marks |
| `getMarksByGroupWithRelations(groupName)` | Filtered marks with resolved names |
| `getMarksByStudentIds(studentIds)` | Marks for a set of students |

---

## Service — `marks.service.ts`

`processFile` wraps the Comlink parser call with `withTimeout(30_000)` and rethrows via `classifyWorkerError`. The composable maps `WorkerError.code` to i18n toasts (`workerErrors.*`).

| Method | Returns | Description |
|---|---|---|
| `processFile(file, groupName)` | `MarksProcessingStats` | Parse CSV (30 s timeout) → reconcile → persist |
| `toggleSynced(mark)` | `boolean` | Flip and persist sync status; accepts `Pick<Mark, 'id'\|'synced'>` |
| `deleteMark(id)` | void | Remove single mark |
| `deleteMarks(ids)` | void | Remove multiple marks |
| `loadGroups()` | `Group[]` | Fetch groups, sorted naturally |
| `createGroup(groupData)` | `Group` | Create group with UUID |
| `loadSuggestions()` | `{allMeetIds, allTeachers}` | For import form autocomplete |
| `loadMarksData(groupName?)` | `FlatMark[]` | Denormalized marks, optionally filtered by group |

---

## Composables

### `useMarks.ts`
Reactive bridge between `MarksPage` and `marksService`. Exposes reactive `groups`, `flatMarks`, `isProcessing`, `isLoading`, `allMeetIds`, `allTeachers`. All CRUD operations emit toast notifications including `updatedMarksCount`.

### `useMarksFileQueue.ts`
Encapsulates the sequential file import state machine. Accepts `groups: Ref<Group[]>` and callbacks `{ onProcessFile, onCreateGroup }`. Exposes `showGroupModal`, `pendingGroup`, `handleFilesDropped`, `handleCreateGroup`, `handleGroupModalClose`. Group name is parsed from `{prefix}_*.csv` filenames with dash-normalization fallback.

---

## UI Behavior

### MarksPage
- Reads `?group=` query param on mount; sets initial group selection.
- Reloads marks when the query param changes (e.g. back/forward navigation).
- Delegates all state management to `useMarks`.

### MarksView
- Filter state (`filterSynced`, `filterDateFrom`, `filterGroup`, `filterHideFailed`) and `filteredMarks` computed live here.
- File queue delegation: `useMarksFileQueue` owns `fileQueue`, `pendingGroup`, `showGroupModal`.
- **Filter sheet** (MarksFilterSheet): sync status (all / unsynced default), date-from, hide-failed (persisted to localStorage).
- **Filter badge**: shows active filter count on the filter button (synced, dateFrom, hideFailed counted).
- **Table** (TanStack): columns — select, added date, student, group, task, score, sync actions, delete.
- **Bulk actions**: delete selected rows (with confirmation).
- **Column visibility**: toggled via DataTableViewOptions.

---

## Settings

The Marks module has no dedicated settings keys. It reads:
- `teachers` — available as suggestions in the import workflow.
- Group and task data are managed bidirectionally within the module.
