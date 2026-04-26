# Calendar View Guidelines

This document defines the canonical structure for calendar views used inside detail pages.

Current examples: `AnalyticsCalendarView.vue` (multi-session), `ReportCalendarView.vue` (single-session).

---

## Two variants

| Variant | When to use | Example |
|---|---|---|
| **Multi-session** | Entity has many dated sessions; clicking a day opens a detail modal | `AnalyticsCalendarView` |
| **Single-session** | Entity is itself one session; calendar just highlights its date | `ReportCalendarView` |

Both variants share the same grid structure and composable. They differ only in how `calendarDays` is computed and whether a day-click modal exists.

---

## Composable

Always use `useCalendar` from `@/shared/composables/useCalendar`:

```ts
import { useCalendar } from '@/shared/composables/useCalendar'

const { currentMonth, weekDays, nextMonth, prevMonth, generateCalendarDays } = useCalendar()
```

- `weekDays` — reactive array of localized abbreviated names (`Sun`, `Mon`, …). Never truncate with `.slice(0, 3)` — the composable already returns short names.
- `generateCalendarDays(sessionsMap, sessionDate)` — builds a full 6-week grid anchored to `currentMonth`. Pass `null` for arguments you don't use.
- `currentMonth` — a `Ref<Date>` you can set directly to jump to a specific month.

**Jump to the relevant month on mount** — always initialize `currentMonth` via a `watch` with `{ immediate: true }`:

```ts
// Multi-session: jump to last session date
watch(() => props.stats?.dates, (dates) => {
    if (dates?.length) currentMonth.value = parseISO(dates[dates.length - 1])
}, { immediate: true })

// Single-session: jump to the session's date
watch(sessionDate, (date) => {
    if (date) currentMonth.value = date
}, { immediate: true })
```

---

## calendarDays computed

Extend the base days returned by `generateCalendarDays` with domain data. Keep this logic in the view's `<script setup>`, not in the composable.

**Multi-session:**
```ts
const calendarDays = computed(() => {
    return generateCalendarDays(null, null).map(day => {
        const dateStr = format(day.date, 'yyyy-MM-dd')
        const session = props.stats.sessions[dateStr]
        return {
            ...day,
            isSessionDay: !!session,
            participantCount: session ? Object.keys(session.participants).length : 0,
            startTime: session?.startTime ?? null,
            maxDuration: session?.maxDuration ?? 0,
        }
    })
})
```

**Single-session:**
```ts
const sessionDate = computed(() => props.meet.date ? new Date(props.meet.date) : null)

const calendarDays = computed(() => {
    return generateCalendarDays(null, sessionDate.value).map(day => {
        const isSessionDay = sessionDate.value && isSameDay(day.date, sessionDate.value)
        return {
            ...day,
            isSessionDay,
            participantCount: isSessionDay ? props.meet.participants.length : 0,
        }
    })
})
```

---

## Template structure

### Calendar header (month nav)

```vue
<div class="flex items-center justify-between">
  <h4 class="text-lg font-semibold capitalize">
    {{ format(currentMonth, 'MMMM yyyy') }}
  </h4>
  <div class="flex items-center gap-1">
    <Button variant="ghost" size="icon" @click="prevMonth">
      <ChevronLeft class="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" @click="nextMonth">
      <ChevronRight class="w-4 h-4" />
    </Button>
  </div>
</div>
```

- Month label: always `capitalize` (date-fns `format` lowercases some locales).
- Nav buttons: `variant="ghost" size="icon"` — never styled differently.

### Calendar grid

```vue
<div class="border rounded-lg overflow-hidden bg-card">
  <!-- Weekday row -->
  <div class="grid grid-cols-7 bg-muted/50 border-b">
    <div v-for="day in weekDays" :key="day"
         class="p-3 text-center text-sm font-medium text-muted-foreground">
      {{ day }}
    </div>
  </div>

  <!-- Day cells -->
  <div class="grid grid-cols-7 divide-x divide-y bg-background border-t">
    <div v-for="day in calendarDays" :key="day.date.toString()"
         class="min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 transition-colors relative"
         :class="[
           !day.isCurrentMonth && 'bg-muted/10 text-muted-foreground',
           day.isToday        && 'bg-primary/5',
         ]">

      <!-- Day number -->
      <span class="text-[10px] sm:text-sm font-medium w-5 h-5 sm:w-7 sm:h-7
                   flex items-center justify-center rounded-full"
            :class="day.isToday && 'bg-primary text-primary-foreground'">
        {{ format(day.date, 'd') }}
      </span>

      <!-- Session content — see variants below -->
    </div>
  </div>
</div>
```

Rules:
- Grid wrapper: `border rounded-lg overflow-hidden bg-card`. Never an outer `overflow-x-auto` — the grid is not horizontally scrollable; it compresses gracefully.
- Day cell height: `min-h-[80px] sm:min-h-[120px]`.
- Off-month days: `bg-muted/10 text-muted-foreground`.
- Today: `bg-primary/5` on the cell; `bg-primary text-primary-foreground` circle on the day number.
- Never highlight session days with a hardcoded color class (e.g. `bg-green-50`) — use `bg-primary/5` or no extra background, and rely on the session content block to signal presence.

### Session content block

**Multi-session** — clickable card inside the day cell:

```vue
<div v-if="day.isSessionDay"
     class="bg-muted hover:bg-muted/80 rounded p-1 sm:p-2 space-y-1 sm:space-y-1.5
            cursor-pointer transition-colors shadow-sm"
     @click="openDayDetails(day)">

  <div class="bg-primary/10 text-primary text-[8px] sm:text-xs font-semibold
              px-1.5 py-0.5 rounded inline-block truncate max-w-full">
    {{ $t('module.calendar.session') }}
  </div>

  <!-- optional: duration bar (sm+ only) -->
  <div class="hidden sm:block space-y-0.5"> ... </div>

  <!-- time range -->
  <div v-if="day.startTime"
       class="flex items-center gap-1 text-[8px] sm:text-xs text-muted-foreground">
    <Clock class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
    <span class="truncate">{{ formatTime(day.startTime) }}</span>
  </div>

  <!-- participant count -->
  <div class="flex items-center gap-1 text-[9px] sm:text-xs font-medium text-primary">
    <Users class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
    <span class="hidden sm:inline">{{ $t('module.calendar.participants', { count: day.participantCount }) }}</span>
    <span class="inline sm:hidden">{{ day.participantCount }}</span>
  </div>
</div>
```

**Single-session** — non-clickable, centered info:

```vue
<div v-if="day.isSessionDay" class="flex flex-col gap-1.5 text-center">

  <div class="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
    {{ $t('module.session.badge') }}
  </div>

  <div v-if="meet.startTime"
       class="flex items-center justify-center gap-1 text-xs text-muted-foreground">
    <Clock class="w-3 h-3" />
    {{ formatTime(meet.startTime) }}
  </div>

  <div class="flex items-center justify-center gap-1 text-[10px] leading-tight text-primary font-medium">
    <Users class="w-3 h-3" />
    <span class="hidden sm:inline">{{ $t('module.session.participants', { count: day.participantCount }) }}</span>
    <span class="sm:hidden">{{ day.participantCount }}</span>
  </div>
</div>
```

Rules for both variants:
- Session badge: always `bg-primary/10 text-primary`. Never hardcode `bg-green-500` or any semantic color — it breaks dark mode.
- Participant count: full label (`"N participants"` via i18n interpolation) on `sm:+`, bare count on smaller. Never hardcode a fallback string (`|| 'учасн.'`) — if the key is missing, `$t` returns the key path (truthy), so the fallback never fires anyway. Fix the missing key instead.
- Icons: `w-3 h-3` (single-session) or responsive `w-2.5 h-2.5 sm:w-3 sm:h-3` (multi-session, more information density).

---

## Where to place the view in the page

Calendar views live in `TabsContent` inside the detail page's `<Tabs>`. They receive the loaded entity object as a prop — never the raw id.

The view itself owns its outer layout. Use either:

- **Flat** (`<div class="space-y-4">`) — when the calendar is the only content in the tab (e.g. `AnalyticsCalendarView`).
- **Card** (`<Card>`) — when the tab mixes the calendar with other content, or for visual consistency with sibling tabs that all use Cards.

Do not mix both. Pick one and apply it consistently across all views in the same detail page.

---

## Day-detail modal (multi-session only)

Clicking a session day opens a modal with the participant breakdown for that day. The modal component receives pre-processed data — never a raw date string and a service call:

```ts
// Compute modal data as a computed in the view
const modalParticipants = computed<ModalParticipant[]>(() => {
    if (!selectedDay.value?.dateStr) return []
    const session = props.stats.sessions[selectedDay.value.dateStr]
    if (!session?.participants) return []
    return Object.entries(session.participants)
        .map(([name, duration]) => ({ name, duration, percentage: ... }))
        .sort((a, b) => b.duration - a.duration)
})
```

The modal is rendered at the bottom of the view template, outside the grid:

```vue
<DayDetailsModal
    :is-open="isModalOpen"
    :date="selectedDayLabel"
    :participants="modalParticipants"
    @update:open="isModalOpen = $event"
    @close="closeDayDetails"
/>
```

---

## Quick checklist

```
New calendar view?
  ├─ useCalendar() — currentMonth, weekDays, nextMonth, prevMonth, generateCalendarDays
  ├─ watch with immediate:true — jump to first/last session month on mount
  ├─ calendarDays computed — extend base days with domain data (isSessionDay, counts, times)
  │
  ├─ Grid wrapper: border rounded-lg overflow-hidden bg-card  (no overflow-x-auto)
  ├─ Weekday row: bg-muted/50 border-b, use weekDays directly (no .slice)
  ├─ Day cells: min-h-[80px] sm:min-h-[120px], off-month bg-muted/10, today bg-primary/5
  │
  ├─ Session badge: bg-primary/10 text-primary  (never hardcoded colors)
  ├─ Participant count: interpolated i18n key on sm+, bare number on smaller
  │
  ├─ Multi-session: clickable bg-muted card + DayDetailsModal at bottom of template
  └─ Single-session: non-clickable centered info block, no modal needed
```
