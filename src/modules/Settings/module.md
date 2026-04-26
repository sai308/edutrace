# Settings Module

## Purpose

Provides system-wide configuration management and data lifecycle operations. Centralizes all persistent settings (duration limits, teacher lists, session squashing, print defaults) and exposes per-domain pages for data export, import, and deletion. Settings are workspace-scoped — each workspace maintains its own independent configuration.

**Primary users:** Administrators and lead teachers configuring application behavior and managing data backups.

---

## Directory Structure

```
Settings/
└── pages/
    ├── ReportsSettingsPage.vue        Attendance parsing config + reports data management
    ├── OrganizationSettingsPage.vue   Students and groups data management
    ├── DocumentsSettingsPage.vue      Print template config + sessions/plans data management
    └── ControlSettingsPage.vue        Marks, tasks, modules/units data management

Shared (not in Settings module directory):
src/shared/services/settings.repository.ts   All setting read/write operations
src/shared/utils/download.ts                 downloadJson(data, prefix) — shared JSON export utility
```

---

## Data Model

### SettingsMap
```typescript
{
  durationLimit: number           // Minutes; 0 = unlimited
  defaultTeacher: string | null
  ignoredUsers: string[]
  teachers: string[]
  sessionSquash: boolean
  sessionSquashThreshold: number  // Minutes
  examSettings: ExamSettings      // Record<string, unknown> — reserved; no properties accessed
  printSettings: PrintSettings
}
```

### PrintSettings
```typescript
{
  subject?: string
  formOfControl?: string          // 'Exam' | 'Credit' | 'Diff. Credit'
  semester?: string
  academicYear?: string           // e.g. "2023/2024"
  totalHours?: number
  examiner?: string
  practicalTeacher?: string
}
```

---

## Business Rules & Logic

### Workspace Scoping
- All keys are namespaced: `${key}_${workspaceId}` for non-default workspaces; bare key for the default workspace.
- `clearSettings()` removes only the current workspace's keys.

### Teacher List Sync
- When `saveTeachers(list)` is called, all `members` store records are iterated:
  - Names in the list → `role = 'teacher'`
  - Names not in the list → `role = 'student'`
- This is a bidirectional sync — the members store is the authoritative role source.

### Duration Limit
- Stored as minutes; `0` means unlimited (converted to `Infinity` at usage sites).
- Applied to session duration caps in StudentStatsService and Reports processing.

### Session Squashing
- When enabled, consecutive sessions with a gap ≤ `sessionSquashThreshold` minutes are merged during analytics processing.
- Controlled by two independent settings: `sessionSquash` (enable toggle) and `sessionSquashThreshold` (gap in minutes).

### Academic Year Auto-Calculation
- DocumentsSettingsPage auto-calculates `academicYear` based on the current month: if month ≥ August, the year span is `currentYear / currentYear+1`; otherwise `currentYear-1 / currentYear`.

### Teacher Autocomplete
- DocumentsSettingsPage loads teacher suggestions from `settingsRepository.getTeachers()` — the canonical teacher list stored in localStorage and synced to member roles.
- This is consistent with the pattern used in `GroupModal` and the Groups module.

### JSON Export / Blob Download
- All JSON export actions use `downloadJson(data, prefix)` from `src/shared/utils/download.ts` — date-stamped filename, triggers browser download.
- Binary downloads (`.docx`) use `downloadBlob(blob, filename)` from the same module — creates an object URL, clicks it, then immediately revokes it.

---

## Repository — `settings.repository.ts`

All methods are async for consistency across the codebase.

| Method | Description |
|---|---|
| `getDurationLimit()` / `saveDurationLimit(n)` | Minutes cap for participant duration |
| `getDefaultTeacher()` / `saveDefaultTeacher(name)` | Single default teacher name |
| `getTeachers()` / `saveTeachers(list)` | Teacher list; save triggers member role sync |
| `getIgnoredUsers()` / `saveIgnoredUsers(list)` | Names excluded from analytics |
| `getExamSettings()` / `saveExamSettings(obj)` | Reserved exam config object |
| `getPrintSettings()` / `savePrintSettings(obj)` | Print form defaults |
| `getSessionSquash()` / `saveSessionSquash(bool)` | Enable/disable session squashing |
| `getSessionSquashThreshold()` / `saveSessionSquashThreshold(n)` | Squash gap in minutes |
| `clearSettings()` | Remove all keys for the current workspace |

**Internal helpers:**
- `_getWorkspaceKey(key)` — generates workspace-scoped storage key.
- `_getSetting<K>()` — type-coercing getter (handles string→number/boolean conversion).
- `_saveSetting<K>()` — type-aware setter.

---

## UI Behavior

### ReportsSettingsPage (`/attendance/settings`)
- **Duration Limit**: number input (minutes) + Save button.
- **Session Squash**: toggle switch (auto-saves) + threshold number input + Save button.
- **Reports data**: count/size display, Export JSON, Import JSON, Delete All (with confirmation).
- **Database info**: current DB name and version.

### OrganizationSettingsPage (`/org/settings`)
- **Students**: count/size, Export, Import, Delete All.
- **Groups**: count/size, Export, Import, Delete All.
- **Database info**: DB name and version.

### DocumentsSettingsPage (`/documents/settings`)
- **Print Settings form**: subject, form of control, semester, academic year, total hours, examiner (autocomplete), practical teacher (autocomplete, auto-syncs from primary examiner unless manually changed). Save button persists to `printSettings`.
- **Sessions/Plans data**: count/size, Export, Import, Delete All.
- **Document template**: upload/replace/preview a `.docx` template stored in OPFS (`templates/print_template.docx`). Includes a **Download Starter Template** button that generates a pre-structured `.docx` via `templateGenerator.generateTemplateBlob()` — all variable placeholders pre-filled so users can customize in Word/LibreOffice and re-upload.

### ControlSettingsPage (`/control/settings`)
- **Marks**: count/size, Export, Import, Delete All.
- **Tasks**: count/size, Export, Import, Delete All.
- **Modules / Units / Summary**: count/size display, Export, Import, Delete All.

---

## Settings Cross-Module Reference

| Key | Consumed By |
|---|---|
| `durationLimit` | Analytics, Reports (parsing), StudentStats |
| `defaultTeacher` | Groups (GroupModal pre-fill) |
| `ignoredUsers` | Analytics (excluded from stats) |
| `teachers` | Analytics, Groups, Members (role sync) |
| `sessionSquash` + `sessionSquashThreshold` | Reports (file processing) |
| `examSettings` | Reserved (`Record<string, unknown>`); unused |
| `printSettings` | Sessions (SessionPrintDialog), Documents |
