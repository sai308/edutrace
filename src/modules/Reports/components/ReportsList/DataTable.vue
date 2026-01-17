<script setup lang="ts" generic="TData extends Meet">
import { ref, watch } from 'vue'
import { createColumns } from './columns'
import type { SortingState, VisibilityState } from '@tanstack/vue-table'
import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useVueTable,
} from '@tanstack/vue-table'
import { valueUpdater } from '@/lib/utils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { Meet } from '@/modules/Analytics/types/analytics'

const props = defineProps<{
    meets: TData[]
    searchQuery?: string
}>()

const emit = defineEmits(['view-details', 'delete-meet', 'bulk-delete'])

const columns = createColumns(emit)
const sorting = ref<SortingState>([])
const rowSelection = ref({})
const globalFilter = ref('')
const columnVisibility = ref<VisibilityState>({})

const table = useVueTable({
    get data() { return props.meets },
    get columns() { return columns },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
    onGlobalFilterChange: updaterOrValue => valueUpdater(updaterOrValue, globalFilter),
    onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
    state: {
        get sorting() { return sorting.value },
        get rowSelection() { return rowSelection.value },
        get globalFilter() { return globalFilter.value },
        get columnVisibility() { return columnVisibility.value },
    },
})

watch(() => props.searchQuery, (newQuery) => {
    table.setGlobalFilter(newQuery)
})

defineExpose({ table })
</script>

<template>
    <div class="space-y-3">
        <slot name="toolbar" :table="table"></slot>

        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead v-for="header in headerGroup.headers" :key="header.id">
                            <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
                                :props="header.getContext()" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <template v-if="table.getRowModel().rows?.length">
                        <TableRow v-for="row in table.getRowModel().rows" :key="row.id"
                            :data-state="row.getIsSelected() && 'selected'">
                            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <TableRow v-else>
                        <TableCell :colspan="columns.length" class="h-24 text-center">
                            No reports found.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>