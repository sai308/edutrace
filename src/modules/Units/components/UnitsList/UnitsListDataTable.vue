<script setup lang="ts">
import type { RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { Unit } from '@Units/types/units'
import type { RowActionItem } from '@/shared/types/table'
import { FlexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
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
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    units: Unit[]
    searchQuery?: string
    bulkMode?: boolean
    isReordering?: boolean
    rowActions?: (unit: Unit) => RowActionItem[]
}>()

const emit = defineEmits<{
    'update-order': [data: Unit[]]
}>()

const { t } = useI18n()

const columns = createColumns(props.rowActions ?? (() => []), t)

const sorting = ref<SortingState>([])
const columnVisibility = useStorage<VisibilityState>('edutrace-units-columns', { select: false })
const rowSelection = ref<RowSelectionState>({})

const table = useVueTable({
    get data() {
        return props.units
    },
    columns,
    getRowId: (row) => String(row.id ?? row.name),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (u) => valueUpdater(u, sorting),
    onColumnVisibilityChange: (u) => valueUpdater(u, columnVisibility),
    onRowSelectionChange: (u) => valueUpdater(u, rowSelection),
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
    },
})

watch(
    () => props.searchQuery,
    (q) => table.setGlobalFilter(q ?? '')
)

watch(
    () => props.bulkMode,
    (enabled) => {
        table.setColumnVisibility((prev) => ({ ...prev, select: !!enabled }))
        if (!enabled) table.toggleAllRowsSelected(false)
    },
    { immediate: true }
)

// ── Drag-to-reorder ──────────────────────────────────────────────────────────

const draggedIndex = ref<number | null>(null)
const draggedOverIndex = ref<number | null>(null)
const dragDirection = ref<'up' | 'down' | null>(null)

function handleDragStart(e: DragEvent, index: number) {
    if (!props.isReordering) return
    draggedIndex.value = index
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', index.toString()) // required for Firefox
    }
    if (e.target instanceof HTMLElement) {
        setTimeout(() => {
            ;(e.target as HTMLElement).classList.add('opacity-50')
        }, 0)
    }
}

function handleDragOver(e: DragEvent, index: number) {
    if (!props.isReordering || draggedIndex.value === null) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (draggedIndex.value !== index) {
        draggedOverIndex.value = index
        if (e.currentTarget instanceof HTMLElement) {
            const rect = e.currentTarget.getBoundingClientRect()
            dragDirection.value = e.clientY < rect.top + rect.height / 2 ? 'up' : 'down'
        }
    } else {
        draggedOverIndex.value = null
        dragDirection.value = null
    }
}

function handleDrop(e: DragEvent, index: number) {
    if (!props.isReordering || draggedIndex.value === null) return
    e.preventDefault()
    if (draggedIndex.value !== index) {
        let targetIndex = index
        if (dragDirection.value === 'up' && index > draggedIndex.value) targetIndex--
        else if (dragDirection.value === 'down' && index < draggedIndex.value) targetIndex++
        const newData = [...props.units]
        const item = newData[draggedIndex.value]
        if (!item) return
        newData.splice(draggedIndex.value, 1)
        newData.splice(targetIndex, 0, item)
        emit('update-order', newData)
    }
    draggedIndex.value = null
    draggedOverIndex.value = null
    dragDirection.value = null
}

function handleDragEnd(e: DragEvent) {
    draggedIndex.value = null
    draggedOverIndex.value = null
    dragDirection.value = null
    if (e.target instanceof HTMLElement) {
        ;(e.target as HTMLElement).classList.remove('opacity-50')
    }
}

defineExpose({ table })
</script>

<template>
    <div class="space-y-2">
        <slot name="toolbar" :table="table" />

        <!-- Table -->
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
                        <ContextMenu v-for="(row, index) in table.getRowModel().rows" :key="row.id">
                            <ContextMenuTrigger as-child>
                                <TableRow
                                    :data-state="row.getIsSelected() ? 'selected' : undefined"
                                    :draggable="isReordering"
                                    :class="[
                                        isReordering
                                            ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-all'
                                            : '',
                                        draggedIndex === index ? 'opacity-50' : '',
                                        draggedOverIndex === index && dragDirection === 'up'
                                            ? 'border-t-2 border-t-primary'
                                            : '',
                                        draggedOverIndex === index && dragDirection === 'down'
                                            ? 'border-b-2 border-b-primary'
                                            : '',
                                    ]"
                                    @dragstart="handleDragStart($event, index)"
                                    @dragover="handleDragOver($event, index)"
                                    @dragleave="
                                        draggedOverIndex = null
                                        dragDirection = null
                                    "
                                    @drop="handleDrop($event, index)"
                                    @dragend="handleDragEnd"
                                >
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
                        :title="$t(searchQuery ? 'modules.list.noMatch' : 'modules.list.noResults')"
                        :icon="Layers"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table" />
    </div>
</template>
