# Tasks Module

## Purpose

Maintains the central registry of all assignments and assessable tasks. Each task record defines a unique name, optional date, maximum points, and description. Tasks are referenced by marks (grades) and organized into units (modules) to form the course structure used by the Summary module.

**Primary users:** Teachers defining course assignments; the Marks and Summary modules consume task records to link grades and compute module grades.

---

## Directory Structure

```
Tasks/
├── types/
│   └── tasks.d.ts                     Task interface
├── services/
│   ├── tasks.repository.ts            IndexedDB CRUD; normalizedName uniqueness enforcement
│   ├── tasks.service.ts               normalizeTaskName, buildTask, saveTask orchestration
│   └── tests/
│       ├── tasks.repository.test.ts   Validation rule tests
│       └── tasks.service.test.ts      Pure utility + service integration tests
├── composables/
│   └── useTasks.ts                    Reactive task list; save/delete with i18n toasts
├── pages/
│   └── TasksPage.vue                  Route entry point
└── components/
    ├── TasksView.vue                  Toolbar, paginated table, create/edit/delete actions
    ├── TasksList/
    │   └── columns.ts                 TanStack column definitions (strongly typed emit)
    └── dialogs/
        └── TaskDialog.vue             Create/edit form with validation
```

---

## Data Model

### Task
```typescript
{
  id: string               // UUID
  name: string
  normalizedName: string   // name.toLowerCase().replace(/\s+/g, '') — enforces uniqueness
  maxPoints: number        // Defaults to 0
  description?: string
  date?: string            // ISO date string (optional)
}
```

---

## Business Rules & Logic

### Uniqueness Enforcement
- `normalizedName` has a unique index in IndexedDB.
- On save, the name is normalized: `name.toLowerCase().replace(/\s+/g, '')`.
- If a `ConstraintError` is thrown, a toast is shown: "A task with this name already exists".
- The check is enforced at the database level (not pre-validated in the form).

### Task Creation
1. Generate new UUID for the task ID.
2. Normalize the name to derive `normalizedName`.
3. Coerce `maxPoints` to a number (default `0`).
4. Persist via `tasksRepository.saveTask()`.

### Task Editing
- All fields (name, date, maxPoints, description) are editable.
- A name change re-normalizes `normalizedName`; uniqueness constraint still applies.

### Bulk Delete
- Selected rows are deleted in a single transaction via `tasksRepository.deleteTasks(ids)`.
- Marks and unit references to deleted tasks are **not** automatically cleaned up.

---

## Repository — `tasks.repository.ts`

Validates inputs before any DB write — throws if `name` or `normalizedName` is blank.

| Method | Description |
|---|---|
| `saveTask(task)` | Upsert by ID; validates name/normalizedName; returns task ID |
| `getAllTasks()` | Return all tasks |
| `findTaskByNormalizedName(normalizedName)` | Lookup for deduplication during CSV import |
| `deleteTasks(ids)` | Bulk delete by ID array (transactional) |

---

## Service — `tasks.service.ts`

Pure utilities and orchestration. No Vue imports; fully unit-testable.

| Export | Description |
|---|---|
| `normalizeTaskName(name)` | `name.toLowerCase().replace(/\s+/g, '')` — derives the uniqueness key |
| `buildTask(formData, existingId?)` | Constructs a `Task` from form input: assigns UUID, normalizes, coerces `maxPoints`. Throws if name is empty after trim. |
| `saveTask(formData, existingTask?)` | Calls `buildTask` then `tasksRepository.saveTask`. Propagates `ConstraintError` for duplicate names. |

---

## Composable — `useTasks.ts`

Module-level singleton: `tasks` is a `shallowRef` declared at module scope so all callers share one reactive instance — no redundant IDB fetches when multiple components mount `useTasks()`.

| Return | Description |
|---|---|
| `tasks` | `ShallowRef<Task[]>` — shared singleton task list |
| `loadTasks()` | Fetches all tasks from repository |
| `saveTask(formData, existingTask?)` | Saves via service; returns `true` on success, `false` on error (toast shown). Caller controls dialog close. |
| `deleteTask(task)` | Deletes single task; reloads; shows success toast |
| `bulkDeleteTasks(ids)` | Bulk deletes by id array; reloads; shows success toast |

---

## UI Behavior

### TasksView
- **Search**: real-time global filter on task name.
- **Pagination**: 30 rows per page with Previous/Next buttons.
- **Add Task** button: opens TaskDialog in create mode.
- **Bulk Delete** button: appears when rows are selected; shows selected count.

### Table Columns
Select checkbox, Name, Date, Max Points, Actions dropdown (Copy ID, Edit, Delete with confirmation).

### TaskDialog
- **Create mode**: blank form; name is required.
- **Edit mode**: pre-filled from existing task.
- **Fields**: Name (required), Date (optional), Max Points (optional, default 0), Description (optional).
- **Validation**: name must be non-empty after trim.
- On save: normalizes name, calls `saveTask()`, catches `ConstraintError` for duplicate names.

---

## Settings

Tasks have no module-specific settings. They are workspace-global records shared across all groups.
