# Product Requirements Document — EduTrace

## 1. Overview

**EduTrace** is an offline-first educational management SPA for teachers and academic administrators. It consolidates attendance tracking (via Google Meet CSV exports), grade management, and student/group records into a single client-side application with no backend dependency.

All data is stored in the user's browser via IndexedDB. There is no server, no login, and no account — the user's data never leaves their device.

---

## 2. Problem Statement

Teachers in higher education manage multiple overlapping workflows: tracking which students attended online sessions, recording marks from various assignments, calculating module grades with weighted coefficients, determining exam eligibility, and generating official session documents. These workflows typically span disconnected tools (spreadsheets, Google Meet exports, institutional software), creating friction, data loss risk, and repetitive manual work.

EduTrace consolidates these workflows into a single offline-capable app that teachers can install and use without IT support or institutional infrastructure.

---

## 3. Target Users

**Primary:** Teachers and instructors at Ukrainian higher education institutions who:
- Conduct synchronous sessions via Google Meet
- Track attendance and performance across multiple student groups
- Need to calculate final grades and generate official session documents (exam/credit sheets)

**Secondary:** Academic administrators or department heads who review group-level analytics and manage student data.

---

## 4. Core Principles

| Principle | Description |
|-----------|-------------|
| **Offline-first** | Fully functional without internet after initial load. All computation runs locally. |
| **Privacy by design** | No data is transmitted. No account required. IndexedDB is isolated per browser profile. |
| **Multi-workspace** | Each workspace is an isolated database. One teacher can manage multiple courses or semesters independently. |
| **No friction** | Direct CSV imports, no manual field mapping for common formats, no onboarding gates. |
| **Installable** | Ships as a PWA installable on desktop and mobile. |
| **Dual language** | Full UI support for English (en-US) and Ukrainian (uk-UA), switchable at runtime. |

---

## 5. Feature Requirements

### 5.1 Workspace Management

Users can create multiple isolated workspaces, each backed by its own IndexedDB database.

**Requirements:**
- Create a workspace with a name, emoji/icon, and optional theme color.
- Switch between workspaces via a header dropdown. Switching reloads the active database.
- Copy settings from an existing workspace (duration limit, default teacher, ignored participants).
- Delete a workspace with confirmation. Deletion is permanent and cannot be undone.
- Workspace list and active workspace are persisted in localStorage.
- Theme color is applied as a CSS custom property (header border, sidebar accent).

---

### 5.2 Attendance — Reports

Reports are raw Google Meet CSV exports uploaded by the user. They are the source of truth for attendance data.

**Requirements:**
- Accept CSV files via drag-and-drop or file picker.
- Parse CSV asynchronously in a Web Worker (PapaParse via Comlink) to keep the UI responsive.
- Store each parsed session as a `meet` record with: Meet ID, date, total duration, participant list, and per-participant join/leave timestamps.
- Display all uploaded reports in a sortable, searchable table (Meet ID, group name, date, duration, participants, filename, upload timestamp).
- Link a report to a group automatically when the Meet ID matches a known group.
- Show a warning count when CSVs contain Meet IDs that don't match any group.
- Support "Process Related Only" mode — import only CSVs that match an existing group's Meet ID.
- Bulk delete selected reports.
- Drill-down view per report: participant timeline visualization, per-participant duration and attendance percentage.

**Processing options:**
- Configurable session duration limit (minutes). Sessions exceeding the limit are capped. Option to retroactively apply the limit to all existing meet records.
- Session squashing: an enable/disable toggle plus a configurable threshold (minutes). When enabled, consecutive short reconnections within the threshold window are merged into a single session.

---

### 5.3 Attendance — Analytics

Analytics provides a visual summary of attendance across all groups.

**Requirements:**
- Display one card per group showing: total session count, average duration, active participant count (active / total), and an attendance health badge (green ≥75%, yellow ≥50%, red <50%).
- Group cards by course number (1st–4th course, Others).
- Search/filter cards by group name, teacher, or Meet ID.
- QR code generation for each group's Meet link.
- Drill-down to a per-group analytics view with:
  - Calendar of sessions (heatmap or list).
  - Attendance matrix: students × sessions.
  - Per-student aggregate stats (sessions attended, attendance %).

---

### 5.4 Organization — Groups

Groups represent student cohorts linked to a Google Meet ID.

**Requirements:**
- Create a group with: name, course number (1–4), Meet ID, optional teacher name.
- Edit and delete groups (deletion cascades to dependent data or shows a blocker).
- Display groups in a sortable, searchable table with columns: name, course, Meet ID, teacher, member count, avg. task completion %, avg. mark, mode mark, median mark.
- Default-hide optional stat columns (mode mark, median mark); toggle via column visibility control.
- Global text search applies across all visible string fields.
- QR code generation for the group's Meet link.
- Bulk delete selected groups.

---

### 5.5 Organization — Members

Members are individual participants: students, teachers, or assistants.

**Requirements:**
- Add a member with: name, email, role (Student / Teacher / Assistant), group assignment.
- Edit and delete members.
- Roles affect statistics: Teachers and Assistants are excluded from student-facing views and computations.
- `aliases` field (`string[]`) exists on the data model and is used internally by the CSV import pipeline for name deduplication (matching CSV rows to existing members). There is no UI for managing aliases directly.
- IEP field: a free-text string (e.g. an IEP document number or descriptor) visible and editable in the member dialog for Student-role members. Not a boolean flag.
- Bulk delete selected members.
- Search by name.

---

### 5.6 Organization — Students

The Students view provides a consolidated view of student performance.

**Requirements:**
- Display all members with the Student role in a sortable, searchable table.
- Columns: name, email, groups, sessions attended (e.g. 7/8), avg. attendance %, total attendance %, avg. mark, task completion %.
- Filter by group: clicking a group name in the "groups" column cell activates a single-group filter, shown as a dismissible badge. Only one group can be active at a time. Filter is synced to the URL via `useQuerySync`.
- Color-coded performance indicators: green ≥75%, yellow ≥50%, red <50%.
- Drill-down to a student profile with: full attendance history, marks history, participant timeline.
- Edit student: name, email, group, IEP flag.
- Single and bulk delete with confirmation dialog.
- Auto-exclude members flagged as teachers (via settings) from this view.

---

### 5.7 Control — Tasks

Tasks are individual assignments that can carry marks.

**Requirements:**
- Create a task with: name, optional date, optional max points, optional description.
- Edit and delete tasks.
- Normalize task names: strip whitespace, standardize casing for deduplication.
- Sorted, searchable table view.
- Bulk delete.
- Tasks are referenced by marks and grouped into modules.

---

### 5.8 Control — Marks

Marks are student grades associated with a task.

**Requirements:**
- Import marks from CSV files:
  - Columns map to task names; rows map to students.
  - Auto-match students via name (fuzzy/alias matching).
  - Auto-create tasks for unrecognized column headers.
  - Report import stats: added, updated, skipped.
- Display marks in a sortable, filterable table: student name, group, task, mark value, date, sync status.
- Filter by: group, sync status, date range; option to hide failed grades.
- Global search across student, group, and task fields.
- Display grade in multiple scales: raw value, 5-point, 100-point, ECTS (via tooltip or column toggle).
- Toggle sync status per mark (marks a grade as submitted to an external system).
- Bulk delete selected marks.

---

### 5.9 Control — Modules

> **Naming note:** the sidebar and UI label this section "Modules". In code, the feature module is `src/modules/Units/` and the IndexedDB object store is `units`. The legacy `modules` store (mapped to `src/modules/Summary/services/modules.repository.ts`) stores module-group associations and is separate.

Modules (units) group tasks together and assign weighted coefficients for intermediate grade calculation.

**Requirements:**
- Create a module via a multi-step wizard:
  1. **Details** — name, optional description.
  2. **Tasks** — select standard tasks from the existing task list.
  3. **Test Task** — optionally designate one task as the "test task" (weighted separately).
  4. **Grading** — set task coefficient and test task coefficient (both default 1.0).
- Module grade formula: `(avg(standard_marks) × task_coef + test_mark × test_coef) / (task_coef + test_coef)`.
- Reorder modules via drag-and-drop (ordinal-based, persisted to DB).
- Edit and delete modules.
- Copy modules from another group (reuse coefficient config without re-selecting tasks manually).
- Validate unique module names (enforced via `normalizedName` unique index).
- Display modules in a summary table: name, task count, test task presence, coefficients.

---

### 5.10 Control — Summaries

Summaries consolidate module grades and determine each student's exam eligibility.

**Requirements:**
- Select a group to view its summary.
- Configure eligibility thresholds:
  - Task completion percentage (required).
  - Attendance percentage (optional).
  - Minimum task count (required).
  - Per-module minimum task count.
- Compute eligibility per student:
  - **Automatic** — all criteria met; grade can be assigned automatically.
  - **Allowed** — meets minimum criteria; some data is incomplete.
  - **Not Allowed** — fails one or more criteria.
- Show the specific reason for each student's status (e.g. "Attendance 45% < threshold 60%").
- Display computed grade (partial/auto-calculated) alongside manual grade entry.
- Actions per student: apply auto-grade, enter manual grade, remove grade.
- Assessment type toggle: Exam vs. Credit.
- Display ECTS grade distribution (A, B, C, D, E, FX, F, Absent) as a count/badge row.
- Grade scale toggle: raw, 5-point, 100-point, ECTS.

---

### 5.11 Documents — Sessions

Sessions are official exam/credit records with a defined lifecycle.

**Requirements:**
- Three session types in a tabbed stepper: **Main**, **First Retake**, **Second Retake (Commission)**.
- Create a session: auto-populate eligible students from the group's summary.
- Enter grades per student:
  - Accept auto-suggested grades from summary calculations.
  - Allow manual override.
  - Mark students as Absent.
- Close a session: session becomes read-only; students without a grade are auto-listed for the next retake.
- Generate a .docx session document using docxtemplater + OPFS:
  - A default starter template (with Mustache placeholders) is generated on first use.
  - Users can download the starter template, customize it in Word/LibreOffice, and re-upload it to Documents Settings.
  - Placeholders cover: subject, form of control, semester, date, examiners list, practical teacher, student grade rows, ECTS distribution.
  - Institution defaults saved in settings and pre-filled in print dialog.
  - Custom uploaded templates are stored in OPFS (Origin Private File System) per workspace.
- Sync session: refreshes the session's auto-calculated grades from the latest Summary data (does not imply external submission). Available as a button per session tab; a batch sync runs across all open sessions for the group simultaneously.
- Session status: Open / Closed. No "submitted to external system" flag exists on sessions; that concept lives in Plans.

---

### 5.12 Documents — Plans (IEP)

Plans track students with Individual Education Plans across exam sessions.

**Requirements:**
- Display all students with the IEP flag in a table: name, final grade, session type, sync status, sync timestamp.
- Filter by group.
- Show ECTS grade distribution badge.
- Toggle sync status per student (marks as exported/submitted).
- Bulk sync status update.

---

### 5.13 Settings

Settings are split across a global page and four route-scoped sub-pages.

#### Global Settings (`/settings`)
- Language selection (en-US / uk-UA), theme (light/dark/system).
- Workspace management: create, rename, recolor, delete, export/import individual workspaces.
- Sync section: placeholder for future cloud sync (not yet implemented).
- Dev & Diagnostics: app version, DB version, copy diagnostics JSON (includes recent log ring-buffer).

#### Reports Settings (`/attendance/settings`)
- Meet data: export / import / delete all meet records.
- Storage usage per entity.
- Duration limit: configurable cap in minutes; option to retroactively apply to all existing meets.
- Session squash: enable/disable toggle + threshold in minutes for merging consecutive short reconnections.

#### Organization Settings (`/org/settings`)
- Data management (export / import / delete) for: Students, Groups, Members.
- Storage usage per entity.

#### Control Settings (`/control/settings`)
- Data management (export / import / delete) for: Marks, Tasks, Modules.
- Summary Export card: select a group and download the final grade table as CSV or DOCX.

#### Documents Settings (`/documents/settings`)
- Institution-level print defaults: subject, form of control, semester, credit hours, examiners, practical teacher (persisted as `PrintSettings` in the `settings` store).
- Custom .docx template: upload, preview name, download starter template, delete custom template (stored in OPFS per workspace).

---

## 6. Cross-Cutting Requirements

### 6.1 Offline & PWA
- All features must work without network access after initial page load.
- Service Worker precaches all static build artifacts (JS, CSS, HTML, icons, fonts).
- No runtime network caching rules are needed (all data is IndexedDB).
- PWA manifest enables installation on desktop and mobile.
- When a new version is deployed, the app shows a non-blocking update banner. The user clicks "Reload" to activate.
- The Service Worker polls for updates every hour.

### 6.2 Performance
- CSV parsing, summary calculations, and group stats aggregation run in Web Workers (via Comlink) to avoid blocking the UI thread. Three workers: `parser.worker.js`, `summary.worker.js`, `groups.worker.js`.
- Tables use TanStack Vue Table with pagination for large datasets.
- IndexedDB queries use indexes; no full-table scans for filtered views.

### 6.3 Data Integrity
- IndexedDB schema is versioned (currently v17). Each version bump includes explicit migration handlers that transform existing data.
- No data is deleted during migrations without explicit user confirmation.

### 6.4 Accessibility & Internationalization
- All UI components are built on Reka UI (headless, ARIA-compliant primitives).
- All user-visible strings are translated in both `en-US.json` and `uk-UA.json`.
- Language can be changed at runtime without page reload.

### 6.5 Theming
- Light and dark mode, toggled by the user or defaulting to system preference.
- Theme switches use the CSS View Transitions API for an animated fade.
- Theme preference is persisted via `@vueuse/core` colorMode.
- Optional per-workspace accent color applied via CSS custom property.

---

## 7. Data Model Summary

| Object Store | Description |
|---|---|
| `meets` | Google Meet sessions (source data from CSV imports) |
| `groups` | Student groups / classes |
| `members` | All participants (students, teachers, assistants) |
| `tasks` | Individual assignments |
| `marks` | Student grades per task |
| `units` | Module definitions (grouped tasks with coefficients) — the `src/modules/Units/` feature |
| `modules` | Module-group associations linking a unit to a group — managed by `src/modules/Summary/` |
| `finalAssessments` | Computed or manually entered final exam grades |
| `sessions` | Exam session records (Main, Retake 1, Retake 2) |
| `plans` | Individual Education Plan records per student |
| `settings` | Key-value store for app and workspace configuration |
| `students` | **Legacy** — exists for migration compatibility only; no new writes |

---

## 8. Out of Scope

The following are explicitly not in scope for EduTrace:

- Backend server, REST API, or cloud database.
- User authentication or multi-user collaboration.
- Real-time sync between devices (a future "Cloud Sync" feature is planned but not yet implemented).
- Mobile-native apps (the PWA covers mobile installation needs).
- Support for attendance sources other than Google Meet CSV exports.
- Grading rubric builders or learning management system (LMS) features beyond what is described above.

---

## 9. Future Considerations

- **Cloud Sync** — optional opt-in synchronization of workspace data across devices (UI placeholder exists in settings).
- **Additional CSV sources** — support for other video conferencing platforms' attendance exports.
- **Grade analytics** — deeper grade trend analysis (grade distribution over time, cohort comparisons).
- **Document templates** — richer template editor beyond custom .docx upload.
