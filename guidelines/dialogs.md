# Dialog & Modal Guidelines

This document defines rules for all overlay surfaces in EduTrace: centered dialogs, side sheets, and confirmation alerts.

Current implementations to reference: `GradeManualInputDialog.vue` (canonical simple dialog), `MemberDialog.vue` (canonical form dialog), `SummarySettingsSheet.vue` (canonical sheet), `StudentProfileModal.vue` (profile dialog — special case, see §7).

---

## 1. Surface types

| Surface | Component | Use case | Can close on Esc / overlay click? |
|---|---|---|---|
| **Dialog** | `<Dialog>` from Reka UI | Focused tasks: forms, detail views, info | Yes |
| **AlertDialog** | `<AlertDialog>` from Reka UI | Destructive confirmations only | **No** — intentional |
| **Sheet** | `<Sheet>` from Reka UI | Filters, settings that need more room without fully blocking the page | Yes |

**Never build overlay surfaces from scratch** using `v-if` + `fixed inset-0 z-[60]`. The existing `ConfirmModal.vue` and `QrCodeModal.vue` pre-date this guideline and use that pattern — they are migration targets. All new overlays must use the Reka primitives above. See §8 for the migration plan.

---

## 2. Dialog sizing

`DialogContent` defaults to `sm:max-w-lg`. Override with one of the standard widths:

| Variant | Class | When to use |
|---|---|---|
| Compact | `sm:max-w-sm` | One confirmation sentence + 1–2 buttons |
| Default | `sm:max-w-[425px]` | Standard form, 3–5 fields |
| Medium | `sm:max-w-lg` | Larger form, code display, import queue |
| Wide | `sm:max-w-xl` | Multi-section form, side-by-side fields |
| Full | `sm:max-w-2xl` | Wizard steps, detailed record display |
| Profile | `sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden` | Rich profile or detail views with internal tab switcher |

At base width (tablet portrait and below) every size collapses to `w-[calc(100%-2rem)]` — handled by the `DialogContent` base class. **Do not add mobile-specific width classes.**

---

## 3. Anatomy

Every dialog follows this structure exactly:

```vue
<Dialog :open="open" @update:open="emit('update:open', $event)">
  <DialogContent class="sm:max-w-[425px]">

    <DialogHeader>
      <DialogTitle>{{ $t('module.dialog.title') }}</DialogTitle>
      <DialogDescription>{{ $t('module.dialog.description') }}</DialogDescription>
    </DialogHeader>

    <!-- Body: form fields, content -->
    <div class="space-y-4 py-2">
      ...
    </div>

    <DialogFooter>
      <Button variant="outline" @click="emit('update:open', false)">
        {{ $t('common.cancel') }}
      </Button>
      <Button :disabled="!isValid" @click="handleConfirm">
        {{ $t('common.save') }}
      </Button>
    </DialogFooter>

  </DialogContent>
</Dialog>
```

Rules:
- `DialogTitle` contains **only the title text** — no icons, no buttons, no form elements.
- `DialogDescription` is always visible and i18n'd. If no meaningful description exists, use `class="sr-only"` with an i18n key (never a hardcoded English string like `"Profile details"`).
- `DialogFooter` button order: **Cancel (outline) → Confirm (default or destructive)**, confirm on the far right. If there is a third option (e.g. Skip), use `variant="ghost"` with `class="w-full sm:w-auto sm:mr-auto"` — this floats it left on desktop and stretches it full-width on mobile (matching the other stacked buttons). Do not use bare `mr-auto` without `sm:` prefix: it has no effect in the column layout `DialogFooter` uses on mobile.
- The built-in close button (×) is rendered by `DialogContent` automatically. Do not add a second close button manually.

---

## 4. Props API

Use the `v-model`-compatible `open` / `@update:open` pattern — not `isOpen` / `@close`:

```ts
// ✓ Correct — v-model compatible
interface Props {
  open: boolean
}
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', ...): void
}>()

// Usage in parent:
<EntityDialog v-model:open="showDialog" @confirm="handleConfirm" />
```

```ts
// ✗ Avoid — imperative, not composable
interface Props {
  isOpen: boolean
}
const emit = defineEmits<{ (e: 'close'): void }>()
```

The `v-model:open` pattern lets the parent use a simple `ref<boolean>` and the dialog manages its own close button and Esc key through Reka without any extra wiring.

When a dialog also needs to expose a `computed` v-model bridge (e.g. because it receives `open` and needs to emit on Reka's internal open-change), use:

```ts
const dialogOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})
// <Dialog v-model:open="dialogOpen">
```

---

## 5. Stack depth and sibling rule

**Maximum stack depth: 2** — a main dialog and one child confirmation.

```
Level 1: <MemberDialog>         ← main task dialog
Level 2: <AlertDialog>          ← "Discard unsaved changes?" confirmation
Level 3: ✗ never                ← redesign the UX if you reach this
```

**Nesting `<Dialog>` inside `<DialogContent>` is forbidden.** Reka manages focus traps via `provide`/`inject`; nesting causes the outer trap to steal focus on every blur event. Use siblings instead:

```vue
<template>
  <!-- ✓ Siblings at fragment root -->
  <MemberDialog v-model:open="showMember" @save="handleSave" />
  <ConfirmDialog v-model:open="showConfirm" @confirm="handleConfirm" />
</template>
```

Both dialogs teleport independently to `<body>` via `DialogPortal` and maintain separate focus traps.

---

## 6. `AlertDialog` — destructive confirmations and blocking decision points

`AlertDialog` differs from `Dialog` in one critical way: it **cannot be dismissed** by pressing Esc or clicking the overlay. This forces the user to make an explicit choice.

Use `AlertDialog` for:
- **Destructive actions** — delete, erase, bulk-remove. The action button gets the destructive style.
- **Blocking decision points in multi-step flows** — when a process is paused and the user must choose one of N paths before it can continue (e.g. "Unknown group found — Create it or Skip it?"). These are not destructive, but dismissal by Esc would leave the process in an indeterminate state.

Do **not** use `AlertDialog` for simple confirmations that have safe defaults or can be re-triggered (e.g. "Are you sure you want to leave?") — use a regular `Dialog` for those.

```vue
<!-- Destructive — action button styled as destructive -->
<AlertDialog :open="open" @update:open="emit('update:open', $event)">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{{ $t('module.deleteModal.title') }}</AlertDialogTitle>
      <AlertDialogDescription>{{ $t('module.deleteModal.message') }}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
      <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {{ $t('common.delete') }}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

<!-- Blocking decision — action button uses default style -->
<AlertDialog :open="open" @update:open="open = $event">
  <AlertDialogContent class="sm:max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle>{{ $t('module.confirmTitle', { name }) }}</AlertDialogTitle>
      <AlertDialogDescription>{{ $t('module.confirmDescription') }}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel @click="handleSkip">{{ $t('common.skip') }}</AlertDialogCancel>
      <AlertDialogAction @click="handleProceed">{{ $t('common.proceed') }}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

`AlertDialogCancel` and `AlertDialogAction` are distinct primitives that automatically wire the correct ARIA role (`alertdialog`) and button semantics. Do not use regular `<Button>` inside an `AlertDialog`.

---

## 7. Tall / scrollable dialogs

When body content can exceed the viewport (participant lists, import queues, profile views), use `flex flex-col` layout with `ScrollArea` on the body:

```vue
<DialogContent class="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">

  <!-- Fixed header — stays visible while body scrolls -->
  <DialogHeader class="px-6 pt-6 pb-4 border-b shrink-0">
    <DialogTitle>...</DialogTitle>
    <DialogDescription>...</DialogDescription>
  </DialogHeader>

  <!-- Scrollable body -->
  <ScrollArea class="flex-1 min-h-0">
    <div class="px-6 py-4 space-y-4">
      ...content...
    </div>
  </ScrollArea>

  <!-- Fixed footer -->
  <DialogFooter class="px-6 py-4 border-t shrink-0">
    <Button variant="outline" @click="emit('update:open', false)">{{ $t('common.cancel') }}</Button>
    <Button @click="handleSave">{{ $t('common.save') }}</Button>
  </DialogFooter>

</DialogContent>
```

Key classes:
- `DialogContent`: `max-h-[85vh] flex flex-col p-0 gap-0` — remove default padding and gap so header/footer can have independent borders
- `DialogHeader` / `DialogFooter`: own `px-6 py-4` padding + `border-b` / `border-t` + `shrink-0`
- `ScrollArea`: `flex-1 min-h-0` — takes remaining space and allows flex children to shrink below their intrinsic height

---

## 8. Sheet (side drawer)

Use `Sheet` when:
- The content is supplementary to the page (filters, settings) and the user benefits from seeing the underlying data while the panel is open.
- The content has many fields and a centered modal would feel cramped.

```vue
<Sheet :open="open" @update:open="emit('update:open', $event)">
  <SheetContent class="w-full max-w-[380px] flex flex-col p-0 gap-0">

    <SheetHeader class="px-6 pt-6 pb-4 border-b shrink-0">
      <SheetTitle>{{ $t('module.settings.title') }}</SheetTitle>
      <SheetDescription>{{ $t('module.settings.description') }}</SheetDescription>
    </SheetHeader>

    <ScrollArea class="flex-1 min-h-0">
      <div class="px-6 py-4 space-y-6">
        ...filter controls...
      </div>
    </ScrollArea>

    <SheetFooter class="px-6 py-4 border-t shrink-0 flex-row justify-between gap-2">
      <Button variant="ghost" @click="handleReset">{{ $t('common.reset') }}</Button>
      <div class="flex gap-2">
        <Button variant="outline" @click="emit('update:open', false)">{{ $t('common.cancel') }}</Button>
        <Button @click="handleApply">{{ $t('common.apply') }}</Button>
      </div>
    </SheetFooter>

  </SheetContent>
</Sheet>
```

Sheet footer button order: **Reset (ghost, left) · Cancel (outline) · Apply (primary)**.

Sheet width is always fixed at `max-w-[380px]` — it does not go full-screen on tablet.

---

## 9. Form dialogs

For dialogs whose primary purpose is editing a record:

```ts
// Reset form when dialog opens with a new item
watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

function resetForm() {
  formData.value = props.item
    ? { name: props.item.name, ... }   // populate from existing record
    : { name: '', ... }                // blank for create
}

function handleSave() {
  if (!validate()) return
  emit('confirm', { ...formData.value })
  emit('update:open', false)
}
```

Rules:
- Reset happens when `open` becomes `true` — not on every prop change.
- The dialog closes itself after a successful save (calls `emit('update:open', false)` inside `handleSave`). The parent does not need to close it.
- `Enter` key submits the form: bind `@keydown.enter="handleSave"` on the primary input or the form element.
- The confirm button is `disabled` until the form is valid. Derive validity from a `computed` flag — do not disable based on loading state alone.
- Field errors appear below the field as `<p class="text-xs text-destructive mt-1">`.

---

## 10. Profile dialog — special case

A **Profile dialog** is a wide, multi-view dialog that presents rich read/edit information about a single entity. It combines the sizing of §2 (full `sm:max-w-4xl`), the internal tabs pattern from `detail-pages.md`, and the scrollable structure from §7.

### Canonical structure

```vue
<Dialog v-model:open="dialogOpen">
  <DialogContent class="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">

    <!-- Fixed header zone -->
    <div class="px-6 pt-6 pb-4 border-b shrink-0 space-y-4">

      <!-- Identity row -->
      <div class="flex items-start justify-between gap-4 pr-8">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary/10 rounded-full shrink-0">
            <UserIcon class="w-6 h-6 text-primary" />
          </div>
          <div>
            <DialogTitle class="text-xl font-bold">{{ entity.name }}</DialogTitle>
            <DialogDescription>{{ entity.subtitle }}</DialogDescription>
          </div>
        </div>
        <!-- Quick-action icon buttons (mailto, copy, etc.) -->
        <div class="flex items-center gap-1 shrink-0">...</div>
      </div>

      <!-- Optional contextual banner (IEP note, status warning, etc.) -->
      <div v-if="entity.note" class="p-3 bg-muted/40 rounded-md border text-sm ...">
        ...
      </div>

      <!-- View switcher — always Tabs, not ButtonGroup -->
      <TabsList class="w-full">
        <TabsTrigger value="overview" class="flex-1">...</TabsTrigger>
        <TabsTrigger value="edit" class="flex-1">...</TabsTrigger>
      </TabsList>

    </div>

    <!-- Scrollable view content -->
    <ScrollArea class="flex-1 min-h-0">
      <div class="px-6 py-4">
        <TabsContent value="overview">...</TabsContent>
        <TabsContent value="edit">...</TabsContent>
      </div>
    </ScrollArea>

    <!-- Conditional footer (only on edit view) -->
    <div v-if="viewMode === 'edit'" class="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
      <Button variant="outline" @click="handleCancel">{{ $t('common.cancel') }}</Button>
      <Button @click="handleSave">{{ $t('common.save') }}</Button>
    </div>

  </DialogContent>
</Dialog>
```

Rules:
- `DialogTitle` contains **only** the entity name — never an icon, badge, or email.
- `DialogDescription` is the subtitle/role/email — always an i18n'd string, never hardcoded, never `sr-only` with empty semantics.
- The view switcher uses `<Tabs>` — not `ButtonGroup`, not custom buttons with `:variant` toggling.
- `TabsList` sits in the fixed header so it is always visible while scrolling content.
- `TabsContent` blocks live inside the `ScrollArea`, not outside it.
- The footer is conditional on the active view — show it only when a save action is available (e.g. the edit tab), not on read-only tabs.
- All computed data (attendance stats, grade distribution, chart data) is extracted to a composable (`useEntityProfile.ts`), not computed inline in the component.

---

## 11. `StudentProfileModal.vue` — refinement plan

The current implementation (`src/modules/Students/components/StudentProfileModal.vue`) deviates from this guideline in several areas. The following work items bring it into compliance.

### Issues and fixes

| # | Current state | Required change | Effort |
|---|---|---|---|
| 1 | View switcher uses `ButtonGroup` with manual `:variant` toggling | Replace with `<Tabs>` + `<TabsList>` + `<TabsTrigger>` | S |
| 2 | `DialogTitle` wraps a full identity block (icon, email, copy buttons) | Move non-title content out of `DialogTitle`; `DialogTitle` gets only `student.name` | S |
| 3 | `DialogDescription class="sr-only"` with hardcoded `"Profile details and statistics"` | Replace with i18n key `students.profile.description` in both locale files | XS |
| 4 | All chart computations (`attendanceChartData`, `gradeDistributionData`, attendance timeline logic) are inline | Extract to `src/modules/Students/composables/useStudentProfile.ts` | M |
| 5 | Props typed as `any` (`student: any`, `meets: any[]`, `tasks: any[]`) | Add proper types from existing type files; create `StudentProfileData` aggregate type if needed | M |
| 6 | No `ScrollArea` — content uses `overflow-hidden` with unclear height management | Replace with `flex flex-col p-0` on `DialogContent` + `ScrollArea` on body per §7 | S |
| 7 | Props use `isOpen` + `@close` pattern | Migrate to `open` + `@update:open`; update all call sites | S |
| 8 | Footer (save button) is always rendered, not conditional on the edit view | Show footer only when `viewMode === 'edit'` | XS |
| 9 | `initialTab` prop mutates `viewMode` via a `watch` on component open | Rename to `defaultView`, use it only as the initial value of `viewMode` ref — no ongoing watch | XS |

### Recommended implementation order

1. **Items 7 + 9** (props API + initialTab) — no visual change, low risk, unblocks v-model usage everywhere StudentProfileModal is called.
2. **Item 2 + 3** (DialogTitle / DialogDescription) — semantic fix, invisible to users.
3. **Item 1** (ButtonGroup → Tabs) — visual parity, straightforward swap.
4. **Item 6** (ScrollArea layout) — improves overflow behaviour on tablet portrait.
5. **Items 4 + 5** (composable extraction + types) — largest change, most testability value.
6. **Item 8** (conditional footer) — small polish once the Tabs structure is in place.

---

## 12. Migrating hand-rolled overlays

`ConfirmModal.vue` and `QrCodeModal.vue` use `v-if + fixed inset-0 z-[60]` with raw `<button>` elements. Issues:

- No accessible focus trap.
- No ARIA `role="dialog"`.
- `useModalClose` manual Esc stack is only needed because Reka is not in use — it becomes dead code after migration.
- Raw `<button>` bypasses the design system (no variant, no consistent sizing).

**Migration targets:**

| File | Replace with | Notes |
|---|---|---|
| `ConfirmModal.vue` | `AlertDialog` | Cannot be Esc-dismissed — correct for destructive confirms |
| `QrCodeModal.vue` | `Dialog` | Standard centered dialog with `sm:max-w-sm` |

After both are migrated, `useModalClose.ts` can be deleted — Reka handles Esc natively for every Dialog/AlertDialog/Sheet.

---

## Quick reference

```
New overlay needed?
  ├─ Destructive confirm (delete, erase) OR blocking decision in a multi-step flow
  │     └─ AlertDialog — cannot be dismissed by Esc/overlay, forces explicit choice
  │
  ├─ Supplementary panel (filters, settings)
  │     └─ Sheet — max-w-[380px], fixed footer with Reset · Cancel · Apply
  │
  └─ Everything else → Dialog
        ├─ Sizing       sm:max-w-sm / [425px] / lg / xl / 2xl / 4xl
        ├─ Props API    open + @update:open  (v-model compatible)
        ├─ Anatomy      DialogHeader → body → DialogFooter
        ├─ DialogTitle  title text only — no icons, no buttons
        ├─ Stack        max 2 simultaneous levels — siblings, never nested
        │               (sequential: one closes before the next opens — OK at any depth)
        ├─ Skip button  w-full sm:w-auto sm:mr-auto — full-width on mobile, left-floated on sm+
        ├─ Tall content flex flex-col p-0  + ScrollArea on body (§7)
        └─ Profile      wide Dialog + Tabs switcher in fixed header (§10)
```
