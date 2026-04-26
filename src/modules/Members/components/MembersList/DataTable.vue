<script setup lang="ts">
import type { Member } from '@Students/types/students'
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
import { UserCog } from 'lucide-vue-next'
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
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    items: Member[]
    searchQuery?: string
    bulkMode?: boolean
    rowActions?: (member: Member) => RowActionItem[]
}>()

const { t } = useI18n()

const columns = createColumns(props.rowActions ?? (() => []), t)

const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref(props.searchQuery ?? '')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })
// select: false keeps checkboxes hidden until the bulk switch is toggled on.
// immediate: true in the watch below enforces this even if localStorage has a stale value.
const columnVisibility = useStorage<VisibilityState>('edutrace-members-columns', { select: false })

const table = useVueTable({
    get data() {
        return props.items
    },
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
    onGlobalFilterChange: (updaterOrValue) => valueUpdater(updaterOrValue, globalFilter),
    onColumnVisibilityChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnVisibility),
    onPaginationChange: (updaterOrValue) => valueUpdater(updaterOrValue, pagination),
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
    (q) => table.setGlobalFilter(q ?? '')
)

// Use setColumnVisibility (not toggleVisibility) — the select column has enableHiding: false
// which makes toggleVisibility a silent no-op. immediate: true corrects any stale localStorage value.
watch(
    () => props.bulkMode,
    (enabled) => {
        table.setColumnVisibility((prev) => ({ ...prev, select: !!enabled }))
        if (!enabled) table.toggleAllRowsSelected(false)
    },
    { immediate: true }
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
            <Table class="min-w-[640px]">
                <TableHeader class="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'name'
                                    ? 'sticky left-0 z-40 w-[200px] bg-card shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
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
                                            cell.column.id === 'name'
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
                        :title="$t('members.noMatch')"
                        :icon="UserCog"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table">
            <DataTablePagination :table="table" />
        </slot>
    </div>
</template>
