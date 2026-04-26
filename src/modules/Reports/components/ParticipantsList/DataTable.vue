<script setup lang="ts">
import type { Participant } from '@Analytics/types/analytics'
import type { SortingState, VisibilityState } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { useStorage } from '@vueuse/core'
import { Users } from 'lucide-vue-next'
import { ref } from 'vue'

import { useI18n } from 'vue-i18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTableEmptyState from '@/shared/components/DataTableEmptyState.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'

import { useColors } from '@/shared/composables/useColors'
import { useFormatters } from '@/shared/composables/useFormatters'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    participants: Participant[]
    totalDuration: number
}>()

const { t } = useI18n()
const { getScoreColor } = useColors()
const { formatDuration } = useFormatters()

function getAttendancePercentage(duration: number): number {
    if (props.totalDuration <= 0)
        return 0
    return Math.round((duration / props.totalDuration) * 100)
}

const columns = createColumns(t, getScoreColor, formatDuration, getAttendancePercentage)
const sorting = ref<SortingState>([])
const rowSelection = ref({})

const columnVisibility = useStorage<VisibilityState>('edutrace-participants-columns', {
    email: false,
    joinTime: false,
})

const table = useVueTable({
    get data() {
        return props.participants
    },
    get columns() {
        return columns
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
    onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
    state: {
        get sorting() {
            return sorting.value
        },
        get rowSelection() {
            return rowSelection.value
        },
        get columnVisibility() {
            return columnVisibility.value
        },
    },
})
</script>

<template>
    <div class="space-y-3">
        <div class="flex items-center justify-end">
            <DataTableViewOptions :table="table" />
        </div>
        <div class="rounded-md border bg-card overflow-x-auto">
            <Table class="min-w-[500px]">
                <TableHeader>
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead v-for="header in headerGroup.headers" :key="header.id" class="min-w-[100px]">
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
                            class="hover:bg-muted/50 transition-colors"
                        >
                            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="p-3">
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <DataTableEmptyState v-else :colspan="columns.length" :title="$t('common.noData')" :icon="Users" />
                </TableBody>
            </Table>
        </div>
    </div>
</template>
