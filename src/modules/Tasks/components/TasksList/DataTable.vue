<script setup lang="ts">
import type { PaginationState, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { Task } from '@Tasks/types/tasks'
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
import { ClipboardList } from 'lucide-vue-next'
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
    tasks: Task[]
    searchQuery?: string
    bulkMode?: boolean
    rowActions?: (task: Task) => RowActionItem[]
}>()

const { t } = useI18n()
const { formatDate } = useFormatters()
const columns = createColumns(props.rowActions ?? (() => []), t, { formatDate })

const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const columnVisibility = useStorage<VisibilityState>('edutrace-tasks-columns', { select: false })
const rowSelection = ref<RowSelectionState>({})
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })

const table = useVueTable({
    get data() {
        return props.tasks
    },
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: u => valueUpdater(u, sorting),
    onColumnVisibilityChange: u => valueUpdater(u, columnVisibility),
    onRowSelectionChange: u => valueUpdater(u, rowSelection),
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
        get pagination() {
            return pagination.value
        },
    },
})

watch(
    () => props.searchQuery,
    q => table.setGlobalFilter(q ?? ''),
    { immediate: true },
)

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
    <div class="space-y-2">
        <slot name="toolbar" :table="table" />

        <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
            <Table>
                <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="header.id === 'actions' ? 'w-10' : ''"
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
                                <TableRow :data-state="row.getIsSelected() ? 'selected' : undefined">
                                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
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
                        :title="$t(searchQuery ? 'tasks.noMatch' : 'tasks.noTasks')"
                        :icon="ClipboardList"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table">
            <DataTablePagination :table="table" />
        </slot>
    </div>
</template>
