# Plans Module

## Purpose

Records Individual Education Plans (IEPs) for students by capturing a grade snapshot from the most recent closed session at the moment the plan is created. Plans are immutable grade records — the grade does not change if sessions are later modified. Supports toggling a sync flag to signal that a plan has been submitted to an external curriculum system.

**Primary users:** Teachers and advisors managing IEP documentation and submission tracking.

---

## Directory Structure

```
Plans/
├── composables/
│   └── usePlans.ts              Reactive view logic: data loading, filtering, stats, sync toggle
├── models/
│   └── plan.model.ts            Plan interface and SessionType reference
├── pages/
│   └── PlansPage.vue            Thin page component: uses usePlans, renders table and stats bar
└── services/
    ├── plans.repository.ts      IndexedDB CRUD for plan records with input validation
    ├── plans.service.ts         Plan lifecycle: initialization, grade snapshot, sync toggle
    └── tests/
        └── plans.service.test.ts  Unit tests for PlansService (31 tests)
```

---

## Data Model

### Plan
```typescript
{
  id: string                   // UUID
  studentId: string
  iep: string                  // Copied from student.iep at creation time (immutable)
  grade: number | null         // 0–100 scale; captured from most recent closed session
  dateApplied: string          // ISO datetime of plan creation
  sessionType: SessionType     // Session type at time of grade capture
  isSynced: boolean
  syncedAt: string | null      // ISO datetime of last sync; null if never synced
}
```

---

## Business Rules & Logic

### Plan Initialization
- Only students with a non-empty `iep` field are eligible.
- On first call for a student, `initializePlan()`:
  1. Validates `studentId` and `iep` are non-empty (throws otherwise).
  2. Searches all **closed** sessions in descending order of `closedAt`.
  3. Finds the most recent session entry for the student with a non-null grade.
  4. Captures `{ grade, dateApplied, sessionType }` as an immutable snapshot.
  5. If no graded closed session exists: `grade = null`, `dateApplied = now`, `sessionType = 'MAIN'`.
  6. Creates the plan with `isSynced = false`, `syncedAt = null`.
- Subsequent calls return the **existing** plan unchanged — plans are never recreated.

### Grade Immutability
- `grade` and `dateApplied` are set once at creation and never updated.
- Only `isSynced` and `syncedAt` are mutable after creation.
- This protects the documented grade from retroactive session edits.

### Sync Toggle
- `toggleSync(id, isSynced)`:
  - Validates `id` is non-empty (throws otherwise).
  - Returns `null` if the plan does not exist.
  - Syncing (`true`): sets `syncedAt = now`.
  - Unsyncing (`false`): sets `syncedAt = null`.
- After any sync toggle, the full plan list is reloaded from the database to ensure accuracy.

### Group Filter Default
- On mount, the page auto-selects the first group that contains students with IEP data.

---

## Composable — `usePlans.ts`

Encapsulates all reactive state and view-facing logic. PlansPage imports only from this composable.

| Export | Type | Description |
|---|---|---|
| `plans` | `Ref<Plan[]>` | All persisted plans |
| `students` | `Ref<Member[]>` | Students with role=student and iep set |
| `groups` | `Ref<Group[]>` | All groups (for filter dropdown) |
| `filterGroup` | `Ref<string \| null>` | Currently selected group filter; synced to `?group=` URL param |
| `studentPlans` | `ComputedRef<StudentPlanItem[]>` | Merged student+plan rows, filtered by group |
| `stats` | `ComputedRef<EctsStats>` | ECTS grade distribution (A–F + absent) over visible rows |
| `handleToggleSync` | `async function` | Creates or updates a plan on sync toggle; shows toast on result |
| `loadData` | `async function` | Loads all data from repositories and seeds latestGrades cache |

### Exported types
```typescript
type GradeSnapshot = { grade: number | null; date: string; type: SessionType; sessionId: string }
interface StudentPlanItem { student: Member; plan: Plan | undefined; hasPlan: boolean }
// Stats type is EctsStats from @/shared/utils/grades
```

---

## Repository — `plans.repository.ts`

| Method | Description |
|---|---|
| `savePlan(plan)` | Validates required fields (id, studentId, iep); upserts plan; returns plan ID |
| `getPlansByStudentId(studentId)` | Query all plans for a student |
| `getAll()` | Return all plans |
| `getById(id)` | Return single plan |
| `delete(id)` | Remove plan |

**Validation rules** in `savePlan`:
- `id` must be a non-empty string
- `studentId` must be a non-empty string
- `iep` must be a non-empty string

---

## Service — `plans.service.ts`

| Method | Returns | Description |
|---|---|---|
| `getAllPlans()` | `Plan[]` | Fetch all plans |
| `getPlansByStudentId(studentId)` | `Plan[]` | Plans for a specific student |
| `savePlan(plan)` | `Plan` | Validates all required fields + sessionType; persist and return |
| `getGradeSnapshotFromSessions(studentId)` | `{grade, date, type, sessionId} \| null` | Read-only grade lookup from closed sessions |
| `initializePlan(studentId, iep)` | `Plan` | Create plan with grade snapshot; idempotent; validates inputs |
| `toggleSync(id, isSynced)` | `Plan \| null` | Update sync fields only; validates id |
| `deletePlan(id)` | `void` | Remove plan record |

Both `PlansService` (class) and `plansService` (singleton) are exported.

**Validation rules** in `savePlan`:
- `id`, `studentId`, `iep` must be non-empty strings
- `dateApplied` must be present
- `sessionType` must be one of `'MAIN' | 'FIRST_RETAKE' | 'SECOND_RETAKE'`

---

## UI Behavior

### PlansPage
- Uses `usePlans()` composable — no reactive state or business logic inline.
- Uses `getECTSColorClass` from `@/shared/utils/grades` — no local display helpers.
- Displays only students with `role = 'student'` **and** a populated `iep` field.
- **Group filter dropdown**: filters table to one group; synced to `?group=` URL query param.
- **ECTS grade stats bar**: horizontal bar showing grade distribution (A → F + No Grade); updates reactively on sync changes.

### Table Columns
Student name, IEP, Grade (numeric + ECTS letter with color), Date Applied, Sync toggle (Switch), Synced At.

**ECTS color mapping**: A = green, B = emerald, C = yellow, D/E = orange, FX/F = red.

### Sync Toggle Behavior
1. If plan already exists: calls `toggleSync()` directly.
2. If plan does not exist yet: calls `initializePlan()` first, then `toggleSync()`.
3. Reloads all plans from the database after every toggle to maintain reactive consistency.

---

## Path Alias

The module is accessible via the `@Plans` alias (e.g., `@Plans/composables/usePlans`, `@Plans/models/plan.model`).

---

## Settings

Plans are not directly configurable. Grade data originates from the Sessions module. The `printSettings` and `durationLimit` settings do not affect Plans.
