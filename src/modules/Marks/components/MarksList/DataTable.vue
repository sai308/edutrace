<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import type { ColumnFiltersState, PaginationState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { ActiveFilters, UIMark } from './columns'
import type { MarkFormat } from '@/shared/composables/useMarkFormat'
import {
    FlexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
} from '@tanstack/vue-table'
import { useStorage } from '@vueuse/core'
import { GraduationCap } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTableEmptyState from '@/shared/components/DataTableEmptyState.vue'
import { useCompactName } from '@/shared/composables/useCompactName'
import { useFormatters } from '@/shared/composables/useFormatters'
import { useMarkFormat } from '@/shared/composables/useMarkFormat'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    marks: UIMark[]
    searchQuery?: string
    activeFilters?: ActiveFilters
    selectedFormat?: MarkFormat | ''
    bulkMode?: boolean
    groups?: Group[]
}>()

const emit = defineEmits<{
    'toggle-synced': [mark: UIMark]
    'delete-mark': [mark: UIMark]
    'upload': []
}>()

const { t } = useI18n()
const { formatDate, formatTime } = useFormatters()
const { getFormattedMark, getMarkTooltip } = useMarkFormat()
const { isCompact } = useCompactName()

const formatters = {
    formatDate,
    formatTime,
    getFormattedMark,
    getMarkTooltip,
}

// columns is a computed so TanStack re-evaluates cells when isCompact changes
// (breakpoint crossing sm=640px), without resetting sort/filter/selection state
// because column IDs remain stable across recomputes.
const columns = computed(() => createColumns(emit, formatters, t, () => props.selectedFormat ?? '', isCompact))

const sorting = ref<SortingState>([{ id: 'added', desc: true }])
const rowSelection = ref({})
const globalFilter = ref('')
const columnFilters = ref<ColumnFiltersState>([])
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })

// select column is hidden by default; revealed when bulkMode is enabled (Rule 9)
const columnVisibility = useStorage<VisibilityState>('edutrace-marks-columns', {
    select: false,
    added: true,
    student: true,
    group: true,
    task: true,
    syncedAt: false,
    mark: true,
})

const table = useVueTable({
    get data() {
        return props.marks
    },
    get columns() {
        return columns.value
    },
    getRowId: row => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
    onGlobalFilterChange: updaterOrValue => valueUpdater(updaterOrValue, globalFilter),
    onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
    onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
    onPaginationChange: updaterOrValue => valueUpdater(updaterOrValue, pagination),
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
        get columnFilters() {
            return columnFilters.value
        },
        get columnVisibility() {
            return columnVisibility.value
        },
        get pagination() {
            return pagination.value
        },
    },
})

watch(
    () => props.searchQuery,
    (q) => {
        table.setGlobalFilter(q)
    },
)

watch(
    () => props.activeFilters,
    (filters) => {
        const defaultFilters: ActiveFilters = {
            synced: 'all',
            dateFrom: '',
            group: null,
            hideFailed: false,
        }
        table.setColumnFilters([{ id: '_filters', value: filters ?? defaultFilters }])
    },
    { immediate: true, deep: true },
)

// Reveal/hide the select column in response to bulk mode toggle (Rule 9).
// toggleVisibility respects enableHiding:false and is a no-op for the select column,
// so we call setColumnVisibility directly to bypass that guard.
// immediate:true ensures the column is hidden on first render regardless of localStorage.
watch(
    () => props.bulkMode,
    (enabled) => {
        table.setColumnVisibility(prev => ({ ...prev, select: !!enabled }))
        if (!enabled)
            table.toggleAllRowsSelected(false)
    },
    { immediate: true },
)

defineExpose({ table })
</script>

<template>
    <div class="space-y-3">
        <slot name="toolbar" :table="table" />

        <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
            <Table>
                <TableHeader class="sticky top-0 z-30 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'student'
                                    ? 'min-w-[160px] sticky left-0 z-40 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
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
                        <TableRow
                            v-for="row in table.getRowModel().rows"
                            :key="row.id"
                            :data-state="row.getIsSelected() ? 'selected' : undefined"
                            class="hover:bg-muted/50 transition-colors"
                        >
                            <TableCell
                                v-for="cell in row.getVisibleCells()"
                                :key="cell.id"
                                class="p-3"
                                :class="[
                                    cell.column.id === 'student'
                                        ? 'sticky left-0 z-20 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                        : '',
                                    cell.column.id === 'actions' ? 'p-0' : '',
                                ]"
                            >
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <DataTableEmptyState
                        v-else
                        :colspan="columns.length"
                        :title="$t('marks.noMatch')"
                        :icon="GraduationCap"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table" />
    </div>
</template>
