# Students Module

## Purpose

Manages the student roster and provides a rich per-student performance dashboard. Aggregates attendance data (from meets), marks, and task completion into a unified view. Supports editing student profiles, tracking name aliases for identity reconciliation, IEP assignment, soft-delete, and bulk operations.

**Primary users:** Teachers and advisors monitoring individual student engagement and academic progress.

---

## Directory Structure

```
Students/
├── types/
│   └── students.d.ts                Member, StudentFormData, StudentDashboardStats, StudentDashboardResult
├── services/
│   ├── students.repository.ts       Member CRUD, soft-delete, participant sync
│   ├── students.service.ts          Save with alias tracking, delete/bulk-delete
│   ├── studentStats.service.ts      Performance aggregation across meets, marks, tasks
│   └── tests/
│       ├── students.repository.test.ts
│       ├── students.service.test.js
│       └── studentStats.service.test.js
├── composables/
│   └── useStudents.ts               Reactive state wrapping studentStatsService
├── pages/
│   └── StudentsPage.vue             Route entry; delegates events to composable
├── views/
│   └── StudentsView.vue             Virtual table with sorting, filtering, column visibility
└── components/
    └── StudentProfileModal.vue      Multi-tab modal: Attendance, Marks, Edit
```

---

## Data Model

### Member (base entity)
```typescript
{
  id: string
  name: string
  email?: string
  groupName: string
  role: 'student' | 'teacher' | 'assistant'
  hidden?: boolean
  aliases?: string[]         // Historical names (for identity reconciliation)
  createdAt?: string
  iep?: string               // IEP identifier (must be unique per workspace)
  [key: string]: any
}
```

### StudentDashboardStats (computed, extends Member)
```typescript
{
  totalDuration: number          // Total session time (seconds)
  sessionCount: number
  groups: Set<string>
  meetIds: Set<string>
  attendedDuration: number
  possibleDuration: number
  totalSessions: number          // Sessions in the group
  attendancePercentages: number[]
  marks: Mark[]
  totalTasks: number
  completedTasks: number
  averageMark: number            // 1–5 scale
  completionPercent: number
  totalAttendancePercent: number
  averageAttendancePercent: number
}
```

---

## Business Rules & Logic

### Save with Alias Tracking
- If the student's name changes, the old name is appended to `aliases` (if not already present).
- Aliases enable identity reconciliation when the same person appears under different names in CSV imports.
- Group name is normalized via `normalizeGroupName()` against existing groups before saving.
- IEP value must be unique across all members — throws `'IEP_NOT_UNIQUE'` if a conflict is found.
- Teachers and assistants have `groupName` forced to `null` and `iep` cleared.

### Soft Delete / Restore
- `deleteStudent(id)` calls `hideMember(id)` — sets `hidden = true`.
- `bulkDeleteStudents(ids)` calls `hideMembers(ids)` — batch soft-delete.
- Hidden members are excluded from `getAllMembers()` by default.
- `restoreMember(id)` sets `hidden = false`.

### Participant Sync
- `syncParticipants(meets, groupName)`: for each participant in the provided meets, creates a new member if one does not already exist (matched by name or alias).
- `syncAllMembersFromMeets()`: scans all meets in the database and creates missing member records; returns count of new members added.

### Performance Aggregation (`StudentStatsService.loadDashboardData`)
1. Load members (optionally filtered by group), meets, groups map, teachers, marks, duration limit, tasks — parallel fetch.
2. **Per-meet duration**: collect participant durations, find median, filter outliers (duration > median × 2), take max of remaining; cap at `durationLimit`.
3. **Attendance**: for each meet, match student by name/alias; accumulate `totalDuration`, `sessionCount`, per-session attendance %.
4. **Marks**: convert raw scores to 5-point scale via `formatMarkToFiveScale()`; compute average.
5. **Task completion**: count unique `taskId` values across marks → `totalTasks`; tasks with ≥1 mark → `completedTasks`.

---

## Repository — `students.repository.ts`

| Method | Description |
|---|---|
| `saveMember(member)` | Upsert member; null groupName for teachers |
| `getAllMembers({includeHidden?})` | All members; hidden excluded by default |
| `getIepMap({includeHidden?})` | `Record<string, string>` of `id → iep` for members that have an IEP; hidden excluded by default |
| `getMembersByGroup(groupName)` | Members in a specific group (excludes hidden) |
| `deleteMembers(ids)` | Hard delete by ID array |
| `hideMember(id)` | Soft-delete single member |
| `hideMembers(ids)` | Batch soft-delete |
| `restoreMember(id)` | Undo soft-delete |
| `restoreMembers(ids)` | Batch restore |
| `clearMembers()` | Wipe entire members store |
| `syncParticipants(meets, groupName)` | Create missing members from meet participant list |
| `syncAllMembersFromMeets()` | Scan all meets; return count of new members |

---

## Service — `students.service.ts`

| Method | Returns | Description |
|---|---|---|
| `saveStudent(formData, originalStudent)` | void | Validate, alias-track, normalize group, persist |
| `deleteStudent(id)` | void | Soft-delete |
| `bulkDeleteStudents(ids)` | void | Batch soft-delete |

## Service — `studentStats.service.ts`

| Method | Returns | Description |
|---|---|---|
| `loadDashboardData(groupName?)` | `StudentDashboardResult` | Full aggregation: attendance + marks + tasks |

---

## UI Behavior

### StudentsView — Virtual Table
- **Virtualized** with `useVirtualList` (~60px row height) for performance with large datasets.
- **Search** filters by name, groups, meetIds.
- **Sortable columns**: name, groups, meetIds, sessions, avg %, total %, avg mark, completion.
- **Column visibility** toggle via ColumnPicker; configurable set of visible columns.
- **Group badges**: clickable to filter table to that group.
- **MeetId badges**: clickable to navigate to Analytics detail page.
- **Selection**: per-row checkbox + header select-all; bulk-delete button appears when rows selected.
- **Row actions**: View Profile (attendance tab), Edit (edit tab), Delete.
- **Color coding**: attendance %, marks, completion % colored green/yellow/red by threshold.

### StudentProfileModal — Three Tabs

**Attendance tab** (read-only):
- Summary cards: sessions count, avg attendance %, total duration.
- Attendance bar chart (date × minutes), task completion donut, grade distribution donut.
- Attended meets table: date, duration, attendance %, join time.

**Marks tab** (read-only):
- Summary: avg mark, completion %.
- Grade distribution and task completion charts.
- Tasks table: name, score (numeric + 5-scale), date.

**Edit tab**:
- Fields: name, email, group (autocomplete), IEP, role.
- IEP uniqueness validated before save.
- Email copy button.

---

## Cross-Module Consumers of `studentsRepository`

`studentsRepository.getAllMembers()` is called outside the Students module in the following places:

| Caller | Purpose |
|---|---|
| `Sessions/SessionTabItem.vue` | Build live `iepMap` (studentId → IEP) on mount; passed to `SessionPrintTemplate` for the PNP column |
| `Sessions/sessionDocument.service.ts` | Build live `iepMap` at DOCX generation time; populates `{gradeBookId}` template variable |
| `Sessions/SessionPrintDialog.vue` | Populate examiner/teacher autocomplete (filters by `role === 'teacher' \| 'assistant'`) |

The IEP value is intentionally **not** stored in `SessionStudentSnapshot` — it is always read from the live Member record so updates made after session creation are reflected in prints and exports.

---

## Settings

| Key | Effect on Students |
|---|---|
| `durationLimit` | Caps per-meet duration in attendance calculation |
| `teachers` | Names matching the list are excluded from the student list view; role synced to `teacher` |
| `ignoredUsers` | Reserved; not actively applied in current code |
