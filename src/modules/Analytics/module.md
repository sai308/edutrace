# Analytics Module

## Purpose

Tracks and visualizes attendance data sourced from Google Meet CSV exports. Aggregates per-session participation into group-level statistics, computes attendance percentages per student, and provides calendar, table, and overview visualizations for reviewing engagement trends.

**Primary users:** Teachers and administrators monitoring student attendance and session participation.

---

## Directory Structure

```
Analytics/
├── types/
│   └── analytics.d.ts               Core domain types: Meet, Participant, GlobalStat, DetailedStats
├── services/
│   ├── meets.repository.ts          IndexedDB persistence for meet records
│   └── analytics.service.ts         Aggregation logic: global stats, detailed matrix, single report
├── composables/
│   ├── useAnalytics.ts              Reactive state for global stats list
│   ├── useAnalyticsDetails.ts       Reactive state for a single meet's detailed stats
│   └── useMeets.ts                  Reactive state for meet list management
├── pages/
│   ├── AnalyticsPage.vue            List page — loads global stats, renders dashboard
│   └── AnalyticsDetailsPage.vue     Detail page — tabbed view for a single meet
└── views/
    ├── AnalyticsDashboard.vue        Card grid with search and section grouping
    ├── AnalyticsOverviewView.vue     Per-session summary cards
    ├── AnalyticsTableView.vue        Participant × date attendance matrix
    └── AnalyticsCalendarView.vue     Month calendar with clickable session days
```

---

## Data Model

### Meet
```typescript
{
  id: string            // Internal UUID
  meetId: string        // Google Meet room ID (e.g. "abc-defg-hij")
  date: string          // YYYY-MM-DD
  startTime?: string    // ISO datetime
  endTime?: string      // ISO datetime
  participants: Participant[]
  filename?: string
  uploadedAt?: string
  groupName?: string
}
```

### Participant
```typescript
{
  name: string
  duration: number      // Seconds
  email?: string
  joinTime?: string     // ISO datetime
}
```

### GlobalStat
Aggregated per unique `meetId`:
```typescript
{
  meetId: string
  totalSessions: number
  totalDuration: number               // Sum of session max durations (minutes)
  totalParticipantAppearances: number
  lastActive: string
  uniqueParticipantsCount: number
  activeParticipantsCount: number
  avgDuration: number                 // Minutes
  attendancePercentage: number
  totalPossibleAppearances: number    // sessions × expected members
}
```

### DetailedStats
Per-meet breakdown used in the detail page:
```typescript
{
  dates: string[]
  matrix: DetailedMatrixRow[]         // One row per participant
  sessions: Record<string, DetailedSession>
  reportIds: Record<string, string>   // date → meet record ID
}
```

### DetailedMatrixRow
```typescript
{
  name: string
  totalDuration: number
  totalPossible: number
  totalPercentage: number
  [date: string]: { duration, percentage, status }  // Per-session cell
}
```

---

## Business Rules & Logic

### Global Stats Computation
1. All meets are grouped by `meetId`.
2. A name→Member lookup (including aliases) identifies group members.
3. Configured **ignored users** and **teachers** are excluded from participation counts.
4. If a group exists for the meetId, only members of that group are counted; otherwise all non-ignored participants are counted.
5. Per-session duration = max participant duration (not sum).
6. Attendance % = `(totalAppearances / (sessions × uniqueParticipants)) × 100`.

### Detailed Stats Computation
1. Sessions are grouped by date; multiple meets on the same day are merged (earliest start, latest end).
2. The specified teacher (if any) is excluded from the participant matrix.
3. Each participant row includes absent group members (duration = 0).
4. Per-cell percentage = `(participantDuration / sessionMaxDuration) × 100`.
5. Cell color thresholds: ≤15% red-500, ≤30% red-400, ≤50% yellow-200, ≤75% yellow-400, >75% green-500.

### Duration Capping
- `applyDurationLimitToAll(limitMinutes)` caps every participant's duration in all stored meets.
- Returns a count of modified records.
- The cap is applied permanently at the data layer (not at display time).

### Duplicate Detection
- `isDuplicateFile(filename, meetId, date)` prevents re-importing the same CSV.

---

## Repository — `meets.repository.ts`

| Method | Description |
|---|---|
| `saveMeet(meet)` | Upsert a meet record |
| `getAllMeets()` | Return all meet records |
| `getMeetsByMeetId(meetId)` | All sessions for one Google Meet room |
| `getMeetById(id)` | Single meet by internal UUID |
| `checkMeetExists(meetId, date)` | Check if a session on that date exists |
| `isDuplicateFile(filename, meetId, date)` | Detect duplicate CSV uploads |
| `deleteMeets(ids)` | Bulk delete by ID array |
| `applyDurationLimitToAll(limitMinutes)` | Cap participant durations; return modified count |

---

## Service — `analytics.service.ts`

| Method | Returns | Description |
|---|---|---|
| `getGlobalStats(meets?)` | `GlobalStat[]` | Aggregate stats per meetId; loads members, groups, settings |
| `getDetailedStats(meetId, teacher?)` | `DetailedStats` | Build attendance matrix for one meet |
| `getSingleReportStats(id)` | `SingleReportStats` | Extract stats for a single meet record |

---

## UI Behavior

### AnalyticsPage → AnalyticsDashboard
- **Search** filters cards by meetId, group name, or teacher name.
- Cards show totalSessions, avg duration, active/unique participants, attendance badge.
- Actions per card: view details, show QR code, copy meetId to clipboard.

### AnalyticsDetailsPage
Three tabs, each synced to `?view=` URL query param:
- **Overview** — grid of per-session summary cards (AnalyticsOverviewView)
- **Table** — sticky-column participant × date matrix with color-coded percentages (AnalyticsTableView)
- **Calendar** — month calendar; clicking a session day opens DayDetailsModal with participant duration breakdown (AnalyticsCalendarView)

---

## Composables

### `useMeets.ts`
Module-level singleton: `meets` and `groupsMap` refs are declared at module scope. All consumers (AnalyticsPage, Reports upload, AnalyticsDetailsPage) share the same reactive state — a delete in one view is immediately reflected everywhere without re-mounting.

| Return | Description |
|---|---|
| `meets` | `Ref<Meet[]>` — shared singleton meet list |
| `groupsMap` | `Ref<Record<string, Group>>` — meetId → Group lookup |
| `loadMeets()` | Reload meets + groups map |
| `deleteMeet(id)` | Delete single meet; reload |
| `bulkDeleteMeets(ids)` | Bulk delete; reload |

### `useAnalytics.ts`
Per-instance (not singleton) — parameterized by the active group/filter state; owned by `AnalyticsPage`.

### `useAnalyticsDetails.ts`
Per-instance — parameterized by route `id`; owned by `AnalyticsDetailsPage`.

---

## Settings

| Key | Type | Default | Effect |
|---|---|---|---|
| `durationLimit` | number (minutes) | 0 | Caps participant durations in all stored meets (0 = unlimited) |
| `ignoredUsers` | string[] | [] | Names excluded from all stats |
| `teachers` | string[] | [] | Auto-excluded from participation counts |
