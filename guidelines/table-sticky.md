# Table Sticky & Scroll

Sticky column header, horizontally-pinned columns, background tokens, and z-index layering.

Part of the [table guidelines](tables.md). See also: [features](table-features.md) · [layout](table-layout.md) · [column patterns](table-columns.md)

---

## Rule 8: Sticky column classes go on `<TableHead>` / `<TableCell>` in the template

`position: sticky` must be applied to the actual `<th>` / `<td>` DOM elements. Those elements are the `<TableHead>` and `<TableCell>` components rendered by the `v-for` loops in `DataTable.vue`. The column definition's `header:` / `cell:` render functions only produce the *inner content*, so sticky classes belong in the template via conditional `:class` bindings, keyed by `header.id` / `cell.column.id`:

```vue
<!-- In DataTable.vue template — header row -->
<TableHead
  v-for="header in headerGroup.headers"
  :key="header.id"
  :class="[
    header.id === 'name'
      ? 'sticky left-0 z-40 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
      : '',
  ]"
>
  <FlexRender ... />
</TableHead>

<!-- In DataTable.vue template — body row -->
<TableCell
  v-for="cell in row.getVisibleCells()"
  :key="cell.id"
  :class="[
    cell.column.id === 'name'
      ? 'sticky left-0 z-20 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
      : '',
  ]"
>
  <FlexRender ... />
</TableCell>
```

### Sticky column background

Sticky cells must use **`bg-card`** — a fully opaque background that prevents scrolled-under rows from bleeding through. Do not use `bg-background/95` (semi-transparent, causes bleed) or `bg-muted/50 backdrop-blur` (also semi-transparent). The right-border shadow provides the visual pinning indicator without any transparency.

- **Left-pinned column** (name, student): `bg-card`
- **Right-pinned column** (totals, percentage): `bg-card`
- The `<TableHeader>` element itself also uses `bg-card` — both the row and its sticky cell share the same token.

### Z-index layering when sticky columns and sticky header coexist

When a table has **both** a horizontally-pinned column (sticky body cells at `z-20`) **and** a sticky header row, the header must be raised above the body sticky cells:

| Element | z-index | Reason |
|---|---|---|
| `<TableHeader>` | `z-30` | Above sticky body cells (`z-20`) during vertical scroll |
| Sticky `<TableHead>` (corner) | `z-40` | Corner where both axes meet — must be above everything |
| Sticky `<TableCell>` (body) | `z-20` | Above regular cells during horizontal scroll |

Use `z-10` on `<TableHeader>` **only** when the table has no horizontally-pinned columns. If sticky columns are present, always use `z-30`:

```vue
<!-- Table with sticky column — header must be z-30 -->
<TableHeader class="sticky top-0 z-30 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">

<!-- Table without sticky column — z-10 is fine -->
<TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
```

Right-pinned columns mirror the left-pin pattern with `sticky right-0` and a left-facing shadow (`shadow-[-1px_0_0_0_...]`).

---

## Rule 11: Sticky primary column for wide tables

Tables with more than four data columns will overflow the viewport on tablet screens (< `lg`, ≈ 1024 px). These tables must support horizontal scroll with the primary column (typically "name") pinned to the left so users always have row context while scrolling.

### When to apply

Apply if the table has **5 or more visible data columns** on a typical load, or if any column has a `min-w-*` wider than `100px`.

### Implementation

**1. Make the table wrapper scrollable**

```vue
<div class="rounded-md border overflow-x-auto">
  <Table class="min-w-[640px]">  <!-- or a wider min-w matching total column widths -->
    ...
  </Table>
</div>
```

**2. Pin the primary column in the template** (see Rule 8 for why classes go here, not in `columns.ts`):

```vue
<!-- Header -->
<TableHead
  :class="header.id === 'name'
    ? 'sticky left-0 z-40 w-[180px] sm:w-[240px] bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
    : ''"
>

<!-- Body -->
<TableCell
  :class="cell.column.id === 'name'
    ? 'sticky left-0 z-20 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] font-medium'
    : ''"
>
```

**3. Give secondary columns a comfortable min-width** so they don't collapse into unreadable widths on scroll:

```vue
<TableHead
  :class="!['select', 'name', 'actions'].includes(header.id) ? 'min-w-[100px]' : ''"
>
```

### Z-index layering

| Element | z-index | Reason |
|---|---|---|
| `<TableHeader>` row | `z-30` | Must be above sticky body cells (`z-20`) during vertical scroll |
| Sticky `<TableHead>` (corner cell) | `z-40` | Where horizontal and vertical sticky axes meet — above everything |
| Sticky `<TableCell>` (body) | `z-20` | Above normal body cells during horizontal scroll |
| Normal body cells | default | Standard stacking |

Rules:
- Pin at most **two** columns: one on the left (name/title), one on the right (total/percentage) when a summary column exists.
- The pinned column background must use `bg-card` — a transparent or semi-transparent background will let scrolled content bleed through (see Rule 8).
- The `<TableHeader>` must use `z-30` (not `z-10`) whenever sticky columns are present. See Rule 8 for the full z-index explanation.
- The shadow on the left pin faces right (`shadow-[1px_0_0_0_...]`); the shadow on a right pin faces left (`shadow-[-1px_0_0_0_...]`).
- Do **not** apply sticky columns to simple 3–4 column tables that already fit comfortably on tablet without scrolling.

---

## Rule 13: Sticky column header

The column header row must remain visible while scrolling through rows. Implement it as a bounded scroll container wrapping `<Table>`, with `sticky top-0` on `<TableHeader>`.

### Implementation

**1. Wrap `<Table>` in a scroll container div** (not the `<Table>` component itself):

```vue
<div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
  <Table>
    <!-- Use z-30 when the table has sticky columns (body cells at z-20); z-10 otherwise -->
    <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
      ...
    </TableHeader>
    <TableBody>...</TableBody>
  </Table>
</div>
```

**2. Keep `Table.vue`'s internal container free of overflow** (`src/components/ui/table/Table.vue`):

```html
<!-- Table.vue — no overflow classes on the container div -->
<div data-slot="table-container" class="relative w-full">
  <table ...><slot /></table>
</div>
```

### Why overflow must live on the outer wrapper only

`position: sticky` anchors to the **nearest scrollable ancestor** — an element with any `overflow` value other than `visible`. If `Table.vue`'s inner container has any `overflow` set (including `overflow-x: auto`), it becomes the sticky anchor even without a height constraint. Since it has no `max-h`, it never scrolls, so the sticky element never sticks.

There are **no partial workarounds**:
- `overflow-x: auto` — CSS forces `overflow-y: auto` too when the other axis is `visible`, creating a y-scroll context
- `overflow-y: clip` — clips the sticky element as it tries to move out of the normal-flow position

The only correct approach is to have **zero overflow on `Table.vue`'s container** so nothing stands between `<TableHeader sticky>` and the outer wrapper. That wrapper (`overflow-auto max-h-[...]`) then handles both horizontal and vertical scrolling.

### Sticky header styles

| Class | Purpose |
|---|---|
| `sticky top-0` | Pins the header to the top of the scroll container |
| `z-10` | Sits above all normal body rows (use `z-30` when sticky columns are present — see Rule 8) |
| `bg-card` | Opaque background — prevents body rows from bleeding through |
| `shadow-[0_1px_0_0_hsl(var(--border))]` | Replaces the bottom border that disappears when the header detaches from the body |

### `max-h` offset reference

`max-h-[calc(100svh-20rem)]` leaves `~320px` for surrounding layout (app header, page title, toolbar, pagination, spacing). Adjust the rem offset per page if the surrounding chrome is significantly taller or shorter.
