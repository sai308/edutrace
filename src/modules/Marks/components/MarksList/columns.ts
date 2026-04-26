import type { FlatMark } from '@Marks/types/marks'
import type { ColumnDef, Row } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { MarkFormat } from '@/shared/composables/useMarkFormat'
import { Calendar, CircleCheckBig, Clock, Trash2 } from 'lucide-vue-next'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'

export interface UIMark extends FlatMark {}

export interface ActiveFilters {
    synced: 'all' | 'unsynced'
    dateFrom: string
    group: string | null
    hideFailed: boolean
}

interface ColumnsEmit {
    (event: 'toggle-synced', mark: UIMark): void
    (event: 'delete-mark', mark: UIMark): void
    (event: 'upload'): void
}

interface Formatters {
    formatDate: (date: string | Date) => string
    formatTime: (date: string | Date) => string
    getFormattedMark: (mark: UIMark, format?: MarkFormat) => string | number | undefined
    getMarkTooltip: (score: number, max: number) => string[]
}

export function createColumns(
    emit: ColumnsEmit,
    formatters: Formatters,
    t: (key: string, ...args: unknown[]) => string,
    getFormat: () => MarkFormat | '',
    isCompact: Ref<boolean>,
): ColumnDef<UIMark>[] {
    return [
        {
            id: 'select',
            header: ({ table }) =>
                h(Checkbox, {
                    'modelValue':
                        table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                        table.toggleAllPageRowsSelected(!!value),
                    'ariaLabel': 'Select all',
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    'modelValue': row.getIsSelected(),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
                    'ariaLabel': 'Select row',
                }),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'createdAt',
            id: 'added',
            meta: { label: t('marks.table.added') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('marks.table.added') }),
            cell: ({ row }) => {
                const dateRaw = row.getValue('added') as string
                return h('div', { class: 'text-xs text-muted-foreground' }, [
                    h('div', { class: 'flex flex-col gap-1' }, [
                        h('div', { class: 'flex items-center gap-1' }, [
                            h(Calendar, { class: 'w-3 h-3' }),
                            h('span', formatters.formatDate(dateRaw)),
                        ]),
                        h('div', { class: 'flex items-center gap-1 text-[10px] opacity-80' }, [
                            h(Clock, { class: 'w-3 h-3' }),
                            h('span', formatters.formatTime(dateRaw)),
                        ]),
                    ]),
                ])
            },
        },
        {
            accessorKey: 'studentName',
            id: 'student',
            meta: { label: t('marks.table.student') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('marks.table.student') }),
            cell: ({ row }) => {
                const name = row.getValue('student') as string
                const display = isCompact.value ? (name.split(/\s+/)[0] ?? name) : name
                return h('div', { class: 'font-medium truncate', title: name }, display)
            },
        },
        {
            accessorKey: 'groupName',
            id: 'group',
            meta: { label: t('marks.table.group') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('marks.table.group') }),
            cell: ({ row }) => {
                const groupName = row.getValue('group') as string
                return h(
                    Badge,
                    {
                        variant: 'secondary',
                        class: 'max-w-[120px] truncate select-none',
                    },
                    () => groupName,
                )
            },
        },
        {
            accessorKey: 'taskName',
            id: 'task',
            meta: { label: t('marks.table.task') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('marks.table.task') }),
            cell: ({ row }) => {
                const taskName = (row.getValue('task') || '') as string
                const formattedTaskName = taskName.replace(/_/g, ' ')
                const taskDate = row.original.taskDate
                return h('div', { class: 'truncate', title: taskName }, [
                    h('div', { class: 'flex flex-col' }, [
                        h('span', { class: 'truncate' }, formattedTaskName),
                        h('span', { class: 'text-xs text-muted-foreground' }, taskDate),
                    ]),
                ])
            },
        },
        {
            accessorKey: 'syncedAt',
            id: 'syncedAt',
            meta: { label: t('marks.table.syncedAt') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('marks.table.syncedAt') }),
            cell: ({ row }) => {
                const val = row.getValue('syncedAt') as string | null | undefined
                if (!val)
                    return h('span', { class: 'text-xs text-muted-foreground' }, '—')
                return h('div', { class: 'text-xs text-muted-foreground' }, [
                    h('div', { class: 'flex flex-col gap-1' }, [
                        h('div', { class: 'flex items-center gap-1' }, [
                            h(Calendar, { class: 'w-3 h-3' }),
                            h('span', formatters.formatDate(val)),
                        ]),
                        h('div', { class: 'flex items-center gap-1 text-[10px] opacity-80' }, [
                            h(Clock, { class: 'w-3 h-3' }),
                            h('span', formatters.formatTime(val)),
                        ]),
                    ]),
                ])
            },
        },
        {
            id: 'mark',
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: t('marks.table.mark'),
                    class: 'text-center justify-center',
                }),
            cell: ({ row }) => {
                const mark = row.original
                const tooltipLines = formatters.getMarkTooltip(mark.score ?? 0, mark.maxPoints ?? 100)

                // CSS-only tooltip via named group hover — no JS reactivity needed.
                // row.original is a plain object; mutating it doesn't trigger Vue re-renders.
                const markContent = h('div', { class: 'relative group/mtip inline-block' }, [
                    h(
                        'span',
                        {
                            class: 'font-mono font-bold cursor-help border-b border-dotted border-muted-foreground/50',
                        },
                        String(formatters.getFormattedMark(mark, (getFormat() as MarkFormat) || undefined) ?? ''),
                    ),
                    tooltipLines.length > 0
                        ? h(
                                'div',
                                {
                                    class: [
                                        'absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5',
                                        'px-3 py-2 bg-popover border border-border rounded-md shadow-md',
                                        'text-xs text-popover-foreground whitespace-nowrap pointer-events-none',
                                        'invisible opacity-0 group-hover/mtip:visible group-hover/mtip:opacity-100',
                                        'transition-opacity duration-150',
                                    ].join(' '),
                                },
                                tooltipLines.map(line => h('div', { class: 'py-0.5' }, line)),
                            )
                        : null,
                ])

                const unsyncedDot = !mark.synced
                    ? h('span', {
                            class: 'w-2 h-2 rounded-full bg-orange-500 animate-pulse',
                            title: t('marks.tooltips.unSynced'),
                        })
                    : null

                return h('div', { class: 'flex items-center justify-center gap-1' }, [
                    markContent,
                    h('div', { class: 'w-2 h-2 flex items-center justify-center' }, [unsyncedDot]),
                ])
            },
        },
        {
            // Hidden virtual column — holds all active filter logic so TanStack manages filtering.
            // The filterFn receives the current ActiveFilters value via table.setColumnFilters.
            id: '_filters',
            accessorFn: row => row,
            filterFn: (row: Row<UIMark>, _columnId: string, filterValue: ActiveFilters) => {
                if (!filterValue)
                    return true
                const m = row.original
                if (filterValue.synced === 'unsynced' && m.synced)
                    return false
                if (filterValue.dateFrom) {
                    const fromDate = new Date(filterValue.dateFrom).setHours(0, 0, 0, 0)
                    if (new Date(m.createdAt).getTime() < fromDate)
                        return false
                }
                if (filterValue.group && filterValue.group !== '_all' && filterValue.group !== 'null') {
                    if (m.groupName !== filterValue.group)
                        return false
                }
                if (filterValue.hideFailed) {
                    const max = Number(m.maxPoints) || 100
                    const percent = (Number(m.score) / max) * 100
                    if (percent < 60)
                        return false
                }
                return true
            },
            enableSorting: false,
            enableHiding: false,
            enableGlobalFilter: false,
            header: () => null,
            cell: () => null,
            size: 0,
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const mark = row.original
                return h('div', { class: 'flex justify-end gap-1' }, [
                    h(
                        Button,
                        {
                            variant: 'ghost',
                            size: 'icon',
                            class: [
                                'h-8 w-8',
                                mark.synced
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                    : 'text-muted-foreground hover:text-primary',
                            ],
                            style: { touchAction: 'manipulation' },
                            title: mark.synced ? t('marks.tooltips.markAsUnsynced') : t('marks.tooltips.markAsSynced'),
                            onClick: () => emit('toggle-synced', mark),
                        },
                        () => h(CircleCheckBig, { class: 'w-4 h-4' }),
                    ),
                    h(
                        Button,
                        {
                            variant: 'ghost',
                            size: 'icon',
                            class: 'h-8 w-8 text-muted-foreground hover:text-destructive',
                            title: t('marks.tooltips.delete'),
                            onClick: () => emit('delete-mark', mark),
                        },
                        () => h(Trash2, { class: 'w-4 h-4' }),
                    ),
                ])
            },
        },
    ]
}
