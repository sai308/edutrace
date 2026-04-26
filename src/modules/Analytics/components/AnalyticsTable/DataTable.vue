<script setup lang="ts">
import type { DetailedStats } from '@Analytics/types/analytics'
import type { RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { useStorage } from '@vueuse/core'
import { BarChart3 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTableEmptyState from '@/shared/components/DataTableEmptyState.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import { useFormatters } from '@/shared/composables/useFormatters'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    stats: DetailedStats
    searchQuery?: string
}>()

const { t } = useI18n()
const { formatDate, formatSurname } = useFormatters()

const columns = computed(() => createColumns(t, props.stats.dates, { formatDate, formatSurname }))

const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref(props.searchQuery ?? '')
const columnVisibility = useStorage<VisibilityState>('edutrace-analytics-table-columns', {})

const table = useVueTable({
    get data() {
        return props.stats.matrix
    },
    get columns() {
        return columns.value
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: u => valueUpdater(u, sorting),
    onRowSelectionChange: u => valueUpdater(u, rowSelection),
    onGlobalFilterChange: u => valueUpdater(u, globalFilter),
    onColumnVisibilityChange: u => valueUpdater(u, columnVisibility),
    state: {
        get sorting() {
            return sorting.value
        },
        get rowSelection() {
            return rowSelection.value
        },
        get globalFilter() {
            return globalFilter.value
        },
        get columnVisibility() {
            return columnVisibility.value
        },
    },
})

watch(
    () => props.searchQuery,
    q => table.setGlobalFilter(q ?? ''),
)

defineExpose({ table })
</script>

<template>
    <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
            <slot name="toolbar" :table="table" />
            <DataTableViewOptions :table="table" />
        </div>

        <div class="rounded-md border bg-card overflow-x-auto custom-scrollbar">
            <Table class="min-w-full">
                <TableHeader class="sticky top-0 z-30 bg-background">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'select' ? 'w-10' : '',
                                header.id === 'name'
                                    ? 'w-[140px] sm:w-[200px] z-40 sticky left-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.1)]'
                                    : '',
                                header.id === 'totalPercentage'
                                    ? 'text-center w-[80px] z-40 sticky right-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-l shadow-[-1px_0_0_0_hsl(var(--border)),-2px_0_4px_-1px_rgba(0,0,0,0.1)]'
                                    : '',
                                !['select', 'name', 'totalPercentage'].includes(header.id) ? 'text-center px-4' : '',
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
                        <TableRow
                            v-for="row in table.getRowModel().rows"
                            :key="row.id"
                            :data-state="row.getIsSelected() ? 'selected' : undefined"
                            class="group hover:bg-muted/30 transition-colors"
                        >
                            <TableCell
                                v-for="cell in row.getVisibleCells()"
                                :key="cell.id"
                                :class="[
                                    cell.column.id === 'name'
                                        ? 'sticky left-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] font-medium text-xs sm:text-sm'
                                        : '',
                                    cell.column.id === 'totalPercentage'
                                        ? 'text-center sticky right-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-l shadow-[-1px_0_0_0_hsl(var(--border)),-2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                        : '',
                                    !['select', 'name', 'totalPercentage'].includes(cell.column.id)
                                        ? 'text-center p-2 min-w-[100px]'
                                        : '',
                                ]"
                            >
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <DataTableEmptyState
                        v-else
                        :colspan="columns.length"
                        :title="searchQuery ? $t('analytics.details.table.noMatch') : $t('common.noData')"
                        :icon="BarChart3"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table" />
    </div>
</template>
