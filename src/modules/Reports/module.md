# Reports Module

## Purpose

Handles the import and viewing of Google Meet attendance CSV exports. Parses files in a Web Worker, reconciles participant identities against the student database, applies duration limits, detects duplicates, and persists the records that feed the Analytics module. Provides a listing page and a multi-tab detail view for each meet record.

**Primary users:** Teachers uploading attendance exports after each session.

---

## Directory Structure

```
Reports/
├── pages/
│   ├── ReportsPage.vue              Listing page: search, upload, bulk delete
│   └── ReportDetailsPage.vue        Detail page: tabs for participants, timeline, calendar
├── services/
│   ├── reports.service.ts           Parse files, apply limits, reconcile identities, persist
│   └── tests/
│       └── reports.service.test.ts
├── composables/
│   ├── useReportMeet.ts             Load a single meet by ID; exposes totalDuration, avgDuration
│   ├── useReportDetails.ts          Reactive state for single-meet analytics stats
│   └── useReportProcessing.ts       Reactive state for upload/processing workflow
├── components/
│   ├── dialogs/
│   │   ├── ReportsUploadDialog.vue  Drag-drop file drop zone
│   │   ├── ReportsImportDialog.vue  Filter mode selector (all vs. related)
│   │   └── ReportsDeleteDialog.vue  Delete confirmation (single or bulk)
│   └── ReportsList/
│       ├── DataTable.vue            TanStack table for meet listing
│       ├── columns.ts               Column definitions (accepts emit + t for i18n)
│       └── DataEmpty.vue            Empty state with import CTA
├── views/
│   ├── ReportParticipantsView.vue   Table: name, email, duration, attendance %, join time
│   ├── ReportOverviewView.vue       Session timeline: horizontal duration bars per participant
│   └── ReportCalendarView.vue       Month calendar highlighting the meet date
└── utils/
    ├── duration.ts                  calculateMeetDuration — total session duration in seconds
    ├── duration.test.ts
    ├── timeline.ts                  calculateTimelineData — layout data for timeline bars
    └── timeline.test.ts
```

---

## Data Model

Uses `Meet` and `Participant` from the Analytics module (shared store).
`Participant.studentId` (optional string) is written back after identity reconciliation.

### ReportProcessingStats
```typescript
{
  saved: number         // Meet records created
  skipped: number       // Duplicates detected and skipped
  unrecognized: number  // Files whose meetId matched no known group (when filter = 'related')
}
```

### TimelineParticipant / TimelineData
Returned by `calculateTimelineData(meet)`. Contains per-participant layout values
(`offsetPercent`, `durationPercent`, `percentage`) used by `ReportOverviewView`.

---

## Business Rules & Logic

### File Parsing
- Each file is sent to `parser.worker` via Comlink; parsing runs in parallel across all selected files.
- The worker extracts meetId, date, startTime, endTime, and participants from the CSV.
- An empty files array returns `{ saved: 0, skipped: 0, unrecognized: 0 }` immediately.

### Filter Modes
- **`all`**: every parsed file is processed regardless of group association.
- **`related`**: only files whose `meetId` matches a known group are processed; unrecognized files are counted as `unrecognized` and skipped.

### Duplicate Detection
- `meetsRepository.isDuplicateFile(filename, meetId, date)` checks all three fields.
- Duplicate files increment `stats.skipped` and are not re-persisted.

### Duration Limiting
- Reads `durationLimit` (minutes) from settings; converts to seconds.
- Caps each participant's `duration` before saving (0 = no cap).
- The capped value is stored permanently, not applied at display time.

### Identity Reconciliation
- Participants are matched to existing members via `IdentityReconciler` (email → normalized name priority).
- New participants are created as student members with a generated UUID.
- Resolved `studentId` is written back onto each `Participant` record before the meet is saved.
- New/updated members are bulk-upserted before the meet record is persisted.

### Group Normalization
- If the meet's `meetId` matches a known group: `groupName = normalizeGroupName(group.name)`.
- If no group match: `groupName = 'Unknown'`.

### Timeline Layout
- `calculateTimelineData(meet)` in `utils/timeline.ts` resolves session bounds (explicit times or
  estimated from participant join times) and returns per-participant `offsetPercent` / `durationPercent`
  values ready for CSS positioning. All heavy computation stays outside the Vue component.

---

## Repository

Reports has no dedicated repository class. `reports.service.ts` directly uses:
- `meetsRepository` (Analytics module) — `isDuplicateFile`, `saveMeet`
- `groupsRepository` — `getGroupMap`
- `studentsRepository` — `getAllMembers`, `bulkPut`
- `settingsRepository` — `getDurationLimit`

---

## Service — `reports.service.ts`

`parseFile` wraps the Comlink parser call with `withTimeout(30_000)` and rethrows via `classifyWorkerError`. `useReportProcessing` maps `WorkerError.code` to i18n toasts (`workerErrors.*`).

| Method | Returns | Description |
|---|---|---|
| `parseFile(file)` | `Meet` | Send file to worker (30 s timeout); return parsed meet |
| `processFiles(files, filterMode)` | `ReportProcessingStats` | Full pipeline: parse → filter → deduplicate → limit → reconcile → persist |

### `processFiles` pipeline
1. Return empty stats immediately if `files` is empty.
2. Load groups map and duration limit in parallel.
3. Parse all files in parallel via worker.
4. For each parsed meet: filter mode check → duplicate check → apply duration limit → reconcile identities → bulk-save new members → save meet.
5. Return aggregated stats.

---

## Composables

### `useReportMeet(meetId)`
Loads a single meet by internal ID, sorts participants alphabetically, and exposes:
- `meet` — reactive `Meet | undefined`
- `isLoading` — boolean
- `totalDuration` — computed seconds via `calculateMeetDuration`
- `avgDuration` — computed seconds (average per participant)
- `loadMeet()` — trigger load

### `useReportProcessing()`
Manages the multi-step upload flow: drop → filter-mode dialog → process.
Toast messages use i18n keys (`reports.processing.*`).

### `useReportDetails(reportId)`
Loads `SingleReportStats` from `analyticsService` for the analytics tab variant.

---

## UI Behavior

### ReportsPage
- **Search**: real-time filter by meetId across the table.
- **Result counter**: `$t('reports.subtitle', { count, total })`.
- **Bulk delete**: appears when rows are selected; delete button uses `$t('common.delete')`.
- **Upload flow**: ReportsUploadDialog (drop zone) → ReportsImportDialog (choose filter mode) → `processFiles()`.

### Table Columns (`columns.ts`)
`createColumns(emit, t)` accepts a typed emit function and the i18n `t` function.
Columns: Select, Group, Meet ID, Date, Participants, Max Duration, Uploaded At, Actions.
All labels and action names use i18n keys.

### ReportDetailsPage
**Header**: back button, meet filename as title, group badge, tab selector.

**Stats cards**: Date, Participants, Total Duration, Avg Duration — all titles/descriptions from i18n.
Duration formatted via `useFormatters().formatDuration`.

**Tabs**:
- **Participants**: name, email, duration, attendance % (color-coded: ≥75% green, 50–74% yellow, <50% red), join time.
- **Overview** (timeline): horizontal bars per participant. Layout data from `calculateTimelineData`. Colour thresholds from `ATTENDANCE_BADGE_THRESHOLDS`.
- **Calendar**: month calendar with the meet date highlighted; shows session time and participant count.

---

## Settings

| Key | Type | Default | Effect |
|---|---|---|---|
| `durationLimit` | number (minutes) | 0 | Caps participant duration before persisting (0 = unlimited) |
| `sessionSquash` | boolean | false | Merge consecutive sessions within threshold (applied during processing) |
| `sessionSquashThreshold` | number (minutes) | 10 | Gap threshold for session squashing |

Configured via **Reports Settings** page (`/attendance/settings`).
