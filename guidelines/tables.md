# Table Component Guidelines

Canonical rules for implementing TanStack data tables in EduTrace.

## Sub-documents

| Document | What it covers |
|---|---|
| **[table-features.md](table-features.md)** | Filtering, pagination, row selection, column headers, bulk mode (Rules 4-7, 9) |
| **[table-layout.md](table-layout.md)** | Page anatomy, header row patterns, toolbar, mobile responsive layout (Rules 10, 16) |
| **[table-columns.md](table-columns.md)** | Date/time cells, row actions, ordinal `#` column, compact names, locale-aware text sort (Rules 12, 14, 15, 17, 18) |
| **[table-sticky.md](table-sticky.md)** | Sticky header, pinned columns, background tokens, z-index layering (Rules 8, 11, 13) |

---

## Background

All feature modules use TanStack `useVueTable` + `DataTable.vue`:

| Modules |
|---|
| Analytics, Groups, Marks, Members, Reports (list + participants), Sessions, Students, Summary, Tasks, Units |

All new tables must follow the TanStack pattern described below.

---

## Rule 1: Use TanStack for any interactive table

Raw HTML tables are only acceptable for purely static, print-oriented displays with no sorting, filtering, pagination, selection, or responsive column hiding.

The moment any of those features are needed — use TanStack `useVueTable`.

---

## Rule 2: Column definitions live in a sibling `columns.ts` file

Columns are always defined as a factory function that receives `emit` and the i18n `t` function:

```ts
// FeatureList/columns.ts
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { YourType } from '../../types/your-type'

export function createColumns(
  emit: (event: 'edit' | 'delete', payload: YourType) => void,
  t: ComposerTranslation,
  // optional contextual params: formatters, computed color fns, derived lookup fns, etc.
): ColumnDef<YourType>[] {
  return [
    // ... column definitions
  ]
}
```

Rules:
- The standard signature is `createColumns(rowActions, t, ...contextParams)` for tables with row actions; omit `rowActions` if there are none. See Rule 14 for the full row-actions pattern.
- Acceptable extra params: formatter functions, computed color helpers, lookup functions (e.g. `(name) => memberCounts[name]`), static data needed to build dynamic column sets (e.g. date arrays).
- Do **not** pass reactive `Ref` objects or Pinia stores into `columns.ts` — derive values in `DataTable.vue` and pass plain values or plain functions. The one intentional exception is `isCompact: Ref<boolean>` for compact name rendering (Rule 17).
- Row actions (edit, delete, etc.) are driven by the `rowActions: (item: T) => RowActionItem[]` function, not by `emit`. Never pass callbacks through `table.options.meta`.
- `emit` may still appear in `createColumns` for non-menu events (e.g. reorder, selection change) that don't map to menu items.
- Dynamic columns (where the column set depends on loaded data, e.g. Analytics date columns) use `computed(() => createColumns(t, data.value, formatters))`.
- `DataTable.vue` imports `createColumns` directly — columns are **never** passed as a prop.

---

## Rule 3: `DataTable.vue` follows a fixed internal structure

```
FeatureList/
  DataTable.vue    ← owns table state, exposes table ref
  columns.ts       ← column definitions
```

### Script structure

```ts
// DataTable.vue
const props = defineProps<{
  items: YourType[]       // the data array (name it for the domain, not "data")
  searchQuery: string     // free-text search string from the parent page
  // ...any domain-specific filter refs (activeFilters, selectedFormat, etc.)
}>()

const emit = defineEmits<{
  'edit': [item: YourType]
  'delete': [item: YourType]
  // ...
}>()

const { t } = useI18n()
const columns = createColumns(emit, t)

const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const globalFilter = ref('')
// useStorage persists column visibility across page reloads — use a unique key per table
const columnVisibility = useStorage<VisibilityState>('edutrace-<module>-columns', {})
const rowSelection = ref<RowSelectionState>({})

const table = useVueTable({
  get data() { return props.items },
  columns,
  // Required when the table supports bulk selection — see Rule 6 in table-features.md.
  // Without this, TanStack uses row index as the key; after a data reload the wrong
  // rows appear selected. Use the entity's stable unique field.
  getRowId: (row) => row.id,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  // getPaginationRowModel: getPaginationRowModel(),  ← only if paginated
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onGlobalFilterChange: updaterOrValue => valueUpdater(updaterOrValue, globalFilter),
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
  state: {
    get sorting() { return sorting.value },
    get globalFilter() { return globalFilter.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
  },
})

watch(() => props.searchQuery, q => table.setGlobalFilter(q))

defineExpose({ table })
```

### Template structure

```vue
<template>
  <div>
    <slot name="toolbar" :table="table" />

    <!-- Scroll container: owns both x and y overflow (see Rule 13) -->
    <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
      <Table>
        <!-- sticky top-0 anchors to the scroll container above, not the viewport -->
        <!-- use z-30 instead of z-10 when the table has sticky columns (Rule 8) -->
        <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id">
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-10">
                {{ t('common.noData') }}
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <slot name="footer" :table="table" />
  </div>
</template>
```

Key rules:
- The **toolbar** (search bar, filter dropdowns, bulk action buttons, `DataTableViewOptions`) is always a **named slot** — the parent page owns that UI.
- `DataTable.vue` never renders its own search input or action buttons.
- `DataTable.vue` always exposes `table` via `defineExpose` so the parent can read selection state, row count, etc.
- The **footer slot** is where the parent renders pagination controls and/or bulk-action confirmation bars.
- The scroll wrapper div sits between the toolbar/footer slots and `<Table>` — it is the sole scroll container for both axes (see Rule 13 in [table-sticky.md](table-sticky.md)).

---

## Quick decision checklist

```
New table needed?
  ├─ Static, print-only, ≤ 2 columns, no interactivity → raw HTML is acceptable
  └─ Anything else → TanStack DataTable
        ├─ columns.ts         createColumns(emit, t, ...contextParams) factory (Rule 2)
        ├─ DataTable.vue      imports columns, exposes table, toolbar/footer are slots (Rule 3)
        │
        ├─ FEATURES (table-features.md)
        ├─ Filtering          globalFilter OR column filter — never pre-slice props (Rule 4)
        ├─ Pagination         opt-in, pageSize = 30, <DataTablePagination> in footer slot (Rule 5)
        ├─ Selection          checkbox column first, hidden by default (select: false) (Rule 6)
        │                     revealed via bulk-ops Switch in toolbar slot (Rule 9)
        ├─ Sortable columns   DataTableColumnHeader; meta.label on every hideable column (Rule 7)
        ├─ Text column sort   localeCompare sortingFn on every sortable text/name column (Rule 18)
        │
        ├─ LAYOUT (table-layout.md)
        ├─ Page layout        flex-row header always; justify-between + shrink-0 for alignment (Rule 10)
        ├─ Icon-only buttons  gap-2 on button + hidden sm:inline on label text (Rule 10)
        ├─ Scope selectors    hidden sm:inline on label prefix to prevent mobile overflow (Rule 10)
        ├─ Mobile toolbar?    search + bulk + columns → dual sm:hidden / hidden sm:flex sections (Rule 16)
        │                     DataTableViewOptions compact + buttonClass props (Rule 16)
        │
        ├─ COLUMN PATTERNS (table-columns.md)
        ├─ Date cells         useFormatters() passed as formatters param; two patterns (Rule 12)
        ├─ Row actions        getXxxActions(entity) in page → :row-actions prop → ContextMenu + DataTableRowActions (Rule 14)
        ├─ # ordinal col?     Map<id,n> from full A-Z sort; hidden unless group filter active; center-aligned (Rule 15)
        ├─ Compact names?     useCompactName → isCompact Ref → computed columns → first-word surname on mobile (Rule 17)
        │
        └─ STICKY & SCROLL (table-sticky.md)
           ├─ Sticky header      overflow-auto + max-h on wrapper div; no overflow on Table.vue (Rule 13)
           ├─ Wide table?        sticky primary column via :class on TableHead/TableCell (Rule 11)
           ├─ Sticky col bg      bg-card — fully opaque, prevents bleed-through (Rule 8)
           └─ Sticky col z-idx   header z-30 / corner z-40 / body z-20 when sticky cols present (Rule 8)
```
