<script setup lang="ts">
import type { RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { SessionEntry } from '../../models/session.model'
import { FlexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { useStorage } from '@vueuse/core'
import { Clock } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataTableEmptyState from '@/shared/components/DataTableEmptyState.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import { useFormatters } from '@/shared/composables/useFormatters'
import { valueUpdater } from '@/shared/lib/utils'
import { createColumns } from './columns'

const props = defineProps<{
    entries: SessionEntry[]
    referenceEntries?: SessionEntry[]
    searchQuery?: string
}>()

const { t } = useI18n()
const { formatDate, formatTime, formatSurname } = useFormatters()

// Build ordinal map from the reference pool (main session entries, which have all students).
// Falls back to the current session's own entries when no reference is provided (main session).
const ordinalMap = computed<Map<string, number>>(() => {
    const pool = props.referenceEntries?.length ? props.referenceEntries : props.entries
    const sorted = [...pool].sort((a, b) =>
        a.studentSnapshot.fullName.localeCompare(b.studentSnapshot.fullName, undefined, {
            sensitivity: 'base',
        }),
    )
    return new Map(sorted.map((e, i) => [e.studentId, i + 1]))
})

const columns = computed(() => createColumns(t, { formatDate, formatTime, formatSurname }, ordinalMap.value))

const sorting = ref<SortingState>([{ id: 'lastUpdate', desc: true }])
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref(props.searchQuery ?? '')
const columnVisibility = useStorage<VisibilityState>('edutrace-sessions-columns', {})

const table = useVueTable({
    get data() {
        return props.entries
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

        <div class="border rounded-md overflow-hidden">
            <Table class="min-w-[800px] lg:min-w-[1000px]">
                <TableHeader class="sticky top-0 z-40 bg-background shadow-sm">
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead
                            v-for="header in headerGroup.headers"
                            :key="header.id"
                            class="bg-background border-b"
                            :class="
                                header.id === 'student'
                                    ? 'w-[120px] min-w-[120px] sm:w-[300px] sm:min-w-[300px] sticky left-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)]'
                                    : ['ordinal', 'select'].includes(header.id)
                                        ? 'w-10'
                                        : header.id === 'lastUpdate'
                                            ? 'text-right'
                                            : ''
                            "
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
                            :class="row.original.grade === null ? 'opacity-60 text-muted-foreground' : ''"
                        >
                            <TableCell
                                v-for="cell in row.getVisibleCells()"
                                :key="cell.id"
                                class="border-b"
                                :class="
                                    cell.column.id === 'student'
                                        ? 'sticky left-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] max-w-[120px] sm:max-w-[300px]'
                                        : cell.column.id === 'lastUpdate'
                                            ? 'text-right'
                                            : ''
                                "
                            >
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <DataTableEmptyState
                        v-else
                        :colspan="columns.length"
                        :title="searchQuery ? $t('common.noData') : $t('sessions.table.noStudents')"
                        :icon="Clock"
                    />
                </TableBody>
            </Table>
        </div>

        <slot name="footer" :table="table" />
    </div>
</template>
