<script setup lang="ts">
import type { Meet } from '@Analytics/types/analytics'
import type { PaginationState, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
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
import { FileText } from 'lucide-vue-next'
import { ref, watch } from 'vue'
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
import { useFormatters } from '@/shared/composables/useFormatters'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    meets: Meet[]
    searchQuery?: string
    bulkMode?: boolean
    rowActions?: (meet: Meet) => RowActionItem[]
}>()

const { t } = useI18n()
const { formatDate, formatTime } = useFormatters()
const columns = createColumns(props.rowActions ?? (() => []), t, { formatDate, formatTime })

const sorting = ref<SortingState>([{ id: 'date', desc: true }])
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })

// select column hidden by default; revealed when bulkMode is enabled (Rule 9)
const columnVisibility = useStorage<VisibilityState>('edutrace-reports-columns', {
    select: false,
    uploadedAt: false,
})

const table = useVueTable({
    get data() {
        return props.meets
    },
    get columns() {
        return columns
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
    onGlobalFilterChange: updaterOrValue => valueUpdater(updaterOrValue, globalFilter),
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
    q => table.setGlobalFilter(q ?? ''),
)

// Reveal/hide the select column when bulk mode changes.
// Uses setColumnVisibility directly to bypass enableHiding:false guard (Rule 9).
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
            <Table class="min-w-[700px]">
                <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'groupName'
                                    ? 'sticky left-0 z-40 w-[160px] bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                    : header.id === 'actions'
                                        ? 'w-10'
                                        : !['select'].includes(header.id)
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
                                            cell.column.id === 'groupName'
                                                ? 'sticky left-0 z-20 bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] font-medium'
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
                        :title="searchQuery ? $t('reports.noMatch') : $t('reports.noReports')"
                        :icon="FileText"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table">
            <DataTablePagination :table="table" />
        </slot>
    </div>
</template>
