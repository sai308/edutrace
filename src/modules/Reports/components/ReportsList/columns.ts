import type { Meet } from '@Analytics/types/analytics'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { Calendar, Clock, Link as LinkIcon } from 'lucide-vue-next'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

interface Formatters {
    formatDate: (date: string | Date) => string
    formatTime: (date: string | Date) => string
}

export function createColumns(
    rowActions: (meet: Meet) => RowActionItem[],
    t: ComposerTranslation,
    formatters: Formatters
): ColumnDef<Meet>[] {
    return [
        {
            id: 'select',
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) =>
                h(Checkbox, {
                    modelValue:
                        table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                        table.toggleAllPageRowsSelected(!!value),
                    ariaLabel: t('common.selectAll'),
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    modelValue: row.getIsSelected(),
                    disabled: !row.getCanSelect(),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
                    ariaLabel: t('common.selectRow'),
                }),
        },
        {
            accessorKey: 'groupName',
            meta: { label: t('reports.table.group') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.group') }),
            cell: ({ row }) => row.getValue('groupName') || h('span', { class: 'text-muted-foreground' }, '-'),
        },
        {
            accessorKey: 'meetId',
            meta: { label: t('reports.table.meetId') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.meetId') }),
            cell: ({ row }) =>
                h('div', { class: 'flex items-center gap-2 font-mono text-xs' }, [
                    h(LinkIcon, { class: 'h-3 w-3 text-muted-foreground shrink-0' }),
                    h('span', { class: 'truncate' }, row.getValue('meetId') as string),
                ]),
        },
        {
            accessorKey: 'date',
            meta: { label: t('reports.table.date') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.date') }),
            cell: ({ row }) =>
                h('div', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, [
                    h(Calendar, { class: 'w-3 h-3 shrink-0' }),
                    h('span', formatters.formatDate(row.getValue('date') as string)),
                ]),
        },
        {
            id: 'participants',
            accessorFn: (row) => row.participants?.length ?? 0,
            meta: { label: t('reports.table.participants') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.participants') }),
        },
        {
            id: 'duration',
            accessorFn: (row) => (row.participants?.length ? Math.max(...row.participants.map((p) => p.duration)) : 0),
            meta: { label: t('reports.table.duration') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.duration') }),
            cell: ({ row }) => {
                const seconds = row.getValue('duration') as number
                const hVal = Math.floor(seconds / 3600)
                const m = Math.floor(seconds / 60)
                const label = hVal > 0 ? `${hVal}h ${m % 60}m` : `${m}m`
                return h('div', { class: 'flex items-center gap-2' }, [
                    h(Clock, { class: 'h-3 w-3 text-muted-foreground shrink-0' }),
                    h('span', label),
                ])
            },
        },
        {
            accessorKey: 'uploadedAt',
            meta: { label: t('reports.table.uploadedAt') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.table.uploadedAt') }),
            cell: ({ row }) => {
                const isoStr = row.getValue('uploadedAt') as string
                if (!isoStr) return h('span', { class: 'text-muted-foreground' }, '-')
                return h('div', { class: 'text-xs text-muted-foreground' }, [
                    h('div', { class: 'flex flex-col gap-1' }, [
                        h('div', { class: 'flex items-center gap-1' }, [
                            h(Calendar, { class: 'w-3 h-3' }),
                            h('span', formatters.formatDate(isoStr)),
                        ]),
                        h('div', { class: 'flex items-center gap-1 text-[10px] opacity-80' }, [
                            h(Clock, { class: 'w-3 h-3' }),
                            h('span', formatters.formatTime(isoStr)),
                        ]),
                    ]),
                ])
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) =>
                h('div', { class: 'flex justify-end' }, h(DataTableRowActions, { items: rowActions(row.original) })),
        },
    ]
}
