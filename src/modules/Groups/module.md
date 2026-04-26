# Groups Module

## Purpose

Manages class/cohort definitions that link a Google Meet room to a named group of students. Each group ties a `meetId` to a group name, teacher, and course year, enabling all other modules to organize data by class. Saving a group automatically synchronizes student members from existing meet records.

**Primary users:** Teachers and administrators creating and maintaining the class roster structure.

---

## Directory Structure

```
Groups/
├── types/
│   └── groups.d.ts             Group and GroupFormData interfaces
├── services/
│   ├── groups.repository.ts    IndexedDB persistence + member sync side-effect
│   ├── groups.service.ts       Business logic; delegates heavy processing to Web Worker
│   └── tests/
│       └── groups.service.test.ts
├── composables/
│   └── useGroups.ts            Reactive state wrapping groupsService
├── pages/
│   └── GroupsPage.vue          Route entry point
├── views/
│   └── GroupsView.vue          Sortable/filterable table with column visibility
└── components/
    └── GroupModal.vue          Create/edit form with autocomplete fields
```

---

## Data Model

### Group
```typescript
{
  id?: string | number
  meetId: string          // Google Meet room ID
  name: string            // Class/cohort display name
  teacher?: string
  course?: number         // Year/course number (1–4)
}
```

### ProcessedGroup (worker output)
Extends `Group` with computed stats:
```typescript
{
  avgTaskCompletion: number   // % of assigned tasks completed by group members
  avgMark: number             // Mean score
  modeMark: number            // Most frequent score
  medianMark: number          // Median score
}
```

---

## Business Rules & Logic

### Group Save
1. `name` and `meetId` are required — validation throws on missing values.
2. A UUID is generated for new groups.
3. **Member sync side-effect**: after persisting the group, all meet records with matching `meetId` are fetched and their participants are upserted as student members in the `members` store via `studentsRepository.syncParticipants()`.

### Group Deletion
- Deletes only the group record.
- Does **not** cascade-delete students, marks, or tasks associated with the group.

### Stats Computation (Web Worker)
1. Loads all groups, meets, members, tasks, marks, and teachers in parallel.
2. Sends JSON-serialized payload to `groups.worker` via Comlink (removes Vue reactive proxies).
3. Worker returns per-group stats: `avgTaskCompletion`, `avgMark`, `modeMark`, `medianMark`.
4. Also returns `memberCounts`, `allMeetIds`, and `allTeachers` for downstream UI.

### Course Extraction
- `GroupModal` can auto-extract a course year from the group name (e.g., "CS Year 3" → `course = 3`) using a digit regex.

---

## Repository — `groups.repository.ts`

| Method | Description |
|---|---|
| `getGroups()` | Return all group records |
| `saveGroup(group)` | Upsert group; triggers `syncMembersFromMeets()` side-effect |
| `deleteGroup(id)` | Remove group record |
| `getGroupMap()` | Return `Record<meetId, Group>` for fast lookup |
| `syncMembersFromMeets(group)` | Fetch meets for group's meetId and sync participants as members |

---

## Service — `groups.service.ts`

| Method | Returns | Description |
|---|---|---|
| `loadGroupsData()` | Processed groups + member counts + meetIds + teachers | Parallel fetch → worker aggregation |
| `saveGroup(formData)` | `Group` | Validate, assign UUID, persist |
| `deleteGroup(id)` | void | Delete by ID |

---

## Composable — `useGroups.ts`

Module-level singleton: `groups`, `memberCounts`, `allMeetIds`, `allTeachers`, and `isLoading` refs are declared at module scope, not inside the function body. All callers share one reactive instance — writes from `GroupModal` are immediately reflected in `GroupsView` without refetching on remount.

| Return | Description |
|---|---|
| `groups` | `Ref<EnrichedGroup[]>` |
| `memberCounts` | `Ref<Record<string, number>>` |
| `allMeetIds` | `Ref<string[]>` — for autocomplete in GroupModal |
| `allTeachers` | `Ref<string[]>` — for autocomplete in GroupModal |
| `isLoading` | `Ref<boolean>` |
| `loadData()` | Fetch all groups data via `groupsService.loadGroupsData()` |
| `saveGroup(formData)` | Save + reload + toast |
| `deleteGroup(id)` | Delete + reload + toast |

---

## UI Behavior

### GroupsView
- **Search** filters by group name or meetId.
- **Sortable columns**: name, course, meetId, members, teacher, avgTaskCompletion, avgMark, modeMark, medianMark.
  - Members column sorts by `memberCounts[group.name]`.
  - Course defaults to 0 when absent.
- **Column visibility**: modeMark and medianMark hidden by default; toggled via ColumnPicker.
- **Row actions** (dropdown): Show QR code → Edit → Delete (with confirmation).

### GroupModal
- **meetId** autocomplete: dropdown from `allMeetIds`.
- **teacher** autocomplete: dropdown from teacher list.
- **course** auto-extracted from group name if not set.
- **defaultTeacher** from settings pre-fills the teacher field on open.

---

## Settings

| Key | Type | Default | Effect |
|---|---|---|---|
| `defaultTeacher` | string \| null | null | Pre-fills teacher field in GroupModal |
| `teachers` | string[] | [] | Populates teacher autocomplete suggestions |
