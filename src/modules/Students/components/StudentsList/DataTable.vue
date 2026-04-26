<script setup lang="ts">
import type { StudentDashboardStats } from '@Students/types/students'
import type {
    ColumnFiltersState,
    PaginationState,
    RowSelectionState,
    SortingState,
    VisibilityState,
} from '@tanstack/vue-table'
import type { RowActionItem } from '@/shared/types/table'
import {
    FlexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
} from '@tanstack/vue-table'
import { useStorage } from '@vueuse/core'
import { Users } from 'lucide-vue-next'
import { computed, ref, watch, watchEffect } from 'vue'
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
import DataTablePagination from '@/shared/components/DataTablePagination.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import { useColors } from '@/shared/composables/useColors'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    students: StudentDashboardStats[]
    teachers: Set<string>
    searchQuery?: string
    groupFilter?: string | null
    bulkMode?: boolean
    rowActions?: (student: StudentDashboardStats) => RowActionItem[]
}>()

const emit = defineEmits<{
    'select-group': [group: string]
    'open-analytics': [meetId: string]
}>()

const { t } = useI18n()
const { getScoreColor } = useColors()

// Stable computed so TanStack sees the same array reference when data hasn't changed.
// The inline `get data()` getter always returns a new Array.filter result, which makes
// TanStack think the data changed on every render and rebuild all Row objects.
const tableData = computed(() => props.students.filter(s => !props.teachers.has(s.name)))

// Ordinal map: 1-based position of each student in A-Z name sort within the active group.
// Empty when no group filter is active — ordinal is only meaningful within a single group.
const ordinalMap = computed<Map<string, number>>(() => {
    if (!props.groupFilter)
        return new Map()
    const inGroup = tableData.value.filter(s => s.groups.includes(props.groupFilter!))
    const sorted = [...inGroup].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return new Map(sorted.map((s, i) => [s.id, i + 1]))
})

const columns = computed(() => createColumns(props.rowActions ?? (() => []), emit, t, getScoreColor, ordinalMap.value))

const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const columnVisibility = useStorage<VisibilityState>('edutrace-students-columns', {
    select: false,
    meetIds: false,
    ordinal: false,
})
const rowSelection = ref<RowSelectionState>({})
const columnFilters = ref<ColumnFiltersState>([])
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })

const table = useVueTable({
    get data() {
        return tableData.value
    },
    get columns() {
        return columns.value
    },
    getRowId: row => row.id ?? row.name,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: u => valueUpdater(u, sorting),
    onColumnVisibilityChange: u => valueUpdater(u, columnVisibility),
    onRowSelectionChange: u => valueUpdater(u, rowSelection),
    onColumnFiltersChange: u => valueUpdater(u, columnFilters),
    onPaginationChange: u => valueUpdater(u, pagination),
    state: {
        get sorting() {
            return sorting.value
        },
        get columnVisibility() {
            return columnVisibility.value
        },
        get rowSelection() {
            return rowSelection.value
        },
        get columnFilters() {
            return columnFilters.value
        },
        get pagination() {
            return pagination.value
        },
    },
})

watchEffect(() => table.setGlobalFilter(props.searchQuery ?? ''))

watchEffect(() => {
    table.getColumn('groups')?.setFilterValue(props.groupFilter || undefined)
})

watch(
    () => props.bulkMode,
    (enabled) => {
        table.setColumnVisibility(prev => ({ ...prev, select: !!enabled }))
        if (!enabled)
            table.toggleAllRowsSelected(false)
    },
    { immediate: true },
)

watch(
    () => props.groupFilter,
    (group) => {
        table.setColumnVisibility(prev => ({ ...prev, ordinal: !!group }))
    },
    { immediate: true },
)

defineExpose({ table })
</script>

<template>
    <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
            <slot name="toolbar" :table="table" />
            <DataTableViewOptions :table="table" />
        </div>

        <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
            <Table class="min-w-[900px]">
                <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'name'
                                    ? 'sticky left-0 z-40 w-[200px] bg-muted/50 backdrop-blur supports-backdrop-filter:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                    : header.id === 'actions'
                                        ? 'w-10'
                                        : !['select', 'ordinal'].includes(header.id)
                                            ? 'min-w-[100px]'
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
                    <template v-if="table.getRowModel().rows.length">
                        <ContextMenu v-for="row in table.getRowModel().rows" :key="row.id">
                            <ContextMenuTrigger as-child>
                                <TableRow
                                    :data-state="row.getIsSelected() ? 'selected' : undefined"
                                    class="hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell
                                        v-for="cell in row.getVisibleCells()"
                                        :key="cell.id"
                                        class="p-3"
                                        :class="
                                            cell.column.id === 'name'
                                                ? 'sticky left-0 z-20 bg-muted/50 backdrop-blur supports-backdrop-filter:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] font-medium'
                                                : ''
                                        "
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
                        :title="$t('students.noStudents')"
                        :icon="Users"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table">
            <DataTablePagination :table="table" />
        </slot>
    </div>
</template>
