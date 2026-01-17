<script setup lang="ts" generic="TData">
import { computed } from 'vue'
import type { Table } from '@tanstack/vue-table'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Columns, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
    table: Table<TData>
}>()

const columns = computed(() => {
    return props.table
        .getAllColumns()
        .filter(
            (column) =>
                typeof column.accessorFn !== 'undefined' && column.getCanHide()
        )
})

const visibleColumnsCount = computed(() => {
    return props.table.getVisibleLeafColumns().length
})

const handleReset = () => {
    // Logic to reset columns visibility. 
    // Since TanStack table doesn't have a direct "reset to default" unless we track it,
    // we might assume all columns should be visible or just enable them all.
    // However, usually "Reset" means "Show all" or "Restore default state".
    // For now, let's make it "Show All" or just toggle all to visible.
    // If the user wants a specific default, we'd need that config.
    // A safe bet for "Reset" in a picker often implies enabling all columns 
    // or reverting to the initial state. 
    // Given the context of "Show/Hide", "Reset" likely means "Show All" or 
    // "Reset to default". Let's assume enabling all for now, or we can check if 
    // TanStack has a reset method for visibility state.
    props.table.resetColumnVisibility()
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button variant="outline" class="h-9 gap-2">
                <Columns class="w-4 h-4" />
                Columns
                <Badge
                    class="h-5 min-w-[20px] px-1 bg-white text-zinc-950 hover:bg-white rounded-sm font-bold flex items-center justify-center border shadow-sm">
                    {{ visibleColumnsCount }}
                </Badge>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-[200px] p-0">
            <DropdownMenuLabel class="flex items-center justify-between p-3 pb-2">
                <span class="text-sm font-medium">Show/Hide Columns</span>
                <Button variant="ghost" size="sm" class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    @click.stop="handleReset">
                    <RotateCcw class="w-3 h-3 mr-1" />
                    Reset
                </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-0" />
            <div class="p-2 space-y-1">
                <div v-for="column in columns" :key="column.id"
                    class="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    @click="column.toggleVisibility(!column.getIsVisible())">
                    <Checkbox :id="column.id" :model-value="column.getIsVisible()"
                        @update:model-value="(value: boolean | string) => column.toggleVisibility(!!value)"
                        class="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                    <Label :for="column.id"
                        class="flex-1 cursor-pointer text-sm font-normal capitalize pointer-events-none">
                        {{ column.id }}
                    </Label>
                </div>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
