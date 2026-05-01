# DESIGN.md — EduTrace UI/UX Principles

This document defines the visual language, interaction patterns, and component conventions for EduTrace. It is the authoritative reference for building consistent UI across all modules. For table-specific rules, see `guidelines/tables.md`.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Layout & Navigation](#2-layout--navigation)
3. [Color & Theming](#3-color--theming)
4. [Typography](#4-typography)
5. [Spacing](#5-spacing)
6. [Component Patterns](#6-component-patterns)
7. [Page Anatomy](#7-page-anatomy)
8. [Forms & Modals](#8-forms--modals)
9. [Feedback & State](#9-feedback--state)
10. [Icons](#10-icons)
11. [Animation & Motion](#11-animation--motion)
12. [Responsive Design](#12-responsive-design)
13. [Cursor & Pointer Feedback](#13-cursor--pointer-feedback)

---

## 1. Core Principles

### Offline-first, no-distraction UI
The app is a tool, not a product. Every screen exists to help a teacher get work done faster. Avoid decorative chrome, excessive whitespace, or marketing-style layouts. Density matters.

### Progressive disclosure
Show only what the user needs at the current step. Secondary actions (edit, delete, copy) are revealed on hover. Destructive actions require confirmation. Bulk operations appear only when rows are selected.

### Predictable structure
Every module follows the same page anatomy. Users should be able to navigate an unfamiliar module because the layout, toolbar position, button order, and empty state placement are always the same.

### Keyboard and focus correctness
All interactive elements must be reachable by keyboard. Focus rings are always visible (`focus-visible:ring-[3px]`). Dialogs trap focus. Tab order follows visual reading order.

### i18n by default
No hardcoded user-visible strings. Every piece of text uses `$t('scope.key')`. Both `en-US.json` and `uk-UA.json` must be updated together. See `src/locales/`.

---

## 2. Layout & Navigation

### Overall structure

```
┌─────────────────────────────────────────────────┐
│  Header (h-16): trigger | breadcrumb | theme    │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│   Sidebar    │   Main content area              │
│  (nav tree)  │   container py-4 space-y-4       │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

- **Root:** `DashboardLayout.vue` — `SidebarProvider` with persistent open state (`localStorage` key `"sidebar"`), full viewport height via `h-svh overflow-hidden`.
- **Sidebar:** `DashboardSidebar.vue` — collapsible to icon-only (`collapsible="icon"`). Auto-closes on mobile after navigation.
- **Header:** `DashboardHeader.vue` — `h-16` with a bottom border tinted by the active workspace color at 30% opacity (`borderBottomColor: ${color}30`). Contains: sidebar trigger → separator → breadcrumbs → theme switcher.
- **Breadcrumbs** are hidden on mobile (`hidden md:block`) and sourced from `route.meta.breadcrumbs`.

### Navigation groups

| Section | Routes |
|---|---|
| Attendance | Analytics, Reports, Settings |
| Organization | Groups, Students, Members, Settings |
| Control | Marks, Modules, Summaries, Tasks, Settings |
| Documents | Sessions, Individual Plans, Settings |

Each section has a section-level Settings route that shares the sidebar group but links to a scoped data management page.

### Workspace color accent

Each workspace can have a custom hex color. When one is set, `DashboardLayout.vue` overrides three CSS custom properties on `:root` inside a `watchEffect`:

```ts
// DashboardLayout.vue — watchEffect
document.documentElement.style.setProperty('--workspace-color', color)
document.documentElement.style.setProperty('--primary', color)
document.documentElement.style.setProperty('--primary-foreground', contrastForeground(color))
document.documentElement.style.setProperty('--sidebar-accent', `color-mix(in srgb, ${color}, transparent 91%)`)
document.documentElement.style.setProperty('--sidebar-accent-foreground', color)
```

`contrastForeground(hex)` computes WCAG relative luminance and returns near-black (`oklch(0.145 0 0)`) for light/bright colors (e.g. amber, yellow) and white (`oklch(1 0 0)`) for dark/saturated colors. This ensures all primary-variant buttons, badges, and focus rings automatically meet contrast requirements regardless of the chosen workspace color.

`--sidebar-accent` drives the active and hover background for all nav items via shadcn's native `data-[active=true]:bg-sidebar-accent` and `hover:bg-sidebar-accent` utilities — no per-component overrides needed.

When the workspace has **no color**, all five `removeProperty` calls revert to the theme defaults.

#### Where workspace color appears

| Location | Implementation |
|---|---|
| **Workspace icon** (sidebar header) | Semi-transparent: `bg: color15`, `border: color40`, `box-shadow: 0 0 10px color20`, icon uses full color. Default workspace falls back to `bg-primary/15 text-primary border-primary/40`. |
| **Sidebar top separator** | 1 px `<div>` with `linear-gradient(transparent → color90 → transparent)` above the workspace switcher. Hidden when no color is set. |
| **Active nav item** | Tinted background via `--sidebar-accent` (shadcn native `data-[active=true]:bg-sidebar-accent`). 2 px left inset shadow + colored SVG icon applied via `:deep` selector in `DashboardSidebar.vue`. Hover state also picks up workspace tint via `hover:bg-sidebar-accent`. |
| **Primary CTAs** | All `bg-primary` / `text-primary` / `border-primary` / `ring-primary` utilities inherit the `--primary` override automatically. |

#### Rules

- Never hardcode workspace hex colors into component styles. The three CSS variable overrides propagate the color everywhere it is needed.
- Never add new one-off `--workspace-color` references to new components. If a new surface should be workspace-tinted, express it using the standard `bg-primary/N`, `text-primary`, or `border-primary` Tailwind utilities — they resolve through `--primary` automatically.
- Sidebar active background flows through `--sidebar-accent` set in `DashboardLayout.vue`. The 2 px left inset shadow and SVG color are applied via `:deep` in `DashboardSidebar.vue`. Do not add per-component active-state overrides in `NavMain.vue` or individual nav items.

---

## 3. Color & Theming

### Color system

Colors use the **OKLCH color space** and are defined as CSS custom properties in `src/style.css`. Always reference semantic tokens — never raw color values.

#### Semantic tokens (light / dark)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | near-white | very dark | page background |
| `--foreground` | dark gray | near-white | primary text |
| `--primary` | warm brown | warm tan | primary actions, active states — **overridden at runtime by workspace color** |
| `--primary-foreground` | white | dark | text/icons on primary bg — **auto-computed for contrast against workspace color** |
| `--secondary` | soft yellow | muted | secondary actions |
| `--muted` | light gray | dark gray | backgrounds for inactive areas |
| `--muted-foreground` | medium gray | light gray | secondary text, placeholders |
| `--destructive` | red | red | delete, error states |
| `--border` | light gray | dark gray | all borders |
| `--ring` | primary | primary | focus rings |
| `--card` | white | dark card | card backgrounds |

#### Chart colors

Five semantic chart tokens: `--chart-1` through `--chart-5`. Use in sequence. Never hardcode hex values in chart configs.

#### Attendance health color coding

This pattern is used in multiple modules (Analytics cards, Summary table, Students table):

| Threshold | Tailwind classes |
|---|---|
| ≥ 75% | `bg-green-500/10 text-green-600 dark:text-green-400` |
| ≥ 50% | `bg-yellow-500/10 text-yellow-600 dark:text-yellow-500` |
| < 50% | `bg-destructive/10 text-destructive` |

### Dark mode

Dark mode is toggled by adding the `.dark` class to `<html>`. Managed by `@vueuse/core` `useColorMode`. CSS uses `@custom-variant dark (&:is(.dark *))`. Mode transitions use the CSS View Transitions API for a smooth animated swap.

---

## 4. Typography

### Scale

| Usage | Classes | Example |
|---|---|---|
| Page title | `text-2xl font-bold tracking-tight` | "Groups", "Marks" |
| Section title | `text-base font-semibold` | Card headers, settings sections |
| Field label | `text-sm font-medium` | Form labels |
| Body / table cell | `text-sm` | Most content |
| Secondary / muted | `text-sm text-muted-foreground` | Descriptions, hints |
| Compact | `text-xs text-muted-foreground` | Badges, timestamps, tooltips |
| Monospaced count | `font-mono tabular-nums text-xs` | File names, IDs, numeric counts |

### Rules

- Page titles use `tracking-tight`. Section titles and below use default tracking.
- Never use `text-lg` for body content. Use it only for modal titles or card stat values.
- Muted text is always `text-muted-foreground`, never `text-gray-*` directly.
- Descriptions under titles use `text-sm text-muted-foreground mt-1`.

---

## 5. Spacing

### Base unit: 4px (Tailwind default)

| Token | px | Common use |
|---|---|---|
| `gap-1` / `p-1` | 4px | Icon gaps, tight inline groups |
| `gap-2` / `p-2` | 8px | Inline elements, badge padding |
| `gap-3` / `p-3` | 12px | List items, compact cards |
| `gap-4` / `p-4` | 16px | Standard section padding |
| `gap-6` / `p-6` | 24px | Card internal sections |
| `space-y-4` | 16px | Between stacked page sections |
| `space-y-6` | 24px | Between major view sections |

### Page container

```html
<div class="container py-4 space-y-4">
```

This is the standard outer wrapper for all page views.

### Grid layouts

Analytics/card grids:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

Two-column form grids (dialogs):
```html
<div class="grid grid-cols-2 gap-2">
```

---

## 6. Component Patterns

### Buttons

Defined in `src/components/ui/button/index.ts` using `class-variance-authority`.

**Variants:** `default` · `destructive` · `outline` · `secondary` · `ghost` · `link`

**Sizes:** `default` (h-9) · `sm` (h-8) · `lg` (h-10) · `icon` (size-9) · `icon-sm` (size-8) · `icon-lg` (size-10)

Rules:
- Primary action in a toolbar or page header: `size="sm"` with `h-9` to match the search input height.
- Icon-only buttons: always use the `icon` size variant — never manually set `w-` and `h-` to match.
- SVGs inside buttons get `size-4` automatically via `[&_svg:not([class*='size-'])]:size-4`. Only override when a non-standard size is intentional.
- Destructive actions: `variant="destructive"`. In confirmation dialogs, the confirm button is destructive.
- Cancel/dismiss actions: `variant="outline"` or `variant="ghost"`.

### Badges

Defined in `src/components/ui/badge/index.ts`.

**Variants:** `default` · `secondary` · `destructive` · `outline`

- Always `rounded-full`. Never use rectangular badges.
- Icon inside badge: `[&>svg]:size-3 gap-1`.
- Small counter badges (e.g. active filter count): `h-5 px-1.5 min-w-[1.25rem] rounded-full font-mono text-xs`.

### Cards

```html
<Card>            <!-- bg-card rounded-xl border shadow-sm py-6 gap-6 -->
  <CardHeader />  <!-- px-6 -->
  <CardContent /> <!-- px-6 -->
  <CardFooter />  <!-- px-6 -->
</Card>
```

- `shadow-sm` always. Use `shadow-md` only on hover states (`hover:shadow-md transition-all`).
- Card gap between sections: `gap-6`.

### Item (list card)

Used for analytics cards and list-style records. More compact than `Card`.

```html
<Item variant="outline" size="sm" class="group relative overflow-hidden transition-all hover:shadow-md">
  <ItemContent>
    <ItemTitle />
    <ItemDescription />
  </ItemContent>
  <ItemActions class="gap-1 shrink-0">
    <!-- icon buttons -->
  </ItemActions>
</Item>
```

`ItemActions` buttons inside a group: `size="icon" class="h-7 w-7 rounded-full"`.

### Inputs

```html
<Input class="h-9 px-3" placeholder="..." />
```

- Standard height: `h-9`. Always matches button `sm` size in toolbars.
- With leading icon: add `pl-9` and absolutely-position the icon at `left-3 top-2.5`.
- Focus ring: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`.

### Checkbox

- Size: `h-4 w-4 rounded`.
- Selected: `bg-primary border-primary text-primary-foreground`.
- Used for row selection in tables and boolean settings.

### Scrollable containers

Use `ScrollArea` from `src/components/ui/scroll-area/` for constrained scroll regions (participant lists, import queues). Apply `.custom-scrollbar` for styled native scrollbars where `ScrollArea` is not used:

```css
/* src/style.css */
.custom-scrollbar: scrollbar-width: thin; scrollbar-color: var(--secondary) transparent
```

---

## 7. Page Anatomy

### File responsibility split

| File | Responsibility |
|---|---|
| `<Module>Page.vue` | Data loading (`onMounted`), event handler wiring, passes props/handlers down |
| `<Module>View.vue` | Rendering: header, toolbar, table/content, empty state, all modals |

The Page layer never renders markup directly (no Tailwind in Pages). The View layer never fetches data.

### Standard view layout

```
<div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

  <!-- 1. Header row — always visible -->
  <div class="flex flex-row items-start sm:items-center justify-between gap-4">
    <div class="min-w-0">
      <h1 class="text-2xl font-bold tracking-tight truncate">{{ $t('module.title') }}</h1>
      <!-- Mobile: mandatory items counter -->
      <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">
        <template v-if="items.length > 0">{{ $t('module.subtitle', { count: filteredCount, total: items.length }) }}</template>
        <template v-else>{{ $t('module.description') }}</template>
      </p>
      <!-- Desktop: static description (optional; no counter — pagination shows it) -->
      <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">{{ $t('module.description') }}</p>
    </div>
    <div v-if="items.length > 0" class="flex items-center gap-2 shrink-0">
      <Button size="sm" class="gap-2" @click="openCreate">
        <Plus class="w-4 h-4" />
        <span class="hidden sm:inline">{{ $t('module.add') }}</span>
      </Button>
    </div>
  </div>

  <!-- 2. DataTable with named slots -->
  <DataTable ref="tableRef" :data="items">
    <template #toolbar>
      <!-- search input, filter button, view options -->
    </template>
    <template #footer>
      <!-- pagination, bulk actions -->
    </template>
  </DataTable>

  <!-- OR: Empty state (mutually exclusive with DataTable) -->
  <EmptyState
    :title="$t('module.emptyState.title')"
    :description="$t('module.emptyState.description')"
    :icon="SomeIcon"
    class="min-h-[400px]"
  >
    <Button @click="openCreate">{{ $t('module.add') }}</Button>
  </EmptyState>

  <!-- 3. Modals — always at the end of the template -->
  <GroupModal ... />
  <ConfirmModal ... />
  <FilterSheet ... />
</div>
```

### Header Row Pattern

The **header row** is the topmost section of every table page view — always visible, never inside a data guard. It contains the page title, a context line below it, and all page-level action controls on the right.

**Rules:**
1. The `<h1>` and both subtitle paragraphs are rendered unconditionally — never inside a `v-if` that checks for data.
2. **Mobile (below `sm:`):** show the items counter under the title (e.g. `"12 of 45 groups"`). When no data exists show the static description instead. Counter is **mandatory** — it replaces pagination context which is not visible on mobile.
3. **Desktop (`sm:` and up):** show the static description under the title. Omit the counter — pagination already shows filtered/total counts.
4. **Buttons are icon-only on mobile.** Wrap the label in `<span class="hidden sm:inline">`. The icon alone must be self-explanatory (`Plus`, `FileUp`, etc.).
5. All page-level controls (Add button, scope selectors, import button) live **inside the header row** — never between the header row and the toolbar.
6. Never add `border-b`, `pb-4`, or `shrink-0` to the header row container. Vertical rhythm comes from the parent `space-y-4`.
7. Action buttons remain guarded with `v-if="data.length > 0"` — only the heading and subtitles are unconditional.
8. Always use `<h1>`, never `<h2>`, for the page-level heading.
9. Standard heading style: `text-2xl font-bold tracking-tight truncate`. Size is fixed across breakpoints — no `sm:text-3xl` overrides.
10. Loading states are exempt — a full-page spinner may temporarily replace the heading.

**Variant A — simple primary action (Add/Import button):**
```html
<!-- Header row -->
<div class="flex flex-row items-start sm:items-center justify-between gap-4">
  <div class="min-w-0">
    <h1 class="text-2xl font-bold tracking-tight truncate">{{ $t('module.title') }}</h1>
    <!-- Mobile: mandatory counter -->
    <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">
      <template v-if="items.length > 0">{{ $t('module.subtitle', { count: filteredCount, total: items.length }) }}</template>
      <template v-else>{{ $t('module.description') }}</template>
    </p>
    <!-- Desktop: description only -->
    <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">{{ $t('module.description') }}</p>
  </div>
  <div v-if="items.length > 0" class="flex items-center gap-2 shrink-0">
    <Button size="sm" class="gap-2" @click="openCreate">
      <Plus class="w-4 h-4" />
      <span class="hidden sm:inline">{{ $t('module.add') }}</span>
    </Button>
  </div>
</div>
```

**Variant B — scope selector required (group/format dropdown):**

Use when the user must choose a data scope before the table is meaningful (e.g. Summary, Plans, Sessions). Controls go full-width on mobile.

```html
<!-- Header row -->
<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">{{ $t('module.title') }}</h1>
    <p class="text-sm text-muted-foreground mt-0.5">{{ $t('module.description') }}</p>
  </div>
  <div class="flex flex-row items-center gap-2 w-full sm:w-auto sm:shrink-0">
    <DropdownMenu>...</DropdownMenu>  <!-- full-width on mobile via flex-1 sm:flex-none -->
  </div>
</div>
```

**i18n convention:** every module must have both a `subtitle` key (interpolates `count`/`total`; shown on mobile when data exists) and a `description` key (static sentence; shown on desktop always, on mobile only when no data).

### Toolbar anatomy

The `#toolbar` slot always follows this left-to-right order:

```
[ Search input (flex-1) ]  [ Filter button ]  [ View options ]  [ Import ]  [ Export ]
```

- Search input: `relative flex-1` with `<Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />` and `pl-9` on the input.
- Filter button shows a badge with active filter count when filters are applied.
- All toolbar buttons use `size="sm"` (h-8) or `class="h-9"` to align with the search input.

### Page entry animation

Wrap the root `<div>` of every View in:

```html
<div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
```

Apply once at the top level. Do not nest this animation inside sub-components.

### Loading state

Shown inside the View while data is being fetched:

```html
<div class="flex flex-col items-center justify-center min-h-[400px] gap-3">
  <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
  <p class="text-sm text-muted-foreground">{{ $t('common.loading') }}</p>
</div>
```

### Detail pages and calendar views

Entity detail pages (e.g. Analytics group detail, Report detail) use a multi-tab layout with a header zone, stats strip, and URL-synced view switcher. Full rules are in **`guidelines/detail-pages.md`**.

Calendar views inside detail pages follow one of two variants (multi-session or single-session) and always use the `useCalendar` composable. Full rules are in **`guidelines/calendar-views.md`**.

---

## 8. Forms & Modals

> Full rules for dialog surfaces, sizing, stack depth, scrollable dialogs, the Profile dialog pattern, and migration of hand-rolled overlays are in **`guidelines/dialogs.md`**. This section covers the structural conventions that apply inside any overlay.

### Dialog (centered modal)

```html
<Dialog :open="isOpen" @update:open="handleOpenChange">
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>

    <div class="grid gap-4 py-4">
      <!-- form fields -->
    </div>

    <DialogFooter>
      <Button variant="outline" @click="handleOpenChange(false)">Cancel</Button>
      <Button @click="handleSave">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Standard max-widths: `sm:max-w-sm` · `sm:max-w-[425px]` · `sm:max-w-lg` · `sm:max-w-xl`

### Sheet (side drawer)

Used for filters and settings that need more space without blocking the underlying content.

```html
<Sheet :open="isOpen" @update:open="...">
  <SheetContent class="max-w-[380px]">
    <SheetHeader>
      <SheetTitle>...</SheetTitle>
      <SheetDescription>...</SheetDescription>
    </SheetHeader>

    <div class="grid gap-6 p-4">
      <!-- filter controls -->
    </div>

    <SheetFooter class="flex justify-between flex-row gap-2">
      <Button variant="ghost" @click="reset">Reset</Button>
      <div class="flex gap-2">
        <Button variant="outline" @click="close">Cancel</Button>
        <Button @click="apply">Apply</Button>
      </div>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

Filter sheet footer button order: **Reset** (ghost, left) · **Cancel** (outline) · **Apply** (primary).

### Confirm modal

Used for all destructive actions (delete, erase, bulk delete). Never skip the confirmation step for destructive operations.

```html
<ConfirmModal
  :open="showConfirm"
  :title="$t('module.deleteModal.title')"
  :message="$t('module.deleteModal.message')"
  variant="destructive"
  @confirm="handleDelete"
  @cancel="showConfirm = false"
/>
```

The confirm button is always `variant="destructive"`. The cancel button is `variant="outline"`.

### Nested dialogs

**Never place a `<Dialog>` (or a component that wraps one) inside another `<DialogContent>`.**

Reka UI manages focus traps via Vue `provide`/`inject`. A nested Dialog inherits the outer dialog's focus trap context, causing the outer trap to reclaim focus on every blur — leading to blinking and unexpected close, especially on mobile.

Correct pattern: sibling dialogs at the template root (Vue 3 fragments support multiple root nodes):

```html
<template>
  <Dialog :open="primaryOpen" ...>
    <DialogContent>
      <!-- no Dialog components here -->
    </DialogContent>
  </Dialog>

  <!-- secondary dialog as sibling, not child -->
  <GroupModal :is-open="secondaryOpen" ... />
</template>
```

Both dialogs teleport independently to `<body>` via `DialogPortal` and maintain separate focus traps.

### Form field layout

```html
<div class="grid gap-4 py-4">
  <div class="grid gap-2">
    <Label for="fieldId">{{ $t('...') }} <span class="text-destructive ml-1">*</span></Label>
    <Input id="fieldId" v-model="form.field" />
    <p class="text-xs text-muted-foreground">Hint text</p>  <!-- optional -->
  </div>
</div>
```

- Required field indicator: `<span class="text-destructive ml-1">*</span>` inline after the label.
- Autocomplete dropdowns: absolute-positioned, `z-50`, `top-[calc(100%+4px)]`, with `animate-in fade-in-0 zoom-in-95`.
- Blur delay for autocomplete: 200ms `setTimeout` to let click events on suggestion items fire before the input blur hides the list.

### Modal footer button order

Across all dialogs and sheets, the order is always:

```
[Destructive/Skip — left aligned]  ···  [Cancel] [Confirm]
```

- Confirm is always on the far right.
- If there is a third option (e.g. Skip in the group creation modal during import), it is `variant="ghost"` and floats left via `mr-auto`.

---

## 9. Feedback & State

### Toast notifications

All feedback toasts go through `src/shared/services/toast.ts`:

```ts
toast.success(t('key'))          // green — operation succeeded
toast.error(t('key'))            // red   — operation failed
toast.info(t('key'))             // blue  — neutral information
toast.warning(t('key'))          // yellow — user attention needed
```

Default auto-dismiss: 3000ms. Pass a second argument to override: `toast.success(msg, 5000)`.

**When to toast:**

| Situation | Type |
|---|---|
| Record created / saved | `success` |
| Record deleted | `success` |
| Import completed with saves | `success` |
| Import skipped (duplicate / no match) | `info` |
| All files skipped due to mode | `info` — include reason and remedy hint |
| Async operation failed | `error` |
| Non-blocking warning (e.g. partial import) | `warning` |

Never show a toast for a user-initiated cancel or close. Only toast when the app takes an action.

### Loading states

| Context | Pattern |
|---|---|
| Full page / view loading | Centered `Loader2 w-8 h-8 animate-spin` + muted text, `min-h-[400px]` |
| Button in progress | `disabled` prop + spinner icon replacing the action icon |
| Table row processing | `Loader2 w-4 h-4 animate-spin` inline in the status cell |
| File queue item | `Loader2 w-4 h-4 animate-spin text-primary` next to filename |

### Empty states

All empty states use `src/shared/components/EmptyState.vue`:

```html
<EmptyState
  :title="$t('module.emptyState.title')"
  :description="$t('module.emptyState.description')"
  :icon="IconComponent"
  class="min-h-[400px]"
>
  <Button @click="openCreate" class="mt-4 gap-2">
    <Plus class="w-4 h-4" /> {{ $t('module.add') }}
  </Button>
</EmptyState>
```

- Always include a primary CTA that resolves the empty state.
- The description should explain how the data gets here (import, manual entry, automatic).
- The table's in-cell empty state uses `DataTableEmptyState` (wrapped `EmptyState` with `border-none py-6`).

### Status icons (file queue / import)

| Status | Icon | Color |
|---|---|---|
| pending | `Clock` | `text-muted-foreground` |
| processing | `Loader2 animate-spin` | `text-primary` |
| done | `CheckCircle2` | `text-green-500` |
| error | `XCircle` | `text-destructive` |
| skipped | `MinusCircle` | `text-muted-foreground` |

Row background uses the same semantic mapping with low-opacity variants (`bg-primary/5`, `bg-green-500/5`, `bg-destructive/5`, `bg-muted/20`).

---

## 10. Icons

**Library:** `lucide-vue-next`. Import individually — never import the entire library.

```ts
import { Plus, Trash2, Loader2 } from 'lucide-vue-next'
```

### Size conventions

| Context | Class | px |
|---|---|---|
| Inline in text, badges | `w-3 h-3` | 12 |
| Standard button / list / table | `w-4 h-4` | 16 |
| Prominent actions, section headers | `w-5 h-5` | 20 |
| Page-level empty state illustration | `w-12 h-12` or `w-16 h-16` | 48–64 |
| Loading spinner | `w-8 h-8` | 32 |

Buttons use `[&_svg:not([class*='size-'])]:size-4` automatically. Only set an explicit size class when you need to override this default.

### Color conventions

- Default: inherit from parent text color.
- Secondary/hint: `text-muted-foreground`.
- Active/action: `text-primary`.
- Hover reveal: `opacity-0 group-hover:opacity-100 transition-opacity` — only for action icons inside `Item` list cards, not table rows (see below).
- Never color icons with raw Tailwind color classes (`text-blue-500`). Use semantic tokens.

---

## 11. Animation & Motion

### Entry animations

| Context | Classes |
|---|---|
| Page / view mount | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| Dialog open | `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95` |
| Dialog close | `data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95` |
| Sheet open (right) | `data-[state=open]:slide-in-from-right duration-500` |
| Sheet close (right) | `data-[state=closed]:slide-out-to-right duration-300` |
| Dropdown/popover | `animate-in fade-in-0 zoom-in-95` |
| Sort icon swap | `animate-in zoom-in-50 duration-300` |

### Transitions

- Color/background changes: `transition-colors duration-200`.
- Combined properties: `transition-all duration-200`.
- Hover shadow elevation: `hover:shadow-md transition-all` on cards/items.
- Dark mode swap: CSS View Transitions API (managed automatically, no manual classes needed).

### Motion rules

- Apply page entry animation **once** at the top-level View wrapper, not inside nested components.
- Loading spinners use `animate-spin` only. Never apply `animate-spin` to decorative icons.
- Scroll indicators use `animate-bounce` sparingly (e.g. scrollable card footer hint).
- Prefer `duration-200` for micro-interactions, `duration-300–500` for panel/modal enter/exit.

---

## 12. Responsive Design

### Target platforms

EduTrace targets two form factors. Phone-sized screens are **out of scope** — the app must not visually break on them, but pixel-perfect polish at those widths is not required.

| Platform | Device | Orientation | CSS viewport¹ | Primary Tailwind range |
|---|---|---|---|---|
| **Tablet portrait** | Samsung Galaxy Tab S10+ | Portrait | ≈ 876 × 1240 px | `md` |
| **Tablet landscape** | Samsung Galaxy Tab S10+ | Landscape | ≈ 1400 × 876 px | `xl` |
| **Desktop** | FullHD monitor | Landscape | 1920 × 1080 px | `xl`, `2xl` |
| **Desktop** | 2K / QHD monitor | Landscape | 2560 × 1440 px | `xl`, `2xl` |

> ¹ Samsung Tab S10+ physical resolution is 2800 × 1752 px at DPR ≈ 2.0, giving CSS pixel dimensions of ~1400 × 876. Portrait and landscape swap the axes.

---

### Breakpoint map

Tailwind v4 defaults — unchanged from v3:

| Prefix | Min-width | Design role |
|---|---|---|
| *(base)* | 0 px | Minimum viable — not polished, not broken |
| `sm:` | 640 px | Fine-grained label trimming within toolbar elements |
| `md:` | 768 px | **Tablet portrait** — layout reorganises into two-column+ mode |
| `lg:` | 1024 px | Transition zone — 3-column grids, wider sheets; no dedicated device here |
| `xl:` | 1280 px | **Desktop and tablet landscape** — full expanded layout |
| `2xl:` | 1536 px | Wide desktop (2K) — content-width cap, not additional features |

**Authoring rule:** build `md:` first (tablet portrait), then `xl:` (desktop/landscape). Add `sm:` only for small touch-ups (hiding a label, tightening a gap). Use `lg:` for grid intermediate steps and nothing else. Use `2xl:` only to cap `max-w-` on containers.

---

### Element-by-element rules

#### Sidebar

| Breakpoint | Behaviour |
|---|---|
| base–`md` | Hidden; toggle button in header reveals it as an overlay |
| `md:` (tablet portrait) | Collapsed to icon-only rail (`collapsible="icon"`) |
| `xl:` (desktop) | Fully expanded with text labels |

The sidebar state persists in `localStorage` (`key: "sidebar"`). On tablet portrait the default is icon-only; on desktop the default is expanded.

#### Page container padding

```html
<!-- Standard outer wrapper for all page views -->
<div class="container py-4 md:py-6 px-4 md:px-8 space-y-4">
```

Use `p-4` at base, `md:p-8` on tablet portrait and above.

#### Page header row (title + actions)

Stays horizontal at all widths (Variant A). The subtitle line switches content between mobile and desktop:

```html
<div class="flex flex-row items-start sm:items-center justify-between gap-4">
  <div class="min-w-0">
    <h1 class="text-2xl font-bold tracking-tight truncate">{{ $t('module.title') }}</h1>
    <!-- sm: hidden — counter visible only on mobile -->
    <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">{{ counter }}</p>
    <!-- hidden sm:block — description visible only on desktop -->
    <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">{{ $t('module.description') }}</p>
  </div>
  <div v-if="items.length > 0" class="flex items-center gap-2 shrink-0">
    <!-- Icon always visible; label hidden on mobile -->
    <Button size="sm" class="gap-2">
      <Plus class="w-4 h-4" />
      <span class="hidden sm:inline">{{ $t('module.add') }}</span>
    </Button>
  </div>
</div>
```

#### Toolbar row (inside `#toolbar` slot)

At `md:` and above the toolbar stays horizontal. Below `md:` it wraps:

```html
<div class="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
```

Button text labels use `sm:` to hide on the narrowest widths and reappear once there is room:

```html
<Button size="sm">
  <Plus class="w-4 h-4" />
  <span class="hidden sm:inline ml-2">{{ $t('module.create') }}</span>
</Button>
```

#### Card / stat grids

Always use all four steps so the layout grows gracefully from tablet to wide desktop:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

Two-column form grids inside dialogs are always fixed (`grid-cols-2`) — they are never used at base width because dialogs are full-width minus margin at that size.

#### Data tables

| Breakpoint | Behaviour |
|---|---|
| base–`md` | `overflow-x-auto` wrapper; primary column is sticky left; column text may be `text-xs` |
| `md:` (tablet portrait) | Same scrollable behaviour; sticky column widens (`sm:w-[240px]`) |
| `xl:` (desktop) | Horizontal scroll is rare; full column widths; no sticky needed unless data is genuinely wide |

See `guidelines/tables.md` Rule 11 for sticky column implementation details.

The column-width pattern for the primary (name) column:

```html
<TableHead :class="header.id === 'name' ? 'w-[140px] md:w-[200px] xl:w-[240px]' : ''">
```

#### Dialogs

The `DialogContent` base class already handles full-width-minus-margin at base and a fixed max-width from `sm:`:

```
base: w-[calc(100%-2rem)]    (full bleed with 1rem margin each side)
sm:   sm:max-w-[425px]       (or sm:max-w-lg / sm:max-w-xl depending on content)
```

Never add extra width classes to `DialogContent` — rely on the standard max-width variants.

#### Sheets (side drawers)

Fixed width regardless of breakpoint:

```html
<SheetContent class="w-full max-w-[380px]">
```

Sheets do **not** go full-screen on tablet. The overlay is sufficient context.

#### Breadcrumbs

Hidden at base — the page title in the header is enough context on small screens:

```html
<div class="hidden md:block">
  <Breadcrumb />
</div>
```

---

### 2K / wide-desktop (2xl) considerations

At 2560 px CSS the default Tailwind `container` class caps content at `1536px` via `max-w-screen-2xl`. This is sufficient — do not set a wider container. Individual page content should not stretch beyond this cap.

For stat dashboards with 4-column grids, `xl:grid-cols-4` is already the maximum. Do not add a `2xl:grid-cols-5` step — a four-column grid at 2K is comfortably readable and avoids cards becoming too narrow.

---

### Touch target sizing

All interactive elements use `h-8` (32 px) minimum and `h-9` (36 px) standard. At the Tab S10+'s DPR of 2.0 these render as 64 px / 72 px physical pixels — well above the 44 px physical minimum for touch targets.

---

### Rules summary

| Rule | Correct | Wrong |
|---|---|---|
| Build breakpoints from tablet up | `md:flex-row xl:grid-cols-4` | `sm:flex-row lg:grid-cols-4` |
| Use `sm:` only for label trimming | `hidden sm:inline` on button text | `sm:` to change layout structure |
| Use `lg:` only for grid intermediate step | `lg:grid-cols-3` | `lg:flex-row` layout changes |
| Cap wide-desktop content | `container` + `2xl:max-w-screen-2xl` | Uncapped full-bleed at 2560 px |
| Sticky column on wide tables | `:class` on `<TableHead>/<TableCell>` | `position: sticky` on a wrapper div |
| Touch heights | `h-8` min, `h-9` standard | `h-6` or `h-7` interactive elements |

---

## 13. Cursor & Pointer Feedback

The cursor is a direct signal to the user about whether an element is interactive. Incorrect cursors erode trust and slow down task completion — a user who moves their pointer over an element expects the cursor to confirm whether clicking will do something.

### Rules

| Element type | Cursor | Tailwind class |
|---|---|---|
| Button, link, clickable icon | pointer | `cursor-pointer` |
| Checkbox, radio, switch, toggle | pointer | `cursor-pointer` (usually inherited from Reka UI) |
| Custom clickable `<div>` / `<span>` / `<Badge>` | pointer | `cursor-pointer` — **must be explicit** |
| Drag handle | grab / grabbing | `cursor-grab active:cursor-grabbing` |
| Static text, labels, non-clickable display | default | no class needed (browser default) |
| Disabled button or control | not-allowed | `cursor-not-allowed` (usually inherited via `disabled:` variant) |
| Readonly input | default | `cursor-default` |
| Text input / textarea | text | no class needed (browser default) |

### Key points

**Interactive elements must have `cursor-pointer`.**
Any element that responds to a click — regardless of whether it is a native `<button>`, a Reka UI component, or a plain `<div>` — must carry `cursor-pointer`. Users scan pages by moving their cursor; the pointer shape is the first affordance signal, before color or label.

**Non-interactive elements must not have `cursor-pointer`.**
A static badge, a decorative icon, a read-only stat card, a label — none of these should ever show a pointer. Adding pointer to non-actionable elements creates false affordance and frustrates users who click expecting something to happen.

**Disabled controls use `cursor-not-allowed`.**
A not-allowed cursor tells the user the action is unavailable right now, not that the element is broken. Reka UI's `<Button>` applies `disabled:pointer-events-none` by default — override this with `disabled:pointer-events-auto disabled:cursor-not-allowed` when you need the disabled cursor to remain visible (e.g. a button disabled pending form validation where the user needs the visual hint).

**Custom clickable elements require explicit `cursor-pointer`.**
Reka UI primitives (`Button`, `Checkbox`, `Switch`, `DropdownMenuItem`, etc.) already include `cursor-pointer` in their base styles. Custom elements do not — always add it manually:

```vue
<!-- ✓ Correct: Badge used as a filter chip -->
<Badge class="cursor-pointer" @click="filterByGroup(name)">{{ name }}</Badge>

<!-- ✗ Wrong: no pointer, user cannot tell it is clickable -->
<Badge @click="filterByGroup(name)">{{ name }}</Badge>

<!-- ✓ Correct: always-visible icon action in a table row -->
<Button variant="ghost" size="icon" class="cursor-pointer h-8 w-8" @click="handleDelete">
  <Trash2 class="w-4 h-4" />
</Button>
```

**Table row actions are always visible.**
Do not use `opacity-0 group-hover:opacity-100` to hide action buttons in table rows. Hidden-on-hover actions are not discoverable on touch devices (no hover state) and cause layout shifts on mobile. Keep row action buttons permanently visible with a muted default color (`text-muted-foreground`) and a semantic hover color (`hover:text-destructive`, `hover:text-primary`).

The hover-reveal pattern (`opacity-0 group-hover:opacity-100`) is only appropriate inside `Item` list cards — compact card components where the action density is low and the card layout is fixed. It must not be used in data tables.

**`pointer-events-none` on decorative overlays.**
Tooltips, loading overlays, and badge counters that float over other elements must carry `pointer-events-none` to let clicks pass through to the element underneath.

---

## Appendix: Quick Reference

### Do / Don't

| Do | Don't |
|---|---|
| Use semantic color tokens (`text-muted-foreground`) | Use raw Tailwind colors (`text-gray-500`) |
| Place `<GroupModal>` as a sibling of `<Dialog>` | Nest one `<Dialog>` inside another `<DialogContent>` |
| Show a toast when the app takes an action | Toast on user-initiated cancel |
| Use `size="sm"` buttons in toolbars | Mix `size="default"` and `size="sm"` in the same toolbar |
| Apply page entry animation once at View root | Apply it inside multiple nested components |
| Set explicit icon size only when overriding default | Manually set `w-4 h-4` on every button icon |
| Use `EmptyState` with a CTA for zero-data screens | Show a blank or "No data" plain text fallback |
| Keep destructive confirm in `variant="destructive"` | Use the default button style for destructive confirms |
| Always update both locale files | Add keys to only one locale file |
| Add `cursor-pointer` to custom clickable `<div>`/`<Badge>`/`<span>` | Rely on browser default for non-`<button>` interactive elements |
| Use `cursor-not-allowed` on disabled controls | Remove pointer events entirely when a visual disabled hint is still useful |
| Use `pointer-events-none` on decorative overlays and tooltip content | Let tooltips or badge counters accidentally capture clicks |
