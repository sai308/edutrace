<script setup lang="ts">
import type { Module, StudentSummaryData } from '@Summary/types/summary'

import type { ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import type { RowActionItem } from '@/shared/types/table'
import { FlexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { ClipboardList } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTableEmptyState from '@/shared/components/DataTableEmptyState.vue'
import { useCompactName } from '@/shared/composables/useCompactName'
import { useFormatters } from '@/shared/composables/useFormatters'
import { createSummaryColumns } from './columns'

interface DataTableProps {
    students?: StudentSummaryData[]
    modules?: Module[]
    searchQuery?: string
    rowActions?: (student: StudentSummaryData) => RowActionItem[]
}

const props = withDefaults(defineProps<DataTableProps>(), {
    students: () => [],
    modules: () => [],
    searchQuery: '',
})

const emit = defineEmits<{
    (e: 'student-click', student: StudentSummaryData): void
}>()

const { t } = useI18n()
const { formatDate, formatTime } = useFormatters()
const { isCompact } = useCompactName()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])

const ordinalMap = computed<Map<string, number>>(() => {
    const sorted = [...props.students].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return new Map(sorted.map((s, i) => [s.id, i + 1]))
})

const columns = computed(() =>
    createSummaryColumns(
        props.modules,
        student => emit('student-click', student),
        props.rowActions ?? (() => []),
        ordinalMap.value,
        { formatDate, formatTime },
        t,
        isCompact,
    ),
)

const table = useVueTable({
    get data() {
        return props.students
    },
    get columns() {
        return columns.value
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updaterOrValue) => {
        sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue
    },
    onColumnFiltersChange: (updaterOrValue) => {
        columnFilters.value
            = typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters.value) : updaterOrValue
    },
    state: {
        get sorting() {
            return sorting.value
        },
        get columnFilters() {
            return columnFilters.value
        },
    },
})

// Filter only on the name column — a global filter would match grade strings
// like "~62", "A+", ECTS letters and produce confusing results.
watch(
    () => props.searchQuery,
    (q) => {
        table.getColumn('name')?.setFilterValue(q || undefined)
    },
)

defineExpose({ table })
</script>

<template>
    <div class="space-y-2">
        <slot name="toolbar" :table="table" />

        <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
            <Table>
                <TableHeader class="sticky top-0 z-30 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.column.id === 'name'
                                    ? 'min-w-[200px] sticky left-0 z-40 bg-muted/50 backdrop-blur supports-backdrop-filter:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                    : ['actions', 'ordinal'].includes(header.column.id)
                                        ? 'w-10'
                                        : '',
                            ]"
                        >
                            <FlexRender
                                v-if="!header.isPlaceholder"
                                :render="header.column.columnDef.header"
                                :props="header.getContext()"
                            />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <template v-if="table.getRowModel().rows?.length">
                        <ContextMenu v-for="row in table.getRowModel().rows" :key="row.id">
                            <ContextMenuTrigger as-child>
                                <TableRow
                                    :data-state="row.getIsSelected() ? 'selected' : undefined"
                                    class="hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell
                                        v-for="cell in row.getVisibleCells()"
                                        :key="cell.id"
                                        class="py-2.5"
                                        :class="[
                                            cell.column.id === 'name'
                                                ? 'sticky left-0 z-20 bg-muted/50 backdrop-blur supports-backdrop-filter:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                                : '',
                                        ]"
                                    >
                                        <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
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
                    <DataTableEmptyState
                        v-else
                        :colspan="columns.length"
                        :title="$t(searchQuery ? 'summary.noMatch' : 'summary.noRecords')"
                        :icon="ClipboardList"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table" />
    </div>
</template>
