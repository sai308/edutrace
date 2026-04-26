# Empty State Guidelines

EduTrace has two distinct scenarios where "no content" is shown. They must never be conflated — each has different visual weight, control visibility rules, and CTA patterns.

---

## The Two Scenarios

| | No data at all | Filtered / search empty |
|---|---|---|
| **When** | The store has zero records for this entity | Records exist, but the active search / filter matches nothing |
| **Component** | `<EmptyState>` (full-page) | `<DataTableEmptyState>` (table row) |
| **Icon** | ✅ Yes | ❌ No |
| **Title** | Entity-level ("No groups yet") | Filter-level ("No groups match your search") |
| **Description** | ✅ Explains how data gets created | ❌ None |
| **CTA button(s)** | ✅ Yes — guide the user to the creation path | ❌ None — user adjusts the filter |
| **Action buttons visible (Add / Import)** | ❌ Hidden | ✅ Visible |
| **Filter / search / sort toolbar** | ❌ Hidden (table not rendered) | ✅ Visible |

---

## Rule 1 — No data at all

Use the full `<EmptyState>` component (or `<DataTableEmptyState>` inside a table when the table is always shown) when `data.length === 0`.

### Control visibility when empty

**Always hide:**
- Zone 1 action buttons ("Add", "Import", "Create…") — guard with `v-if="data.length > 0"` on the button wrapper
- Zone 2 toolbar (search, filter, sort, bulk switch, column picker) — already hidden because the table block is inside `<template v-if="data.length > 0">`

**Always keep:**
- Page title (`h1` / `h2`) — visible regardless of state
- Data-source selectors — a group picker or scope dropdown that controls *which dataset is loaded* stays visible even when the store is empty, because selecting a different source is always a valid action

### CTA placement

When the Zone 1 action buttons are hidden, the `<EmptyState>` body becomes the sole source of CTAs. Use the default slot:

```vue
<EmptyState
  :title="$t('groups.emptyState.title')"
  :description="$t('groups.emptyState.description')"
  :icon="Layers"
  class="min-h-[400px]"
>
  <Button @click="openCreateModal" class="mt-4 gap-2">
    <Plus class="w-4 h-4" />
    {{ $t('groups.add') }}
  </Button>
</EmptyState>
```

When the empty state CTA navigates to another page, always use `router.push({ name: '...' })` — never `<Button as="a" href="...">`, which triggers a full-page reload and breaks SPA navigation.

---

## Rule 2 — Filtered / search empty

When `data.length > 0` but the filtered result is empty, render `<DataTableEmptyState>` as a row inside the table body:

```vue
<!-- Inside <TableBody> -->
<DataTableEmptyState
  v-else
  :colspan="columns.length"
  :title="$t('groups.noMatch')"
  :icon="Layers"
/>
```

Keep **all** controls visible — the user is actively filtering and needs the toolbar to adjust or clear the query. Do not add CTA buttons here; the expected action is changing or clearing the filter.

---

## Rule 3 — No selection yet (scope-selector-dependent pages)

Pages like Summaries and Sessions load data only after the user picks a group. When groups exist but none is selected, show a lightweight placeholder:

```vue
<EmptyState
  :title="$t('summary.selectGroupPrompt')"
  class="min-h-[400px] border-dashed bg-card/50"
/>
```

Rules for this variant:
- **No icon** — the `border-dashed bg-card/50` style already signals "waiting", not "missing"
- **No description** — the group selector in the header communicates the required action
- **No CTA** — the selector is already visible
- The data-source selector (group picker) **must be visible** in the header at the same time

---

## Zone 1 visibility matrix

| UI element | `data.length === 0` | `data.length > 0` |
|---|---|---|
| Page `h1` / `h2` title | ✅ always | ✅ always |
| Data-source selector (group picker) | ✅ always | ✅ always |
| Action buttons (Add / Import / Create) | ❌ hidden | ✅ shown |
| Filter / search / sort toolbar | ❌ hidden (table block not rendered) | ✅ shown |
| Column picker | ❌ hidden | ✅ shown |

---

## Anti-patterns

**❌ Duplicate CTAs** — page header and empty state both rendering "Import" / "Add" at the same time. Fix: guard the header button div with `v-if="data.length > 0"`.

**❌ Redundant empty states** — showing a full `<EmptyState>` (with icon + description) when a visible, interactive selector already communicates the required action. Fix: use the lightweight no-icon `border-dashed` variant for "no selection" states.

**❌ `<Button as="a" href>` for in-app navigation** — always use `router.push({ name: '...' })`. The `as="a"` form bypasses Vue Router and reloads the entire app, losing reactive state and breaking enter animations.

**❌ Full `<EmptyState>` for filtered results** — a full empty state with icon + description implies "there is nothing and you should create something". For filtered-empty, use the inline `<DataTableEmptyState>` row; keep the toolbar visible so the user can clear the filter.
