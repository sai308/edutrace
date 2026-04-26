<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table'
import { Columns, RotateCcw } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
    table: Table<TData>
    compact?: boolean
    buttonClass?: string
}>()

const { t } = useI18n()

const columns = computed(() => {
    return props.table
        .getAllColumns()
        .filter(column => typeof column.accessorFn !== 'undefined' && column.getCanHide())
})

const visibleColumnsCount = computed(() => {
    return props.table.getVisibleLeafColumns().length
})

function handleReset() {
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
            <Button variant="outline" :class="cn('h-9 gap-2', props.buttonClass)">
                <Columns class="w-4 h-4 shrink-0" />
                <span v-if="!compact">{{ t('columnPicker.button') }}</span>
                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                    {{ visibleColumnsCount }}
                </Badge>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-[200px] p-0">
            <DropdownMenuLabel class="flex items-center justify-between p-3 pb-2">
                <span class="text-sm font-medium">{{ t('columnPicker.title') }}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    @click.stop="handleReset"
                >
                    <RotateCcw class="w-3 h-3 mr-1" />
                    {{ t('columnPicker.reset') }}
                </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-0" />
            <div class="p-2 space-y-1">
                <div
                    v-for="column in columns"
                    :key="column.id"
                    class="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    @click="column.toggleVisibility(!column.getIsVisible())"
                >
                    <Checkbox
                        :id="column.id"
                        :model-value="column.getIsVisible()"
                        class="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        @update:model-value="(value: boolean | string) => column.toggleVisibility(!!value)"
                    />
                    <Label :for="column.id" class="flex-1 cursor-pointer text-sm font-normal pointer-events-none">
                        {{ column.columnDef.meta?.label ?? column.id }}
                    </Label>
                </div>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
