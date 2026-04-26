# Units Module

## Purpose

Defines the course structure by grouping tasks into named units (modules) with weighted grading coefficients. Each unit specifies which tasks contribute to a module grade, which task serves as a "test", and the relative weight of tasks vs. the test. Units are consumed by the Summary module to compute per-module grades and overall exam eligibility.

**Primary users:** Teachers designing course assessment structure; Summary module reads units to calculate student grades.

---

## Directory Structure

```
Units/
├── types/
│   └── units.d.ts               Unit interface
├── services/
│   ├── units.repository.ts      IndexedDB CRUD; ordinal management; normalizedName uniqueness
│   ├── units.service.ts         Pure utilities: normalizeUnitName, buildUnit; orchestration: saveUnit (duplicate check)
│   └── tests/
│       ├── units.repository.test.ts  Repository validation and upsert routing tests
│       └── units.service.test.ts     Service pure-function and duplicate-detection tests
├── composables/
│   └── useUnits.ts              Reactive state + toast-wrapped CRUD operations for views
├── pages/
│   └── UnitsPage.vue            Route entry; thin orchestrator using useUnits()
└── components/
    ├── UnitsList/
    │   ├── UnitsListDataTable.vue  TanStack table with drag-to-reorder support
    │   └── columns.ts              Column definitions
    └── dialogs/
        └── UnitDialog.vue          Multi-step form: Details → Tasks → Test Task → Grading
```

---

## Data Model

### Unit
```typescript
{
  id?: number
  name: string
  normalizedName: string     // name.toLowerCase().replace(/\s+/g, '') — uniqueness index
  taskIds: string[]          // Ordered list of task IDs assigned to this unit
  testTaskId: string | null  // Optional: one of taskIds designated as the test
  taskCoef: number           // Weight of task average in module grade formula
  testCoef: number           // Weight of test score in module grade formula
  description?: string
  ordinal?: number           // Display sort order (1-indexed, auto-assigned)
  createdAt?: string
  updatedAt?: string
  workspaceId?: string
}
```

### Grade Formula (applied in Summary worker)
```
moduleGrade = (mean(taskScores) × taskCoef) + (testScore × testCoef)
```

---

## Business Rules & Logic

### Uniqueness Enforcement
- `normalizedName` has a unique index in IndexedDB.
- On save, `findUnitByNormalizedName()` is called; if an existing unit with a different ID is found, an error toast is shown and save is aborted.

### Ordinal Assignment
- New units automatically receive `ordinal = max(existing ordinals) + 1` via `getNextOrdinal()`.
- Editing an existing unit preserves its current ordinal.

### Test Task Constraint
- `testTaskId` must be one of the task IDs already in `taskIds`.
- If a task is unchecked from `taskIds`, it is also cleared from `testTaskId` automatically.
- Setting `testTaskId = null` is valid (unit has no test component).

### Bulk Delete
- Selected units are deleted via `unitsRepository.bulkDelete(ids)`.
- Task records referenced by deleted units are **not** automatically cleaned up.

### Reordering
- "Reorder" mode is toggled via a button in the toolbar.
- In reorder mode, table rows become draggable.
- On drop, the local array is updated; saving calls `unitsRepository.updateOrdinals(updates)` to persist new positions.
- Ordinals are re-assigned as 1-indexed contiguous integers.

---

## Service Layer

### `units.service.ts`

| Export | Description |
|---|---|
| `normalizeUnitName(name)` | Lowercase + strip all whitespace → uniqueness key |
| `buildUnit(formData, existingUnit?)` | Construct a `Unit` object; trims name, sets defaults, preserves `id`/`ordinal`/`createdAt` when editing |
| `saveUnit(formData, existingUnit?)` | Validates name, checks for duplicates via repository, calls `buildUnit` then `unitsRepository.saveUnit`; throws `DuplicateUnitError` on conflict |

`buildUnit` defaults: `taskIds: []`, `testTaskId: null`, `taskCoef: 1`, `testCoef: 1`, `description: ''`.
Coefficients of `0` or falsy are coerced to `1`.

### `useUnits.ts` (composable)

| Return | Description |
|---|---|
| `units` | `Ref<Unit[]>` — reactive list sorted by ordinal |
| `availableTasks` | `Ref<Task[]>` — all tasks, for populating UnitDialog |
| `loadData()` | Fetches both units and tasks |
| `saveUnit(formData, existing?)` | Calls service; shows success/`DuplicateUnitError`/generic-error toasts; returns `boolean` |
| `deleteUnit(unit)` | Deletes with confirmation-style toast feedback |
| `bulkDeleteUnits(ids)` | Batch delete with toast feedback |
| `saveOrder(units)` | Persists ordinal reorder via `unitsRepository.updateOrdinals` |

`saveUnit` returns `true` on success so the caller can close the dialog only when the save succeeds.

---

## Repository — `units.repository.ts`

| Method | Description |
|---|---|
| `saveUnit(unit)` | Validates non-empty `name` and `normalizedName`; upsert by ID; auto-assigns ordinal for new units; returns ID |
| `getAllUnits()` | Return all units |
| `findUnitByNormalizedName(normalizedName)` | Index lookup for duplicate detection |
| `getNextOrdinal()` | Return `max(ordinal) + 1` or `1` if no units exist |
| `updateOrdinals(updates)` | Batch-update `ordinal` field for multiple units (transactional) |
| `bulkDelete(ids)` | Delete multiple units by ID (transactional) |

---

## UI Behavior

### UnitsPage
- Uses `useUnits()` composable; no direct repository calls or inline normalization logic.
- Loads all units and available tasks on mount via `loadData()`.
- **Add Unit** button: opens UnitDialog in create mode.
- **Reorder** button: toggles drag-to-reorder mode; persists via `saveOrder()` on toggle-off.
- **Bulk Delete** button: appears when rows are selected; calls `bulkDeleteUnits(ids)`.
- Dialog close is gated on `saveUnit()` returning `true` (errors keep the dialog open).

### UnitsListDataTable
Columns: select checkbox, Name, Tasks Count, Has Test (Yes/No), Task Coefficient, Test Coefficient, Actions (Edit / Delete).

**Drag-to-reorder** (when reorder mode active):
- Rows become draggable (`draggable="true"`).
- Visual drop indicator (line above/below) shows insertion position.
- Dragged row shown at 50% opacity.
- On drop: array is reordered; `update-order` event emitted.

### UnitDialog — 4-Step Form

| Step | Icon | Content |
|---|---|---|
| 1. Details | FileText | Name (required), Description |
| 2. Tasks | ListTodo | Searchable checkbox list of all tasks; selected tasks float to top |
| 3. Test Task | Target | Dropdown to pick one task from selected set (or None) |
| 4. Grading | Calculator | taskCoef and testCoef number inputs; summary of selected tasks with test badge |

- **Next** button gated by `canProceed` (Step 1 requires a non-empty name).
- **Save** on final step: emits `save` with form data to parent.
- Parent (via composable) handles service call, toast feedback, and list reload.

---

## Settings

Units have no module-specific settings. They are workspace-global records defining the course structure for all groups.
