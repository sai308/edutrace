# Table Features

Filtering, pagination, column headers, row selection, and bulk operations for TanStack tables.

Part of the [table guidelines](tables.md). See also: [layout](table-layout.md) · [column patterns](table-columns.md) · [sticky & scroll](table-sticky.md)

---

## Rule 4: Filtering — two modes, chosen upfront

| Mode | When to use | Implementation |
|---|---|---|
| **Global text filter** | Free-text search across multiple string fields | `getFilteredRowModel()` + `globalFilter` state + `watch(searchQuery, q => table.setGlobalFilter(q))` |
| **Column filter** | Typed filter on a specific field (date range, enum, boolean) | `getFilteredRowModel()` + `column.setFilterValue(...)` called from the toolbar slot |

**Never** pre-slice the data array with a computed property before passing it to `useVueTable`. This breaks TanStack's internal row count, pagination, and selection models.

---

## Rule 5: Pagination is opt-in, default page size is 30

### Wiring pagination in `DataTable.vue`

```ts
// Enable pagination:
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })

useVueTable({
  // ...
  getPaginationRowModel: getPaginationRowModel(),
  onPaginationChange: updaterOrValue => valueUpdater(updaterOrValue, pagination),
  state: {
    // ...
    get pagination() { return pagination.value },
  },
})
```

If pagination is not needed, omit `getPaginationRowModel` entirely — do not set `pageSize` on the table.

### Rendering pagination controls — use `DataTablePagination`

Pagination controls are rendered in the **footer slot** by the parent page using the shared `DataTablePagination` component. Never put pagination controls directly inside `DataTable.vue`.

```vue
<!-- In the parent page/view — inside the DataTable usage -->
<FeatureDataTable :items="items" ...>
  <template #footer="{ table }">
    <DataTablePagination :table="table" />
  </template>
</FeatureDataTable>
```

`DataTablePagination` is a generic component at `src/shared/components/DataTablePagination.vue`. It accepts a single `table: Table<TData>` prop and renders:

- **Left**: `"Showing X–Y of Z"` row range using `common.pagination.showing` i18n key
- **Right**: `[← Previous]  Page X of Y  [Next →]` using `common.pagination.previous`, `common.pagination.pageOf`, and `common.pagination.next` i18n keys

**Anti-pattern** — do not manually compose pagination buttons in the footer slot:

```vue
<!-- ❌ Do not do this -->
<template #footer="{ table }">
  <Button :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">Previous</Button>
  <Button :disabled="!table.getCanNextPage()" @click="table.nextPage()">Next</Button>
</template>

<!-- ✓ Do this instead -->
<template #footer="{ table }">
  <DataTablePagination :table="table" />
</template>
```

Rules:
- Always import `DataTablePagination` from `@/shared/components/DataTablePagination.vue`.
- Pagination controls belong in the footer slot of the parent page, never hardcoded inside `DataTable.vue`.
- Do not pass page size as a prop — the default of 30 rows per page applies to all tables unless there is a strong, documented reason to override it.

---

## Rule 6: Row selection uses a standard checkbox column

The select column is always the **first** column in `columns.ts` and is **hidden by default** (see Rule 9 for how it is enabled).

> **Always configure `getRowId`** when the table supports bulk selection or deletion. Without it, TanStack defaults to row *index* as the row ID. After a bulk delete reloads the data, rows at the same indices inherit the stale selection state — causing phantom checkmarks on rows the user never picked. Use the entity's stable unique field:
>
> ```ts
> useVueTable({
>   getRowId: (row) => row.id,            // string id: use directly
>   getRowId: (row) => String(row.id),    // number/optional id: coerce to string
>   getRowId: (row) => String(row.id ?? row.name), // optional id with name fallback
> })
> ```
>
> After a successful bulk delete, call `table.resetRowSelection()` (or set `bulkMode = false`) to clear the internal `rowSelection` ref immediately, rather than waiting for the data reload to make stale entries irrelevant.

```ts
{
  id: 'select',
  enableSorting: false,
  enableHiding: false,  // excluded from view-options dropdown; toggled only by the bulk-ops switch
  header: ({ table }) =>
    h(Checkbox, {
      modelValue: table.getIsAllPageRowsSelected()
        || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      ariaLabel: t('common.selectAll'),
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      modelValue: row.getIsSelected(),
      disabled: !row.getCanSelect(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      ariaLabel: t('common.selectRow'),
    }),
},
```

> **Reka UI prop names** — The project's `Checkbox` component wraps Reka UI's `CheckboxRoot`, which uses `modelValue` (not `checked`) and emits `update:modelValue` (not `update:checked`). Always use `modelValue` / `'onUpdate:modelValue'`. The value type is `boolean | 'indeterminate'`; coerce to `boolean` with `!!value` before passing to TanStack methods.

Bulk action UI (delete selected, export selected, etc.) lives in the **toolbar slot**, reading `table.getSelectedRowModel()` passed down from `DataTable`. See Rule 9 for the full bulk-ops pattern.

---

## Rule 7: Use `DataTableColumnHeader` for every sortable column; set `meta.label` on every hideable column

```ts
// In columns.ts — sortable column:
{
  accessorKey: 'name',
  meta: { label: t('members.name') },  // ← required for the column picker to show a translated name
  header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.name') }),
}

// Non-sortable column:
{
  accessorKey: 'email',
  meta: { label: t('members.email') },
  header: () => h('span', t('members.email')),
}
```

**Sorting:** Never render sort icons or toggle logic manually. If a column is sortable → `DataTableColumnHeader`. If not → plain `h('span', ...)`.

**Column picker labels:** `DataTableViewOptions` displays each column's name as `column.columnDef.meta?.label ?? column.id`. Without `meta.label`, the picker falls back to the raw accessor key or id (e.g. `uploadedAt`, `groupName`). Set `meta.label` on every column that can be hidden — i.e. every column except `select` and `actions` (which have `enableHiding: false`).

The label value must be a plain translated string (call `t(...)` at column-creation time). Do not pass a reactive ref or a getter — `meta` is static.

---

## Rule 9: Checkbox column is hidden by default; the bulk-ops switch reveals it

Showing the checkbox column by default wastes horizontal space on every page load and clutters the layout for users who never need bulk operations. The column is toggled on demand via a `Switch` in the toolbar.

### In `DataTable.vue`

Accept a `bulkMode` prop and watch it to drive column visibility and selection clearing:

```ts
const props = defineProps<{
  items: YourType[]
  searchQuery?: string
  bulkMode?: boolean   // ← new
}>()

// Include select: false in the storage default so a fresh install starts hidden.
// This alone is not sufficient — localStorage may have a stale true value from a
// previous session, so the watch below enforces the correct state on every mount.
const columnVisibility = useStorage<VisibilityState>('edutrace-<module>-columns', {
  select: false,
  // other optional-visibility columns...
})

// React to bulk mode changes from the parent.
// IMPORTANT: use table.setColumnVisibility, NOT table.getColumn('select')?.toggleVisibility.
// The select column has enableHiding: false, which causes toggleVisibility to silently
// do nothing (TanStack checks getCanHide() before acting). setColumnVisibility writes
// directly to the visibility state and bypasses that guard.
// immediate: true ensures the column is hidden on first render even if localStorage
// previously stored select: true from a prior session where bulk was left on.
watch(() => props.bulkMode, (enabled) => {
  table.setColumnVisibility((prev) => ({ ...prev, select: !!enabled }))
  if (!enabled) table.toggleAllRowsSelected(false)
}, { immediate: true })
```

### In the parent page (toolbar slot)

Place the `Switch` immediately after the search input. Bulk action buttons appear inline when rows are selected:

```vue
<template #toolbar="{ table }">
  <div class="flex items-center gap-3 flex-1 min-w-0">
    <!-- Search -->
    <div class="relative max-w-xs flex-1">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input v-model="searchQuery" :placeholder="$t('module.searchPlaceholder')" class="pl-8 h-9" />
    </div>

    <!-- Bulk-ops switch -->
    <div class="flex items-center gap-2 shrink-0">
      <Switch :model-value="bulkMode" @update:model-value="bulkMode = $event" />
      <span class="text-sm text-muted-foreground hidden sm:inline select-none">
        {{ $t('common.bulk') }}
      </span>
    </div>

    <!-- Bulk action buttons — only when mode is on and rows are selected -->
    <Button
      v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
      variant="destructive" size="sm"
      class="h-8 gap-2 shrink-0"
      @click="confirmBulkDelete(table.getFilteredSelectedRowModel().rows.map((r) => r.original.id))"
    >
      <Trash2 class="h-3.5 w-3.5" />
      <span class="hidden sm:inline">{{ $t('common.delete') }}</span>
      <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
        {{ table.getFilteredSelectedRowModel().rows.length }}
      </Badge>
    </Button>
  </div>
</template>
```

Rules:
- `enableHiding: false` on the `select` column keeps it out of the view-options dropdown. The only way to reveal it is via the bulk switch.
- Never use `toggleVisibility` to show/hide the `select` column — `enableHiding: false` makes it a silent no-op. Always use `table.setColumnVisibility((prev) => ({ ...prev, select: !!enabled }))`.
- The watch must use `{ immediate: true }` so the column is hidden on the first render. Without it, a stale `select: true` value in localStorage will leave checkboxes visible before the user ever touches the switch.
- When `bulkMode` is turned off, selection is cleared immediately inside `DataTable.vue` — the parent does not need to handle cleanup.
- The `Switch` label text uses the `common.bulk` i18n key (add to both locale files).
- Use `table.getFilteredSelectedRowModel()` (not `getSelectedRowModel()`) in the toolbar slot to count and collect selected rows. `getFilteredSelectedRowModel` respects active column/global filters, so rows hidden by a search or filter are never counted or acted upon.
- The bulk delete button renders a `<Badge>` with the selection count rather than embedding the count in the label text — this keeps the button width stable as the count changes.
- Modules that have no bulk use case may omit the `select` column and the `bulkMode` prop entirely.
