# Table Column Patterns

Specific column implementations: date/time cells, row actions, ordinal numbers, and compact names.

Part of the [table guidelines](tables.md). See also: [features](table-features.md) · [layout](table-layout.md) · [sticky & scroll](table-sticky.md)

---

## Rule 12: Date and time formatting in cells

All date/time values in table cells must use the shared `useFormatters()` composable. Never call `toLocaleDateString()`, `toLocaleTimeString()`, or `new Date().toLocaleString()` directly inside `columns.ts`.

### Two patterns — pick based on what the field stores

**Date-only field** (e.g. a meeting date stored as `YYYY-MM-DD`):

```ts
import { Calendar } from 'lucide-vue-next'

cell: ({ row }) => h('div', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, [
    h(Calendar, { class: 'w-3 h-3 shrink-0' }),
    h('span', formatters.formatDate(row.getValue('date') as string)),
]),
```

**Datetime field** (e.g. a creation timestamp stored as ISO 8601):

```ts
import { Calendar, Clock } from 'lucide-vue-next'

cell: ({ row }) => {
    const dateRaw = row.getValue('createdAt') as string
    return h('div', { class: 'text-xs text-muted-foreground' }, [
        h('div', { class: 'flex flex-col gap-1' }, [
            h('div', { class: 'flex items-center gap-1' }, [
                h(Calendar, { class: 'w-3 h-3' }),
                h('span', formatters.formatDate(dateRaw)),
            ]),
            h('div', { class: 'flex items-center gap-1 text-[10px] opacity-80' }, [
                h(Clock, { class: 'w-3 h-3' }),
                h('span', formatters.formatTime(dateRaw)),
            ]),
        ]),
    ])
},
```

### Passing formatters into `createColumns`

Call `useFormatters()` in `DataTable.vue` and pass the needed functions via a `formatters` object — never call `useFormatters()` inside `columns.ts` (it requires the Vue composition context):

```ts
// DataTable.vue
const { formatDate, formatTime } = useFormatters()
const columns = createColumns(emit, t, { formatDate, formatTime })

// columns.ts
type Formatters = {
    formatDate: (date: string | Date) => string
    formatTime: (date: string | Date) => string
}
export function createColumns(emit: EmitFn, t: ComposerTranslation, formatters: Formatters): ColumnDef<YourType>[] {
```

### Formatter reference

| Function | Output example | Use for |
|---|---|---|
| `formatDate(str)` | `Apr 10, 2026` | Date-only fields, or the date line of a datetime cell |
| `formatTime(str)` | `01:44 AM` | The time line of a datetime cell |
| `formatDateTime(str)` | `Apr 10, 2026, 01:44 AM` | Single-line combined datetime (rare — prefer the two-line pattern) |

All three functions return `'-'` for null/undefined/empty input.

---

## Rule 14: Unified row actions — ContextMenu + DataTableRowActions

Every table that exposes per-row actions (edit, delete, view, etc.) must use the unified row-action pattern. This gives desktop users right-click access via a `ContextMenu` and gives touch/pointer users a compact three-dot trigger via the `DataTableRowActions` component — both surfaces consume the same action list.

### The `RowActionItem` type

Actions are described with the `RowActionItem` union (from `src/shared/types/table.ts`):

```ts
import type { RowActionItem } from '@/shared/types/table'

// Action item:
{ label: string; icon?: Component; destructive?: boolean; disabled?: boolean; onSelect: () => void }

// Visual separator between groups:
{ type: 'separator' }
```

### Where to define actions

Define a `getXxxActions(entity: T): RowActionItem[]` function in the **parent page**, not inside `columns.ts` or `DataTable.vue`. The function closes over the page's handler methods (edit dialog openers, delete confirmations, etc.) and returns a fresh array each time it is called:

```ts
// UnitsPage.vue (or any feature page)
import { Pencil, Trash2 } from 'lucide-vue-next'
import type { RowActionItem } from '@/shared/types/table'

const getUnitActions = (unit: Unit): RowActionItem[] => [
    {
        label: t('modules.columns.edit'),
        icon: Pencil,
        onSelect: () => handleEditUnit(unit),
    },
    { type: 'separator' },
    {
        label: t('modules.columns.delete'),
        icon: Trash2,
        destructive: true,
        onSelect: () => confirmDeleteUnit(unit),
    },
]
```

Pass the function as a prop:

```vue
<FeatureDataTable :row-actions="getUnitActions" ... />
```

### `DataTableRowActions` — the three-dot trigger

`src/shared/components/DataTableRowActions.vue` renders a compact ghost button (`h-8 w-8`) with a `MoreVertical` icon that opens a `DropdownMenu` on click. Use it as the actions column cell renderer:

```ts
// FeatureList/columns.ts
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'
import type { RowActionItem } from '@/shared/types/table'

export function createColumns(
    rowActions: (item: YourType) => RowActionItem[],
    t: ComposerTranslation,
): ColumnDef<YourType>[] {
    return [
        // ...other columns...
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => h('div', { class: 'text-right' },
                h(DataTableRowActions, { items: rowActions(row.original) }),
            ),
        },
    ]
}
```

> **Note:** The `emit` parameter is removed from `createColumns` when all row actions are defined via `rowActions`. If a module needs both (e.g. emitting a non-menu event like reorder), keep `emit` for that purpose only.

### ContextMenu — right-click surface

In `DataTable.vue`, wrap each `<TableRow>` in a `<ContextMenu>`. The `<ContextMenuContent>` renders the same items from `rowActions(row.original)`:

```vue
<script setup lang="ts">
// DataTable.vue
import {
    ContextMenu, ContextMenuContent, ContextMenuItem,
    ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { RowActionItem } from '@/shared/types/table'

const props = defineProps<{
    items: YourType[]
    searchQuery?: string
    rowActions?: (item: YourType) => RowActionItem[]  // ← new
}>()
</script>

<template>
  <!-- inside <TableBody> -->
  <ContextMenu v-for="(row, index) in table.getRowModel().rows" :key="row.id">
    <ContextMenuTrigger as-child>
      <TableRow ...>
        <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
          <FlexRender ... />
        </TableCell>
      </TableRow>
    </ContextMenuTrigger>
    <ContextMenuContent v-if="rowActions">
      <template v-for="(item, i) in rowActions(row.original)" :key="i">
        <ContextMenuSeparator v-if="item.type === 'separator'" />
        <ContextMenuItem
          v-else
          :disabled="item.disabled"
          :variant="item.destructive ? 'destructive' : 'default'"
          @select="item.onSelect()"
        >
          <component :is="item.icon" v-if="item.icon" />
          {{ item.label }}
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>
</template>
```

### Action item styling conventions

| Property | Rendered as |
|---|---|
| `icon` | Lucide component, auto-sized by the menu (`size-4`). Pass the component reference directly — do **not** set `class` on it. |
| `destructive: true` | `variant="destructive"` on the menu item — `text-destructive` (red) on text and icon, red hover background. Use only for irreversible actions (delete, revoke). Applies identically to both `ContextMenuItem` and `DropdownMenuItem`. |
| `disabled: true` | Grayed out, pointer-events disabled. Use for contextually unavailable actions (e.g. "delete" when a record is in use). |
| `{ type: 'separator' }` | `<DropdownMenuSeparator>` / `<ContextMenuSeparator>` — visual divider between action groups. |

### Ordering convention

Place primary actions first, destructive actions last, separated by a `separator`:

```ts
[
    { label: 'Edit', icon: Pencil, onSelect: ... },
    { label: 'Duplicate', icon: Copy, onSelect: ... },
    { type: 'separator' },
    { label: 'Delete', icon: Trash2, destructive: true, onSelect: ... },
]
```

### Rules

- Define `getXxxActions` in the **parent page**, not in `DataTable.vue` or `columns.ts`.
- Both the `ContextMenu` and `DataTableRowActions` must use the **same** function call — never duplicate the item list.
- `ContextMenuContent` is only rendered when the `rowActions` prop is provided — skip it for tables with no row actions.
- The actions column must have `enableHiding: false` so it never appears in the column-visibility picker.
- Do **not** use `table.options.meta` or `emit` to route row actions — define the handlers inline in the `getXxxActions` closure.
- Right-click anywhere on the row triggers the context menu, even on cells that don't contain the three-dot button.
- **Both surfaces must be visually identical within the same table.** The `ContextMenu` and the `DropdownMenu` triggered by the three-dot button must show the same items in the same order with the same destructive styling. Never add items to one surface that are absent from the other.
- Destructive items must render in red on **both** surfaces. `ContextMenuItem` and `DropdownMenuItem` both support `variant="destructive"`, which sets `text-destructive` on the text and `!text-destructive` on the icon. Do not use manual `class="text-destructive"` overrides — use the `variant` prop.
- The actions column cell wrapper must use `class="flex justify-end"` and the corresponding `<TableHead>` must have `class="w-10"` so the three-dot button is pinned to the right edge consistently across all tables.

---

## Rule 15: The `#` ordinal column

Some student-focused tables include a `#` column that shows each student's alphabetical position in their paper journal — the number written next to their name when the class list is sorted A-Z. This number is not a row counter; it reflects an external, stable ordering that teachers use in physical gradebooks.

### What the value means

Given all students in a group, sort them by full name A-Z (ascending). Each student's position in that sorted list is their ordinal. **The ordinal is group-scoped** — two students from different groups can have the same number. A student with ordinal `3` is the third name alphabetically in their group's paper journal.

### How to compute it

Compute a `Map<studentId, ordinal>` from the **full, unfiltered source list** before passing data into TanStack. Never derive it from TanStack's current row order — sorting, filtering, or pagination must not affect the number.

```ts
// In DataTable.vue — computed alongside table initialisation
const ordinalMap = computed<Map<string, number>>(() => {
  // Only compute when a group filter is active (see § Optimisation below)
  if (!props.groupId) return new Map()

  const sorted = [...props.students].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
  return new Map(sorted.map((s, i) => [s.id, i + 1]))
})
```

Pass the map into `createColumns` as a plain value (not a ref):

```ts
// DataTable.vue
const columns = computed(() =>
  createColumns(emit, t, ordinalMap.value)
)

// columns.ts
export function createColumns(
  emit: EmitFn,
  t: ComposerTranslation,
  ordinalMap: Map<string, number>,
): ColumnDef<StudentType>[] {
  return [
    {
      id: 'ordinal',
      enableSorting: false,
      enableHiding: false,
      header: () => h('div', { class: 'text-center w-full' }, '#'),
      cell: ({ row }) => {
        const n = ordinalMap.get(row.original.id)
        return h('div', { class: 'text-center tabular-nums text-muted-foreground' },
          n != null ? String(n) : '',
        )
      },
    },
    // ...remaining columns
  ]
}
```

### Alignment

Both the column header and every cell value are **center-aligned**. Use `text-center w-full` on the header wrapper and `text-center` on the cell wrapper. `tabular-nums` on cell values keeps multi-digit numbers from shifting as they change.

### Optimisation — only compute and show when a group is selected

The ordinal is meaningful only within a single group's paper journal. When the table shows students from multiple groups (no group filter active) the number would be misleading, and computing it over large cross-group lists is wasteful.

Rules:
- If no group filter is active, pass an empty `Map` and **hide the `ordinal` column entirely** using `table.setColumnVisibility`.
- React to the group prop changing with a `watch({ immediate: true })` that toggles the column:

```ts
watch(
  () => props.groupId,
  (id) => {
    table.setColumnVisibility((prev) => ({ ...prev, ordinal: !!id }))
  },
  { immediate: true },
)
```

- `enableHiding: false` still applies — the column never appears in the view-options dropdown. Visibility is controlled exclusively by the group-filter watch, not by the user.

### Column placement

Place `ordinal` as the **first** data column (after `select` if bulk mode is present, before the sticky student `name` column). It is a narrow, fixed-width column — use `w-10` on the corresponding `<TableHead>`.

### Summary of rules

- Ordinal = 1-based position in A-Z name sort of the **entire group list** (not filtered/visible rows).
- Computed once as a `Map<id, number>`, passed as a plain value to `createColumns`.
- `enableSorting: false` — clicking the header does nothing; the ordinal is not a sort key.
- `enableHiding: false` — not in the column picker; shown/hidden only by the group-filter watch.
- Hidden (empty map + `setColumnVisibility`) when no group filter is active.
- Header and cell values are center-aligned; cells use `tabular-nums`.
- Column id: `'ordinal'`; column position: first data column.

---

## Rule 17: Compact name display on mobile via `useCompactName`

Any table with a **sticky person-name column** (student names, member names, participant names) must apply compact rendering on mobile. On narrow viewports displaying a full multi-part name (e.g. "Іваненко Олексій Петрович") wastes horizontal space — the sticky column takes up too much of the viewport and crowds scrollable data columns. `useCompactName` (at `src/shared/composables/useCompactName.ts`) returns a reactive flag that is `true` when the viewport is below the Tailwind `sm` breakpoint (640 px). Pass it into `createColumns` so the name cell renders only the first word (surname in Ukrainian/Eastern name-order) on small screens.

### Composable

```ts
// src/shared/composables/useCompactName.ts
import { useMediaQuery } from '@vueuse/core'

export function useCompactName() {
    const isCompact = useMediaQuery('(max-width: 639px)')
    return { isCompact }
}
```

### Wiring it up

**`DataTable.vue`** — call the composable, make `columns` a `computed` so TanStack re-evaluates cells when the breakpoint changes:

```ts
import { computed } from 'vue'
import { useCompactName } from '@/shared/composables/useCompactName'

const { isCompact } = useCompactName()

// computed ensures cells re-render when isCompact changes (breakpoint crossing).
// Column IDs remain stable across recomputes so sorting/filtering/selection state
// is preserved.
const columns = computed(() => createColumns(emit, t, formatters, isCompact))

const table = useVueTable({
    get data() { return props.items },
    get columns() { return columns.value },   // ← .value because columns is a computed
    // ...
})
```

**`columns.ts`** — accept `isCompact: Ref<boolean>` and use it in the name cell:

```ts
import type { Ref } from 'vue'

export function createColumns(
    emit: EmitFn,
    t: ComposerTranslation,
    formatters: Formatters,
    isCompact: Ref<boolean>,
): ColumnDef<YourType>[] {
    return [
        // ...
        {
            id: 'student',
            cell: ({ row }) => {
                const name = row.getValue('student') as string
                // Full name always kept in `title` for hover access
                const display = isCompact.value ? (name.split(/\s+/)[0] ?? name) : name
                return h('div', { class: 'font-medium truncate', title: name }, display)
            },
        },
    ]
}
```

### Rules

- `isCompact` IS a `Ref` passed into `columns.ts` — this is the one intentional exception to Rule 2's "no reactive Refs in `columns.ts`". The Ref is read inside the cell render function (called at render time), not at column-creation time, so it is always current.
- Always keep the full name in the `title` attribute of the cell wrapper — tooltip on hover restores full visibility.
- `columns` must be `computed(() => createColumns(..., isCompact))`, and `useVueTable` must use `get columns() { return columns.value }` — not the plain array. This is necessary so TanStack picks up the updated cell functions when the breakpoint changes.
- The `colspan` on `DataTableEmptyState` must reference `columns.value.length`, not `columns.length`.
- Use `name.split(/\s+/)[0] ?? name` — splits on any whitespace, falls back to the full name if there is no space.

---

## Rule 18: Use `localeCompare` for all sortable text columns

TanStack's default string sort uses JavaScript code-point order. This produces wrong results for Cyrillic (Ukrainian) text — names like "Є", "І", "Ш" sort in wrong positions relative to ASCII expectations.

**Every sortable column that contains human-readable text must declare a `sortingFn` using `localeCompare`:**

```ts
{
    accessorKey: 'name',
    sortingFn: (a, b) =>
        (a.getValue('name') as string).localeCompare(b.getValue('name') as string, undefined, {
            sensitivity: 'base',
        }),
    header: ({ column }) => h(DataTableColumnHeader, { column, title: t('...') }),
    cell: ({ row }) => h('div', {}, row.getValue('name')),
},
```

`sensitivity: 'base'` makes the comparison accent- and case-insensitive (А = а = а̀), which matches user expectations for Ukrainian names.

### Applies to

Any column where:
- values are person names, group names, task names, unit names, or other free-text entered by users
- the column has `enableSorting` not explicitly set to `false`

### Does NOT apply to

- Numeric columns (`accessorFn: row => row.count`) — TanStack's default numeric sort is correct.
- Date columns where the accessor returns an ISO string or timestamp — these sort correctly by string/numeric comparison.
- Columns with `enableSorting: false` — they never sort.

### Rule

Never rely on TanStack's built-in `'text'` or `'alphanumeric'` sorters for columns that can contain Cyrillic content. Always supply an explicit `sortingFn` with `localeCompare`.
