# Detail Page Guidelines

This document defines the canonical structure for **entity detail pages** — pages that show full information about a single entity and expose multiple data presentations via a view-switcher toggle.

Current examples: `ReportDetailsPage.vue`, `AnalyticsDetailsPage.vue`.

---

## When to use this pattern

Use a detail page with a view switcher when:

- The user navigates **into** a single entity from a list page (report, session, group, student).
- The entity has **two or more meaningfully different data presentations** — e.g. an overview summary, a participants table, and a calendar view.
- Each presentation is independent enough that showing them simultaneously would cause information overload.

Do **not** use this pattern for pages that just show a form or a single card. Those use the standard page anatomy from `DESIGN.md §7`.

---

## Page anatomy

```
┌──────────────────────────────────────────────────────────┐
│ Zone 1 — Header                                          │
│  [←]  Entity title          [Overview] [Table] [Calendar]│
│       Subtitle / metadata                                 │
├──────────────────────────────────────────────────────────┤
│ Zone 2 — Stats strip  (optional)                         │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │ Stat 1 │  │ Stat 2 │  │ Stat 3 │  │ Stat 4 │         │
│  └────────┘  └────────┘  └────────┘  └────────┘         │
├──────────────────────────────────────────────────────────┤
│ Zone 3 — View content                                    │
│                                                          │
│   <Active view component>                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The `<Tabs>` component from `@/components/ui/tabs` wraps **all three zones** so that the `TabsList` in Zone 1 and the `TabsContent` blocks in Zone 3 share the same Tabs context.

---

## File structure

```
src/modules/<Module>/
  pages/
    <Entity>DetailsPage.vue      ← data loading, state, Tabs root
  views/
    <Entity>OverviewView.vue     ← view 1 (entity summary / charts)
    <Entity>ParticipantsView.vue ← view 2 (table of linked records)
    <Entity>CalendarView.vue     ← view 3 (temporal / calendar layout)
  composables/
    use<Entity>Details.ts        ← data fetching + derived computed values
```

The `Page` layer loads data and owns state. Each `View` receives the loaded entity as a prop — **never** the raw `id`. This keeps views pure and testable.

---

## Zone 1: Header

The header row contains three elements left-to-right: back button, title block, and the `TabsList`.

```vue
<Tabs v-model="viewMode" class="space-y-6">
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">

    <!-- Left: back + title -->
    <div class="flex items-start md:items-center gap-3">
      <Button variant="ghost" size="icon" class="shrink-0 mt-0.5 md:mt-0"
              @click="router.back()" :title="$t('common.back')">
        <ArrowLeft class="w-5 h-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ $t('module.details.title') }}</h1>
        <p class="text-sm text-muted-foreground mt-0.5">{{ entity.subtitle }}</p>
      </div>
    </div>

    <!-- Right: view switcher -->
    <TabsList class="w-full md:w-auto h-auto p-1 flex-wrap justify-start md:justify-center">
      <TabsTrigger value="overview" class="flex-1 md:flex-none gap-2">
        <GanttChart class="w-4 h-4" />
        <span class="hidden md:inline">{{ $t('views.overview') }}</span>
      </TabsTrigger>
      <TabsTrigger value="participants" class="flex-1 md:flex-none gap-2">
        <Users class="w-4 h-4" />
        <span class="hidden md:inline">{{ $t('views.participants') }}</span>
      </TabsTrigger>
      <TabsTrigger value="calendar" class="flex-1 md:flex-none gap-2">
        <Calendar class="w-4 h-4" />
        <span class="hidden md:inline">{{ $t('views.calendar') }}</span>
      </TabsTrigger>
    </TabsList>

  </div>
  <!-- zones 2 and 3 go here, still inside <Tabs> -->
</Tabs>
```

Rules:
- Back button: always `variant="ghost" size="icon"` with `ArrowLeft`. Always calls `router.back()` — do not hardcode a route name.
- The title uses `<h1>` (not `<h2>`) because this is the page's primary heading.
- `TabsList` on tablet (base): `w-full flex-wrap justify-start`, triggers are `flex-1` so they divide the row equally.
- `TabsList` on desktop (`md:`): `w-auto justify-center`, triggers use `flex-none` (natural width).
- Tab trigger labels: always `hidden md:inline` — icon-only on tablet, icon + text on desktop.
- Tab trigger icons: always `w-4 h-4`. Do not add `mr-2` — use `gap-2` on the trigger instead.

---

## Zone 2: Stats strip (optional)

Show a horizontal strip of stat cards when the entity has 2–4 quick-glance metrics. Skip this zone if the entity data is not metric-oriented (e.g. a simple name/description record).

```vue
<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
  <Card v-for="stat in stats" :key="stat.key" class="min-w-0">
    <CardContent class="p-3 sm:p-4 flex items-center gap-3">
      <component :is="stat.icon"
                 class="h-7 w-7 sm:h-10 sm:w-10 text-muted-foreground opacity-60 shrink-0" />
      <div class="min-w-0">
        <p class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {{ $t(stat.labelKey) }}
        </p>
        <div class="text-base sm:text-2xl font-bold truncate">{{ stat.value }}</div>
        <p class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block">
          {{ $t(stat.descKey) }}
        </p>
      </div>
    </CardContent>
  </Card>
</div>
```

Rules:
- Always 2 columns at base, 4 columns from `md:`. Never 3-column — it leaves an orphan on mobile.
- Icon: `h-7 w-7` at base, `sm:h-10 sm:w-10` on wider screens. Always `text-muted-foreground opacity-60`.
- Value: `text-base sm:text-2xl font-bold truncate`.
- Label: `text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground`.
- Description: optional third line, `hidden sm:block` — not shown on tablet portrait.
- 4 stats is the maximum. If an entity has more metrics, put extras inside the Overview view instead.

---

## Zone 3: View content

Each `TabsContent` renders one view component. Views are thin wrappers — they receive the entity object and handle their own layout internally.

```vue
<TabsContent value="overview" class="space-y-4">
  <EntityOverviewView :entity="entity" />
</TabsContent>

<TabsContent value="participants" class="space-y-4">
  <EntityParticipantsView :entity="entity" />
</TabsContent>

<TabsContent value="calendar" class="space-y-4">
  <EntityCalendarView :entity="entity" />
</TabsContent>
```

Rules:
- `TabsContent` always gets `class="space-y-4"`.
- The view component receives the **loaded entity object**, never the raw `id` or route param.
- View components own their own loading states for lazy/secondary data they fetch internally. The page-level loading state only blocks the initial entity load.

---

## URL sync for the active view

The active view must be persisted in the URL query string so that:
- Back-navigation restores the last view.
- Users can copy a link to a specific view.

```ts
// In <Entity>DetailsPage.vue
import { useQuerySync } from '@/shared/composables/useQuerySync'

const viewMode = ref<'overview' | 'participants' | 'calendar'>('overview')
useQuerySync({ view: viewMode })
```

The `Tabs` component binds to `viewMode`:

```vue
<Tabs v-model="viewMode" ...>
```

**This is required for every detail page.** `default-value` (uncontrolled Tabs) must not be used on detail pages — it prevents URL sync.

---

## Loading, not-found, and error states

All three states appear at the page level, as siblings to the main content block:

```vue
<template>
  <div class="container py-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

    <!-- Loading -->
    <div v-if="isLoading"
         class="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
      <p class="text-sm text-muted-foreground">{{ $t('common.loading') }}</p>
    </div>

    <!-- Main content -->
    <div v-else-if="entity" class="space-y-6">
      <Tabs v-model="viewMode" ...>
        <!-- zones 1–3 -->
      </Tabs>
    </div>

    <!-- Not found / error -->
    <EmptyState
      v-else
      :title="$t('module.details.notFound')"
      :description="$t('module.details.notFoundDesc')"
      :icon="AlertCircle"
      class="min-h-[400px]"
    >
      <Button variant="outline" class="mt-4" @click="router.back()">
        {{ $t('common.back') }}
      </Button>
    </EmptyState>

  </div>
</template>
```

Rules:
- Loading spinner must use `Loader2` from `lucide-vue-next` — not a raw `border-b-2 animate-spin` div.
- The not-found state uses `EmptyState` with an `AlertCircle` icon and a Back button.
- The Back button in the error state calls `router.back()`, same as the header button.
- The page entry animation (`animate-in fade-in slide-in-from-bottom-4 duration-500`) is on the outermost container only — it fires once on mount regardless of which state is shown.

---

## Composable structure

Each detail page has a dedicated `use<Entity>Details.ts` composable:

```ts
// composables/use<Entity>Details.ts
export function use<Entity>Details(id: string) {
  const entity = ref<EntityType | null>(null)
  const isLoading = ref(true)

  // Derived stats — computed from entity, not fetched separately
  const totalDuration = computed(() => ...)
  const avgDuration = computed(() => ...)

  async function loadDetails() {
    isLoading.value = true
    try {
      entity.value = await entityService.getById(id)
    } catch {
      toast.error(t('module.details.loadError'))
    } finally {
      isLoading.value = false
    }
  }

  return { entity, isLoading, totalDuration, avgDuration, loadDetails }
}
```

Rules:
- All derived/computed values (totals, averages, grouped data) live in the composable, not in the page template.
- The composable never returns `error` as a reactive ref — failures show a toast and leave `entity` as `null`, which triggers the not-found state.
- The composable does not call `loadDetails` itself — the page calls it in `onMounted`. This keeps the composable pure and easy to test.

---

## Quick checklist

```
New detail page?
  ├─ pages/<Entity>DetailsPage.vue
  │     ├─ Tabs v-model="viewMode"
  │     ├─ useQuerySync({ view: viewMode })      ← URL sync, required
  │     ├─ use<Entity>Details composable
  │     ├─ Loading: Loader2 + text, min-h-[400px]
  │     └─ Not-found: EmptyState + Back button
  │
  ├─ Zone 1 header
  │     ├─ ArrowLeft ghost icon → router.back()
  │     ├─ <h1> title + muted subtitle
  │     └─ TabsList: w-full md:w-auto, flex-1/flex-none triggers, hidden md:inline labels
  │
  ├─ Zone 2 stats strip (if entity has 2–4 key metrics)
  │     └─ grid-cols-2 md:grid-cols-4, max 4 stats
  │
  ├─ Zone 3 view content
  │     └─ <TabsContent class="space-y-4"> per view, pass entity object not id
  │
  └─ views/<Entity>*View.vue  — receive entity prop, own their internal layout
```
