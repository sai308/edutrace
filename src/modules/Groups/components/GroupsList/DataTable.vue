<script setup lang="ts">
import type { EnrichedGroup } from '@Groups/types/groups'
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
import { Layers } from 'lucide-vue-next'
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
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    groups: EnrichedGroup[]
    memberCounts: Record<string, number>
    searchQuery?: string
    bulkMode?: boolean
    sortField?: string
    sortOrder?: string
    rowActions?: (group: EnrichedGroup) => RowActionItem[]
}>()

const emit = defineEmits<{
    'update:sort': [field: string, order: string]
}>()

const { t } = useI18n()

const columns = createColumns(props.rowActions ?? (() => []), t, name => props.memberCounts[name] ?? 0)

const sorting = ref<SortingState>(
    props.sortField ? [{ id: props.sortField, desc: props.sortOrder === 'desc' }] : [{ id: 'name', desc: false }],
)
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref(props.searchQuery ?? '')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 30 })
const columnVisibility = useStorage<VisibilityState>('edutrace-groups-columns', {
    select: false,
    modeMark: false,
    medianMark: false,
})

const table = useVueTable({
    get data() {
        return props.groups
    },
    columns,
    getRowId: row => String(row.meetId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: u => valueUpdater(u, sorting),
    onRowSelectionChange: u => valueUpdater(u, rowSelection),
    onGlobalFilterChange: u => valueUpdater(u, globalFilter),
    onColumnVisibilityChange: u => valueUpdater(u, columnVisibility),
    onPaginationChange: u => valueUpdater(u, pagination),
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

watch(
    () => props.bulkMode,
    (enabled) => {
        table.setColumnVisibility(prev => ({ ...prev, select: !!enabled }))
        if (!enabled)
            table.toggleAllRowsSelected(false)
    },
    { immediate: true },
)

// Emit sort changes so the parent can sync them to the URL
watch(sorting, (s) => {
    const current = s[0]
    if (!current)
        return
    const newOrder = current.desc ? 'desc' : 'asc'
    if (current.id !== props.sortField || newOrder !== props.sortOrder) {
        emit('update:sort', current.id, newOrder)
    }
})

// Apply sort prop changes (back/forward navigation)
watch(
    () => [props.sortField, props.sortOrder] as const,
    ([field, order]) => {
        if (!field)
            return
        const current = sorting.value[0]
        const newDesc = order === 'desc'
        if (!current || current.id !== field || current.desc !== newDesc) {
            sorting.value = [{ id: field, desc: newDesc }]
        }
    },
)

defineExpose({ table })
</script>

<template>
    <div class="space-y-2">
        <slot name="toolbar" :table="table" />

        <div class="rounded-md border bg-card overflow-auto max-h-[calc(100svh-20rem)] custom-scrollbar">
            <Table class="min-w-[800px]">
                <TableHeader class="sticky top-0 z-30 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            :class="[
                                header.id === 'name'
                                    ? 'sticky left-0 z-40 w-[180px] bg-muted/50 backdrop-blur supports-backdrop-filter:bg-muted/40 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
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
                        :title="searchQuery ? $t('groups.noMatch') : $t('groups.noGroups')"
                        :icon="Layers"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table">
            <DataTablePagination :table="table" />
        </slot>
    </div>
</template>
