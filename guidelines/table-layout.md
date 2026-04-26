# Table Page Layout

Standard page anatomy, Zone 1 header patterns, toolbar structure, and the mobile dual-section layout.

Part of the [table guidelines](tables.md). See also: [features](table-features.md) · [column patterns](table-columns.md) · [sticky & scroll](table-sticky.md)

---

## Rule 10: Standard page layout for table pages

Every page that contains a data table follows a consistent two-zone layout above the table.

```
┌──────────────────────────────────────────────────────────┐
│ Zone 1 — Header                                          │
│  left:  Page title   Short muted description             │
│  right: [Import ↑]  [+ Create]                          │
├──────────────────────────────────────────────────────────┤
│ Zone 2 — Toolbar  (in the #toolbar slot)                 │
│  left:  [Search ________]  [Bulk ◌]  [Delete N]         │
│  right: [Filter ▼]  [Columns ▼]                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                         Table                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Template skeleton

```vue
<template>
  <div class="space-y-4">

    <!-- Zone 1: Page header -->
    <!-- flex-col on mobile so title stacks above buttons; flex-row from sm onward -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">{{ $t('module.title') }}</h2>
        <!-- description is optional — omit if the title is self-explanatory -->
        <p class="text-sm text-muted-foreground mt-0.5">{{ $t('module.description') }}</p>
      </div>
      <!-- ml-auto wrapper pushes buttons to the right regardless of whether they
           share a row with scope selectors or wrap onto their own row on mobile -->
      <div class="ml-auto flex items-center gap-2">
        <!-- Import only for modules that support CSV import -->
        <Button variant="outline" size="sm" class="gap-2" @click="handleImport">
          <Upload class="w-4 h-4" />
          <span class="hidden sm:inline">{{ $t('common.import') }}</span>
        </Button>
        <!-- Primary create action — always rightmost, always default variant -->
        <Button size="sm" class="gap-2" @click="handleCreate">
          <Plus class="w-4 h-4" />
          <span class="hidden sm:inline">{{ $t('module.create') }}</span>
        </Button>
      </div>
    </div>

    <!-- Zone 2 + Table: DataTable owns the toolbar slot -->
    <FeatureDataTable
      :items="items"
      :search-query="searchQuery"
      :bulk-mode="bulkMode"
      @edit="handleEdit"
      @delete="handleDelete"
    >
      <template #toolbar="{ table }">
        <div class="flex items-center justify-between gap-3">

          <!-- Left group: search → bulk switch → bulk actions -->
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="relative max-w-xs flex-1">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input v-model="searchQuery" :placeholder="$t('module.searchPlaceholder')"
                     class="pl-8 h-9" />
            </div>
            <Switch :model-value="bulkMode" @update:model-value="bulkMode = $event" />
            <span class="text-sm text-muted-foreground hidden sm:inline select-none">
              {{ $t('common.bulk') }}
            </span>
            <Button v-if="bulkMode && table.getSelectedRowModel().rows.length > 0"
                    variant="destructive" size="sm" @click="handleBulkDelete(table)">
              <Trash2 class="w-4 h-4 mr-1.5" />
              {{ $t('common.deleteN', { n: table.getSelectedRowModel().rows.length }) }}
            </Button>
          </div>

          <!-- Right group: domain filters → DataTableViewOptions in toolbar slot -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- optional domain-specific filter dropdowns (status, date range, etc.) -->
            <DataTableViewOptions :table="table" />
          </div>

        </div>
      </template>
    </FeatureDataTable>

  </div>
</template>
```

### Zone 1 rules

- The page description (`<p class="text-sm text-muted-foreground">`) is optional; omit it where the title alone is clear.
- The Import button is only rendered for modules that support CSV import (currently Students, Marks). Do not add a placeholder import button to other modules.
- The Create button is always the rightmost header action and always uses the default (primary) variant.
- Domain filter dropdowns belong in the **right group** of the toolbar, between bulk actions and `DataTableViewOptions`.
- `DataTableViewOptions` is rendered in the **`#toolbar` slot** of the parent page — **not** hardcoded inside `DataTable.vue`.
- Use `space-y-4` as the root spacing class for consistent vertical rhythm between the header and the table.

### Zone 1 action button alignment on mobile

Action buttons must be right-aligned on both mobile and desktop. The technique depends on the Zone 1 right-side structure:

**Pattern A — buttons inside a `flex-wrap` container (alongside scope selectors):**

Wrap the buttons in `<div class="ml-auto flex items-center gap-2">`. `ml-auto` consumes all leftover flex space on its line, pushing the buttons to the right regardless of whether they share a row with selectors or wrap onto their own row:

```vue
<div class="flex flex-wrap items-center gap-2 shrink-0">
  <!-- scope selectors (Group, Grade Scale, etc.) -->
  <DropdownMenu>...</DropdownMenu>
  <!-- action buttons — always pushed to the row end -->
  <div class="ml-auto flex items-center gap-2">
    <Button ...><Upload class="w-4 h-4" /><span class="hidden sm:inline">Import</span></Button>
    <Button ...><Plus class="w-4 h-4" /><span class="hidden sm:inline">Add</span></Button>
  </div>
</div>
```

**Pattern B — single button as the sole right-side child of `flex-col sm:flex-row`:**

Add `self-end sm:self-auto` to the button or its wrapper. In a `flex-col` parent the cross axis is horizontal, so `self-end` right-aligns the item. `sm:self-auto` resets it on desktop where `justify-between` handles placement:

```vue
<!-- single-button case: no flex-wrap container needed -->
<Button size="sm" class="gap-2 shrink-0 self-end sm:self-auto" @click="handleCreate">
  <Plus class="w-4 h-4" />
  <span class="hidden sm:inline">{{ $t('module.create') }}</span>
</Button>
```

### Icon-only action buttons on mobile

Action buttons in Zone 1 must be icon-only on mobile and show their label from `sm` onward. Use `gap-2` on the button and `<span class="hidden sm:inline">` on the label — **never** `mr-2` on the icon:

```vue
<!-- ✅ Correct -->
<Button size="sm" class="gap-2" @click="...">
  <Plus class="w-4 h-4" />
  <span class="hidden sm:inline">{{ $t('module.create') }}</span>
</Button>

<!-- ❌ Wrong — mr-2 leaves a phantom gap when the label is hidden -->
<Button size="sm" @click="...">
  <Plus class="w-4 h-4 mr-2" />{{ $t('module.create') }}
</Button>
```

### Scope selector label hiding on mobile

Pages that include scope-selector buttons in Zone 1 (e.g. "Group: КН-33 ▾", "Grade Scale: Default ▾") must hide the label prefix on mobile. The prefix span gets `hidden sm:inline` so only the selected value and chevron are visible on narrow viewports. This prevents the selector row from overflowing when action buttons are also present:

```vue
<Button variant="outline" size="sm" class="h-9 gap-1">
  <!-- prefix hidden on mobile — only the value shown -->
  <span class="hidden sm:inline text-xs text-muted-foreground mr-1">{{ $t('module.groupLabel') }}:</span>
  <span class="font-medium max-w-[100px] truncate">{{ selectedGroup || $t('module.allGroups') }}</span>
  <ChevronDown class="h-3 w-3 opacity-50" />
</Button>
```

On mobile the button renders as `"КН-33 ▾"`; on desktop as `"Group: КН-33 ▾"`.

---

## Rule 16: Mobile toolbar layout — dual-section responsive pattern

On narrow viewports the single-row desktop toolbar doesn't fit. For pages that include a **bulk-ops switch** and a **column visibility picker** alongside the search input, split the toolbar into two explicit sections: one for mobile (`sm:hidden`) and one for desktop (`hidden sm:flex`). Do **not** try to make one layout work for both breakpoints with margin tricks.

### When to apply

Apply this pattern whenever the toolbar contains all three of:
1. A free-text search input
2. A bulk-ops switch (+ optional bulk delete button)
3. A `DataTableViewOptions` column picker

A toolbar with only search + columns (no bulk) does not need the two-section split — a single `flex` row with `flex-1` on the search input is sufficient.

### Layout anatomy

**Mobile (< `sm`, i.e. `< 640px`)** — two stacked rows:

```
Row 1:  [Search __________________________________]   ← full width
Row 2:  [Bulk ◌]  or  [Delete N]  |  [Columns N]    ← grid-cols-2
```

- Row 1: full-width search input (`w-full`).
- Row 2: a `grid grid-cols-2 gap-2` container giving 50 % to the left (bulk toggle or bulk delete) and 50 % to the right (columns picker).
- When bulk mode is on **and** rows are selected, the left cell shows the destructive delete button (`w-full`) instead of the switch + label pair.
- `DataTableViewOptions` receives `button-class="w-full"` so its trigger button fills the right cell.
- `DataTableViewOptions` also receives `:compact="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"` to hide the "Columns" label text (preserving space for the count badge) when the delete button is already competing for width.

**Desktop (≥ `sm`)** — single row, left-aligned:

```
[Search _____________]  [Bulk ◌]  [Delete N]  ···  [Columns N]
```

- Standard single-row layout with `hidden sm:flex items-center justify-between gap-3`.
- Search has `max-w-xs` constraint (no `w-full`).
- `DataTableViewOptions` receives no extra classes (default button width).

### Template skeleton

```vue
<template #toolbar="{ table }">

    <!-- ── Mobile (< sm): 2-row layout ── -->
    <div class="flex flex-col gap-2 sm:hidden">
        <!-- Row 1: full-width search -->
        <div class="relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input v-model="searchQuery" :placeholder="$t('module.searchPlaceholder')" class="pl-8 h-9 w-full" />
        </div>
        <!-- Row 2: bulk (left 50%) | columns (right 50%) -->
        <div class="grid grid-cols-2 gap-2">
            <!-- Left: compact delete when rows are selected, otherwise bulk toggle -->
            <Button
                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                variant="destructive" size="sm" class="h-9 gap-2 w-full"
                @click="confirmBulkDelete(table.getFilteredSelectedRowModel().rows.map((r) => r.original.id))"
            >
                <Trash2 class="h-4 w-4 shrink-0" />
                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                    {{ table.getFilteredSelectedRowModel().rows.length }}
                </Badge>
            </Button>
            <div v-else class="flex items-center gap-2 h-9">
                <Switch :model-value="bulkMode" class="cursor-pointer" @update:model-value="bulkMode = $event" />
                <span class="text-sm text-muted-foreground select-none">{{ $t('common.bulk') }}</span>
            </div>
            <!-- Right: columns picker, compact when rows are selected -->
            <DataTableViewOptions
                :table="table"
                :compact="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                button-class="w-full"
            />
        </div>
    </div>

    <!-- ── Desktop (≥ sm): single-row layout ── -->
    <div class="hidden sm:flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="relative max-w-xs flex-1">
                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('module.searchPlaceholder')" class="pl-8 h-9" />
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <Switch :model-value="bulkMode" class="cursor-pointer" @update:model-value="bulkMode = $event" />
                <span class="text-sm text-muted-foreground select-none">{{ $t('common.bulk') }}</span>
            </div>
            <Button
                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                variant="destructive" size="sm" class="h-8 gap-2 shrink-0"
                @click="confirmBulkDelete(table.getFilteredSelectedRowModel().rows.map((r) => r.original.id))"
            >
                <Trash2 class="h-3.5 w-3.5" />
                <span>{{ $t('common.delete') }}</span>
                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                    {{ table.getFilteredSelectedRowModel().rows.length }}
                </Badge>
            </Button>
        </div>
        <DataTableViewOptions :table="table" class="shrink-0" />
    </div>

</template>
```

### `DataTableViewOptions` responsive props

`DataTableViewOptions` (`src/shared/components/DataTableViewOptions.vue`) accepts two optional props for responsive contexts:

| Prop | Type | Purpose |
|---|---|---|
| `compact` | `boolean` | Hides the "Columns" label text; shows only the icon and count badge. Use when the button must fit inside a narrow cell (e.g. the right column of a `grid-cols-2` row). |
| `buttonClass` | `string` | Extra classes on the trigger button. Pass `"w-full"` to stretch the button to fill its grid cell on mobile. |

Rules:
- Pass `button-class="w-full"` only in the mobile section — never on the desktop usage, where the button should be auto-width inside a flex row.
- `:compact` should mirror the same condition used to show the destructive delete button (i.e. `bulkMode && selectedCount > 0`), so the label disappears exactly when it would overlap the delete action.
- Do **not** add `w-full` as a default inside `DataTableViewOptions.vue` itself — it would break every other table that uses the picker inside a flex row.
