# Dropdown Pickers

Canonical pattern for all single-value selector dropdowns in EduTrace (group pickers, format/scale pickers, etc.).

## Standard shape

```vue
<DropdownMenu>
    <DropdownMenuTrigger as-child>
        <Button variant="outline" size="sm" class="h-9 gap-1">
            <!-- Optional label — include when context needs it (group pickers always have it) -->
            <span class="text-xs text-muted-foreground mr-1 whitespace-nowrap">{{ t('marks.table.group') }}:</span>
            <!-- Current value -->
            <span class="font-medium truncate max-w-[100px]">{{ selectedValue || t('common.placeholder') }}</span>
            <ChevronDown class="h-3 w-3 opacity-50 shrink-0" />
        </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[200px] max-h-[300px] overflow-y-auto">
        <!-- "All" option (only when the picker supports clearing selection) -->
        <DropdownMenuItem
            :class="!selected ? 'bg-primary/15 text-primary font-medium' : ''"
            @click="selected = null"
        >
            {{ t('marks.filterModal.allGroups') }}
        </DropdownMenuItem>
        <!-- Items -->
        <DropdownMenuItem
            v-for="item in items"
            :key="item.id"
            :class="selected === item.value ? 'bg-primary/15 text-primary font-medium' : ''"
            @click="selected = item.value"
        >
            {{ item.label }}
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
```

## Rules

1. **Always use `DropdownMenu` + `Button` trigger** — never `Select` for group/option pickers in page headers or toolbars.
2. **Active item gets `bg-primary/15 text-primary font-medium`** — workspace color auto-applies via `--primary`. No radio dots, no checkmarks.
3. **Group pickers always include the `Group:` label prefix** in the trigger (`text-xs text-muted-foreground`).
4. **Trigger size** — `size="sm" class="h-9"`. Width `w-full sm:w-[200px]` for page-header pickers, natural width for toolbar pickers.
5. **Content** — `max-h-[300px] overflow-y-auto` to handle long lists. `align="end"` by default.
6. **Null-safe "all" option** — when picker supports clearing (group filter), add an "All groups" item that sets state to `null`. When picker always has a selection (Sessions group), omit it.

## Where this pattern is used

| File | Picker |
|------|--------|
| `Plans/pages/PlansPage.vue` | Group |
| `Summary/views/SummariesView.vue` | Group, Grade scale |
| `Marks/views/MarksView.vue` | Group (empty state), Grade scale (mobile + desktop) |
| `Marks/components/MarksFilterSheet.vue` | Group (inside Sheet) |
| `Sessions/pages/SessionsPage.vue` | Group |

## Exclusions

**`TeamSwitcher.vue`** — workspace picker in the sidebar. Uses `Check` icon on the active row instead of background highlight. Has per-item edit/delete action buttons and workspace-colored icons that make the `bg-primary/15` row highlight visually redundant. Do not apply the standard active-item class here.
