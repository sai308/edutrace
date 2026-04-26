# Summary Module

## Purpose

Aggregates student performance across tasks, modules (units), and attendance to determine exam eligibility and produce a final examination grade. Computes per-student completion percentages, module-level weighted grades, and attendance rates, then assigns an admission status (Automatic / Allowed / Not Allowed). Supports both auto-calculated and manually entered final grades, with persistence via `FinalAssessment` records.

**Primary users:** Teachers reviewing cohort readiness before exams; administrators approving or denying exam admission.

---

## Directory Structure

```
Summary/
├── types/
│   └── summary.d.ts                 Module, FinalAssessment, AttendanceStats, ModuleStats,
│                                    StudentSummaryData, SummaryLoadOptions, SaveFinalAssessmentResult
├── services/
│   ├── summary.service.ts           Main orchestration: load, transform, status logic, grade conversion
│   ├── finalAssessments.repository.ts  FinalAssessment CRUD with composite-index upsert and input validation
│   ├── modules.repository.ts        Legacy module CRUD (kept for compatibility; superseded by Units)
│   ├── examSerialization.ts         Helper types for task/module serialization to worker
│   └── tests/
│       ├── summary.service.test.ts
│       └── finalAssessments.repository.test.ts
├── pages/
│   └── SummariesPage.vue            Route entry
├── views/
│   └── SummariesView.vue            Toolbar (group, scale, settings), data table, grade actions, leave guard
├── composables/
│   ├── useSummaryData.ts            Reactive wrapper for summaryService.loadExamData()
│   ├── useGradeActions.ts           Grade save / auto / manual / delete actions + dialog state
│   └── tests/
│       └── useGradeActions.test.ts
└── components/
    ├── SummariesList/
    │   ├── DataTable.vue            TanStack table with dynamic module columns; exposes `table` ref
    │   └── columns.ts               `createSummaryColumns(modules, onStudentClick, onGradeAction, formatters, t)`
    ├── SummarySettingsSheet.vue      Threshold configuration side panel (fully i18n); props: `open`, emit: `update:open`
    ├── GradeManualInputDialog.vue    Manual grade entry dialog
    └── GradeDeleteDialog.vue        Grade removal confirmation dialog
```

---

## Data Model

### FinalAssessment
```typescript
{
  id?: number | string
  studentId: string
  assessmentType: string          // e.g. 'examination'
  value: string | number          // 100-point scale
  createdAt?: string
  updatedAt?: string
  syncedAt?: string | null
  documentedAt?: string | null
  isAuto?: boolean                // true = auto-calculated; false = manually entered
}
```

### StudentSummaryData (primary UI type)
Key fields:
```typescript
{
  // Identity
  id, name, email, aliases, groups
  // Attendance
  sessionCount, totalSessions, totalDuration, averageAttendancePercent
  // Tasks
  totalTasks, completedTasks, completionPercent, completion, completionExact
  // Modules
  moduleGrades: Record<string, string|number|null>
  moduleDetails: Record<string, ModuleDetailTooltip>
  total, totalRaw
  // Exam grade
  examGrade, examGradeRaw, examIsAuto
  // Status
  status: 'automatic' | 'allowed' | 'notAllowed'
  statusCause: string             // Localized reason text
  isAllowed: boolean
  completedAt: string | null
}
```

### SummaryLoadOptions
```typescript
{
  modules?: Module[]
  completionThreshold?: number    // Default 70
  attendanceThreshold?: number    // Default 60
  attendanceEnabled?: boolean     // Default true
  gradeFormat?: '5-scale' | '100-scale' | 'ects'
  requiredTasks?: number          // Default 0
  assessmentType?: string         // Default 'examination'
  t: (key, params?, count?) => string
}
```

---

## Business Rules & Logic

### Status Determination
| Condition | Status |
|---|---|
| `completionExact >= 100` AND all modules complete (no partial) | `automatic` |
| `completionExact >= completionThreshold` (default 70%) | `allowed` |
| Below completion threshold OR attendance below threshold (if enabled) | `notAllowed` |

### Status Cause Generation
Localized string listing the reason(s) for the assigned status:
- Completion % vs. threshold (if failing).
- Attendance % vs. threshold (if attendance enabled and failing).
- Incomplete modules (missing tasks or tests listed by name).

### Module Grade Calculation (in Web Worker)
For each unit:
1. `taskAvg` = mean score of all completed tasks in the unit.
2. `testScore` = score of the test task (if configured).
3. `moduleGrade = (taskAvg × taskCoef + testScore × testCoef)`.
4. Partial grades (some tasks missing) are marked with `~` prefix in display.

### Exam Grade Logic
- **Auto grade**: uses `totalRaw` (precise 100-point value from the worker calculation).
- **Manual grade**: user-entered value is converted from display scale to 100-point via `convertGradeTo100()` before persistence.
- `isAuto` flag is stored on `FinalAssessment` to distinguish origin.
- Grade is displayed via `createMarkFormatter(gradeFormat)` (5-scale / 100-scale / ECTS).

### Grade Storage Resolution (`resolveGradeStorageValue`)
Internal helper in `useGradeActions`. Determines the final 100-point value and `isAuto` flag before persisting:
1. If `student.examIsAuto` is `true`, use `Math.round(totalRaw)` directly — avoids rounding errors from format conversion.
2. If the displayed grade matches the displayed total (auto-detection fallback), treat as auto.
3. Otherwise, convert via `convertGradeTo100(displayGrade, format)`.

### Auto-Repair Mechanism
On each `loadExamData()` call, marks are scanned for students whose `groupName` field does not match the current group. If found, the member record is updated automatically and the student is added to the group.

### Grade Saving
1. If `examIsAuto`: use `totalRaw` directly.
2. If manual: convert display grade → 100-point.
3. Persist via `finalAssessmentsRepository.saveFinalAssessment()` with `isAuto` flag.
4. `completedAt` timestamp is set in local state immediately after save (no reload needed).

### Bulk Save
`handleSaveAll()` in `useGradeActions` iterates all students with unsaved grades and persists each sequentially; marks each as saved after success.

---

## Repository — `finalAssessments.repository.ts`

### Validation
`saveFinalAssessment` validates inputs before any DB access:
- `studentId` must be a non-empty string.
- `assessmentType` must be a non-empty string.
- `value` must not be `null` or `undefined`.

Throws descriptive errors (`FinalAssessment.studentId is required`, etc.) on violation.

### Methods

| Method | Description |
|---|---|
| `saveFinalAssessment(assessment)` | Validate → upsert via composite index `student_type`; return `{id, isNew, updated}` |
| `getFinalAssessmentByStudent(studentId, type)` | Single assessment by student + type |
| `getAllFinalAssessments()` | All assessment records |
| `getFinalAssessmentsByType(type)` | Filtered by assessmentType |
| `deleteFinalAssessment(id)` | Remove by ID |
| `updateSyncStatus(id, syncedAt)` | Mark as synced |
| `updateDocumentStatus(id, documentedAt)` | Mark as documented |

---

## Service — `summary.service.ts`

`loadExamData` wraps the Comlink summary worker call with `withTimeout(60_000)` and rethrows via `classifyWorkerError`. `useSummaryData` maps `WorkerError.code` to i18n toasts (`workerErrors.*`) and calls `reportWorkerError()` on failure.

| Method | Returns | Description |
|---|---|---|
| `loadExamData(group, options)` | `{students, context}` | Full pipeline: fetch → repair → filter → worker (60 s timeout) → transform |
| `saveFinalAssessment(assessment)` | `SaveFinalAssessmentResult` | Delegate to repository (validated) |
| `getFinalAssessmentByStudent(studentId, type)` | `FinalAssessment \| undefined` | Lookup |
| `deleteFinalAssessment(id)` | void | Remove |
| `getModulesByGroup(groupName)` | `Module[]` | Fetch all units; transform to Module format |
| `getAllFinalAssessments()` | `FinalAssessment[]` | All records |
| `getExamSettings()` / `saveExamSettings()` | — | Delegate to settings repository |
| `updateAssessmentSyncStatus(id, syncedAt)` | void | Mark synced |
| `updateAssessmentDocumentStatus(id, documentedAt)` | void | Mark documented |

---

## Composables

### `useSummaryData`
Thin reactive wrapper around `summaryService.loadExamData()`. Manages loading state and exposes `students`, `meets`, `tasks`, `groupsMap`.

### `useGradeActions`
Encapsulates all grade action side-effects, keeping `SummariesView` free of business logic.

**Signature:** `useGradeActions(students: Ref<StudentSummaryData[]>, selectedFormat: Ref<string>)`

**Returns:**
| Name | Type | Description |
|---|---|---|
| `isDeleteDialogOpen` | `Ref<boolean>` | Controls GradeDeleteDialog visibility |
| `isManualDialogOpen` | `Ref<boolean>` | Controls GradeManualInputDialog visibility |
| `actionTarget` | `Ref<StudentSummaryData \| null>` | Student currently being acted upon |
| `handleGradeAction(payload)` | `void` | Dispatch `auto / manual / save / remove` (300ms defer) |
| `handleSaveAll()` | `Promise<void>` | Persist all unsaved grades sequentially |
| `handleDeleteConfirm()` | `Promise<void>` | Confirm and execute deletion |
| `handleManualConfirm(grade)` | `void` | Confirm manual grade entry |

The 300ms defer in `handleGradeAction` allows Radix Vue's ContextMenu exit animation and `pointer-events` restoration to complete before reactive mutations.

---

## UI Behavior

### SummariesView Toolbar
- **Group selector**: switches cohort; triggers reload. Selected group name is persisted in the URL via `useQuerySync` (`?group=`).
- **Scale selector**: 5-point / 100-point / ECTS. Selected scale is persisted in the URL via `useQuerySync` (`?format=`). Changing the format is handled by `watch(selectedFormat, handleReload)` — not inline on each menu item.
- **Unsaved grades banner**: visible when any student has a grade with `completedAt === null`; shows count and a **Save All** button that calls `handleSaveAll()`.
- **Settings button**: opens `SummarySettingsSheet` (`summary.settings.label` i18n key).

### Leave Guard
`onBeforeRouteLeave` blocks navigation when `unsavedCount > 0`. Navigation is paused via a `Promise`; the guard resolves `true` (leave) or `false` (stay) based on user choice. The confirmation UI uses `AlertDialog` (intentionally non-dismissible — the user must make an explicit choice).

### DataTable — Dynamic Columns
Columns are generated by `createSummaryColumns(modules, ...)` inside a `computed()` in `DataTable.vue` — this is necessary because `modules` is a reactive prop that changes when the group changes.

One column per module (unit) is generated dynamically. Module columns show:
- Grade value (or `-` for null); partial grades prefixed with `~` displayed in amber.
- Tooltip: formula breakdown (task avg × coef, test score × coef) + red-highlighted missing items.

Fixed columns: ordinal, student name, total grade, completion %, attendance %, status, exam grade, date saved.

**Search / filtering:** Students are pre-filtered by name before being passed to `useVueTable`. `getFilteredRowModel` is intentionally absent — a TanStack global filter would match on grade strings (`~62`, `A+`, ECTS letters) and produce confusing results. Name-only filtering is the correct intent.

`DataTable` exposes `{ table }` via `defineExpose` for parent access if needed.

### Grade Cell Context Menu (right-click)
- **Save Grade**: persist current grade.
- **Apply Auto Grade**: set `examGrade = total`; only shown when `status = automatic` and grade unsaved.
- **Set Manual**: open GradeManualInputDialog.
- **Remove Grade** (separator): open GradeDeleteDialog.

### SummarySettingsSheet
Fully localized (`summary.settings.*` and `summary.thresholds.*` i18n keys). Adjustable per-session thresholds:
- Completion threshold (default 70%).
- Attendance threshold + enable toggle (default 60% / enabled).
- Required tasks (default 0).
- Reset / Apply buttons; Cancel uses `common.cancel`.

---

## Import Conventions

All intra-module imports use the `@Summary` alias:
```typescript
import { useSummaryData } from '@Summary/composables/useSummaryData';
import { useGradeActions } from '@Summary/composables/useGradeActions';
import type { StudentSummaryData } from '@Summary/types/summary';
```

Cross-module imports use their respective aliases (`@Students`, `@Groups`, `@Marks`, `@Analytics`, `@Tasks`).

---

## Settings

| Key | Effect on Summary |
|---|---|
| `durationLimit` | Caps session duration used in attendance calculations |
| `examSettings` | Reserved for future exam-specific configuration (currently unused) |

Thresholds (completionThreshold, attendanceThreshold, attendanceEnabled, requiredTasks) are **persisted per group** via `settingsRepository.saveSummaryThresholds(groupId, settings)`. When a group is selected, previously saved thresholds are restored; groups with no saved record fall back to defaults.
