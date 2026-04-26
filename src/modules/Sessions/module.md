# Sessions Module

## Purpose

Manages examination sessions for student groups across three lifecycle stages: Main session, First Retake, and Second Retake. Captures grade snapshots per student, auto-syncs grades from the Summary module, supports manual grade entry, enforces the retake eligibility rule (only failing students advance), and produces both a printable official grade record (`@media print`) and a downloadable `.docx` document from a user-uploaded OPFS template.

**Primary users:** Instructors, examiners, and registrars documenting examination results and managing retake attempts.

---

## Directory Structure

```
Sessions/
├── models/
│   └── session.model.ts             Enums: SessionType, SessionStatus, GradeType; interfaces: SessionEntry, SessionReport, SessionStudentSnapshot
├── services/
│   ├── sessions.repository.ts       IndexedDB CRUD; composite index on (groupId, sessionType)
│   ├── sessions.service.ts          Session lifecycle: initialize, sync, close, grade update
│   ├── sessionDocument.service.ts   DOCX generation from OPFS template via docxtemplater
│   ├── documentGenerator.ts         Low-level docxtemplater + OPFS integration
│   └── templateGenerator.ts         Generates a starter .docx template blob from raw OOXML (no dependencies beyond pizzip)
├── pages/
│   └── SessionsPage.vue             Stepper UI — one step per session type
└── components/
    ├── SessionTabItem.vue            Session grade table with status bar and actions (print + download)
    ├── SessionPrintTemplate.vue      Official A4 grade record (print-only, teleported to body)
    ├── SessionsList/
    │   ├── DataTable.vue             TanStack table for session entries
    │   └── columns.ts                Column definitions
    └── dialogs/
        ├── SessionCloseDialog.vue    Pre-close confirmation with absent student list
        └── SessionPrintDialog.vue    Shared dialog for print/download form configuration
```

---

## Data Model

### Enums
```typescript
SessionType   = MAIN | FIRST_RETAKE | SECOND_RETAKE
SessionStatus = OPEN | CLOSED
GradeType     = AUTO | MANUAL
```

### SessionStudentSnapshot
```typescript
{
  id: string        // Original student UUID (immutable, frozen at session creation)
  fullName: string
  groupName?: string
}
```

> **IEP / PNP is NOT stored in the snapshot.** It is always resolved live from the current `Member.iep` record at display/export time, so updates made after session creation are reflected correctly.

### SessionEntry
```typescript
{
  studentId: string
  studentSnapshot: SessionStudentSnapshot   // Immutable data at session creation
  grade: number | null                      // 0–100 internal scale; null = absent
  gradeType: GradeType
  updatedAt: string
}
```

### SessionReport
```typescript
{
  id: string
  sessionType: SessionType
  status: SessionStatus
  groupId: string
  openedAt: string
  closedAt: string | null
  entries: SessionEntry[]
}
```

> Grades are always stored on a **100-point scale** internally; display conversion is applied by the UI.

---

## Business Rules & Logic

### Main Session Initialization
1. Fetches all active (non-hidden, non-teacher) students in the group.
2. Pulls computed grades from Summary module (`assessmentType: 'examination'`).
3. Sets `gradeType = AUTO` unless `examIsAuto === false`.
4. Returns an existing session unchanged if one already exists for the group.

### Retake Session Initialization
- Requires the **previous session to be CLOSED**; throws if it is still open.
- Only includes students where `grade === null` or `grade < 60` (failing threshold).
- All retake entries start with `grade = null` and `gradeType = MANUAL`.
- Returns existing retake session if already created.

### Sync Rules
- **Main session sync**: only updates entries where `grade === null` OR `gradeType === AUTO`. Never overwrites manual grades. Also adds newly enrolled students not yet in the session.
- **Retake session sync**: same guard (`null` or `AUTO` only). Does **not** add new students — the retake roster is fixed at initialization.
- Sync is a no-op on any CLOSED session.

### Grade Update
- Manual grade updates are only allowed on **OPEN** sessions.
- Setting a grade via `updateGrade()` always sets `gradeType = MANUAL`.
- Throws if the session is CLOSED or if the student is not found in the session.

### Session Closure
- Sets `status = CLOSED` and `closedAt = now`.
- No validation on completeness — absent students (null grades) are allowed.
- Once CLOSED, the session is frozen: sync and grade update calls are ignored.

---

## Repository — `sessions.repository.ts`

| Method | Description |
|---|---|
| `create(session)` | Generate UUID, store session, return with ID |
| `getByGroupId(groupId)` | All sessions for a group |
| `getGroupSession(groupId, sessionType)` | Single session via composite index `group_type` |

---

## Service — `sessions.service.ts`

| Method | Returns | Description |
|---|---|---|
| `initializeMainSession(group)` | `SessionReport` | Create main session with auto grades from Summary |
| `syncMainSession(group, sessionId)` | `SessionReport` | Refresh AUTO/null grades; add new students |
| `initializeRetakeSession(group, prevSessionId, type)` | `SessionReport` | Create retake for failing students only |
| `syncRetakeSession(group, sessionId)` | `SessionReport` | Refresh AUTO/null grades in retake (no new students) |
| `closeSession(sessionId)` | `SessionReport` | Freeze session; set closedAt |
| `updateGrade(sessionId, studentId, grade)` | `SessionReport` | Set manual grade on open session |

---

## Service — `sessionDocument.service.ts`

Orchestrates `.docx` generation for closed sessions. Calls `studentsRepository.getIepMap({ includeHidden: true })` to resolve the live IEP for the `{gradeBookId}` column (so the exported document reflects the current IEP even if it was set after the session was created). National scale labels are produced by `toNationalGrade()` from `shared/utils/grades.ts`.

| Method | Returns | Description |
|---|---|---|
| `hasTemplate()` | `Promise<boolean>` | True if `templates/print_template.docx` exists in OPFS |
| `generateDocument(session, group, formData)` | `Promise<{ blob, filename }>` | Render template with session data; fetch live IEP map |

**Template variables available in the `.docx` template** (Mustache `{variable}` syntax):

| Variable | Description |
|---|---|
| `{recordNumber}` | Record number from dialog |
| `{date}` | Date string |
| `{course}` | Group course number |
| `{groupName}` | Group name |
| `{subject}` | Subject name |
| `{semester}` | Semester |
| `{academicYear}` | e.g. `2024/2025` |
| `{formOfControl}` | Exam / Credit / Diff. Credit |
| `{totalHours}` | Total hours |
| `{examiner}` | Examiner name(s), joined by comma |
| `{practicalTeacher}` | Practical teacher name |
| `{totalStudents}` | Total number of students |
| `{#entries}...{/entries}` | Row loop |
| `{index}` | Row number (inside loop) |
| `{fullName}` | Student full name (inside loop) |
| `{gradeBookId}` | Student IEP/PNP number, or `—` if not set (inside loop) |
| `{nationalGrade}` | National scale grade string (inside loop) |
| `{points}` | Score 0–100, empty if absent (inside loop) |
| `{ects}` | ECTS letter grade, empty if absent (inside loop) |
| `{countA}` … `{countF}` | ECTS grade distribution counts |
| `{countAbsent}` | Count of absent students |

---

## Service — `templateGenerator.ts`

Generates a ready-to-use starter `.docx` file from scratch using raw OOXML + PizZip (no external dependencies beyond what is already installed). The output contains all variable placeholders pre-filled so the user can open it in Word/LibreOffice, adjust fonts/styles, and re-upload.

| Export | Description |
|---|---|
| `generateTemplateBlob(): Blob` | Returns a valid `.docx` Blob matching the official А4 grade record layout |

---

## Service — `documentGenerator.ts`

Low-level OPFS + docxtemplater bridge. Used by `sessionDocument.service.ts`.

| Method | Description |
|---|---|
| `generateFromTemplate(options)` | Read template from OPFS, render with docxtemplater, return Blob (and optionally save back to OPFS) |

---

## UI Behavior

### SessionsPage — Stepper
- Three steps: MAIN → FIRST_RETAKE → SECOND_RETAKE.
- **Linear mode**: active when Main and First Retake are both CLOSED (steps must be completed in order).
- **Non-linear mode**: when at least one session is still OPEN (free tab navigation).
- On group change: loads all sessions, auto-syncs any OPEN sessions, sets active tab to the furthest available step.
- If a session does not exist: shows a "Generate" button.
- If the previous session is not CLOSED: shows a blocked message preventing creation of the next step.

### SessionTabItem — Grade Table
- Columns: Student name, Grade type icon (AUTO=wand, MANUAL=pen, Absent=user-x), National scale, Score (0–100), ECTS, Updated at.
- Rows with null grades shown at reduced opacity.
- **Status bar**: OPEN/CLOSED badge, opened/closedAt timestamps, ECTS distribution counts.
- **Actions (OPEN)**: Sync (reloads grades with spinner), Close (opens SessionCloseDialog).
- **Actions (CLOSED)**: Print (opens SessionPrintDialog in `print` mode), Download Document (opens SessionPrintDialog in `download` mode; only shown when a template exists in OPFS).
- On mount: checks template existence and calls `studentsRepository.getIepMap()` to build the live `iepMap`.
- `printFormData` is cached per session — reused for same-session reprints, cleared when `session.id` changes.

**Grade scale conversion**:
- 90–100 → Excellent / A
- 75–89 → Good / B–C
- 60–74 → Satisfactory / D–E
- < 60 → Unsatisfactory / FX–F
- null → Absent

### SessionPrintDialog
- Form fields: record number, date, subject, form of control, semester, academic year, total hours, examiner(s), practical teacher.
- Autocomplete for examiners and practical teacher from members with teacher/assistant role.
- Pre-filled from `printSettings` on open.
- `mode` prop (`'print'` | `'download'`) controls title wording and confirm button label/icon.
- For retake sessions, multiple examiners can be added/removed.
- Emits `confirm` event with `PrintFormData` payload; the parent decides whether to call `window.print()` or `sessionDocument.service.generateDocument()`.

### SessionPrintTemplate
- Teleported to `<body>` — hidden on screen, shown only during `@media print`.
- Accepts `iepMap?: Record<string, string | undefined>` — live studentId→IEP lookup; displays `'—'` when absent.
- National scale conversion delegated to `toNationalGrade()` from `shared/utils/grades.ts`.
- Page layout: A4 (210×297mm), Times New Roman, margins 20mm left / 14mm others.
- **Page 1**: institution header, metadata table, subject block, grades table (sorted by name, compact 8pt rows).
- **Page 2** (`page-break-before: always` on ECTS table): ECTS distribution legend table, examiner signature.

---

## Settings

| Key | Effect on Sessions |
|---|---|
| `printSettings` | Pre-fills SessionPrintDialog fields (subject, formOfControl, semester, examiner, etc.) |

Print settings are persisted via `settingsRepository.savePrintSettings()` when the user saves the form. Configured on the **Documents Settings** page (`/documents/settings`).
