import type { EnrichedGroup } from '@Groups/types/groups'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { COMPLETION_THRESHOLDS, MARK_THRESHOLDS } from '@Groups/constants/groups.constants'
import { PieChart, Star } from 'lucide-vue-next'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

function completionClass(v: number): string {
    if (v >= COMPLETION_THRESHOLDS.GREAT)
        return 'text-green-500'
    if (v >= COMPLETION_THRESHOLDS.GOOD)
        return 'text-yellow-500'
    if (v > 0)
        return 'text-red-500'
    return ''
}

function markClass(v: number): string {
    if (v >= MARK_THRESHOLDS.GREAT)
        return 'text-green-500'
    if (v >= MARK_THRESHOLDS.GOOD)
        return 'text-yellow-500'
    if (v > 0)
        return 'text-red-500'
    return ''
}

export function createColumns(
    rowActions: (group: EnrichedGroup) => RowActionItem[],
    t: ComposerTranslation,
    getMemberCount: (name: string) => number,
): ColumnDef<EnrichedGroup>[] {
    return [
        {
            id: 'select',
            header: ({ table }) =>
                h(Checkbox, {
                    'modelValue':
                        table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
                    'ariaLabel': t('common.selectAll'),
                    'class': 'translate-y-[2px]',
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    'modelValue': row.getIsSelected(),
                    'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
                    'ariaLabel': t('common.selectRow'),
                    'class': 'translate-y-[2px]',
                }),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            meta: { label: t('groups.table.name') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('groups.table.name') }),
            cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('name')),
        },
        {
            accessorKey: 'course',
            meta: { label: t('groups.table.course') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('groups.table.course') }),
            cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.getValue('course') ?? '-'),
        },
        {
            accessorKey: 'meetId',
            meta: { label: t('groups.table.meetId') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('groups.table.meetId') }),
            cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.getValue('meetId')),
        },
        {
            id: 'members',
            accessorFn: row => getMemberCount(row.name),
            meta: { label: t('groups.table.members') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('groups.table.members') }),
            cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, getMemberCount(row.original.name)),
        },
        {
            accessorKey: 'teacher',
            meta: { label: t('groups.table.teacher') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('groups.table.teacher') }),
            cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.getValue('teacher') ?? '-'),
        },
        {
            id: 'completion',
            accessorKey: 'avgTaskCompletion',
            meta: { label: t('groups.table.avgCompletion') },
            header: ({ column }) =>
                h(
                    'div',
                    {
                        class: 'flex items-center justify-center gap-1',
                        title: t('groups.table.avgCompletion'),
                    },
                    [
                        h(DataTableColumnHeader, { column, title: t('groups.table.avg') }),
                        h(PieChart, { class: 'w-3 h-3' }),
                    ],
                ),
            cell: ({ row }) => {
                const v = row.original.avgTaskCompletion
                return h('div', { class: ['text-center', completionClass(v)] }, v ? `${Math.round(v)}%` : '-')
            },
        },
        {
            id: 'avgMark',
            accessorKey: 'avgMark',
            meta: { label: t('groups.table.avgMark') },
            header: ({ column }) =>
                h(
                    'div',
                    {
                        class: 'flex items-center justify-center gap-1',
                        title: t('groups.table.avgMark'),
                    },
                    [h(DataTableColumnHeader, { column, title: t('groups.table.avg') }), h(Star, { class: 'w-3 h-3' })],
                ),
            cell: ({ row }) => {
                const v = row.original.avgMark
                return h('div', { class: ['text-center', markClass(v)] }, v ? v.toFixed(2) : '-')
            },
        },
        {
            id: 'modeMark',
            accessorKey: 'modeMark',
            meta: { label: t('groups.table.modeMark') },
            header: ({ column }) =>
                h(
                    'div',
                    {
                        class: 'flex items-center justify-center gap-1',
                        title: t('groups.table.modeMark'),
                    },
                    [h(DataTableColumnHeader, { column, title: t('groups.table.mode') }), h(Star, { class: 'w-3 h-3' })],
                ),
            cell: ({ row }) => h('div', { class: 'text-center text-muted-foreground' }, row.original.modeMark || '-'),
        },
        {
            id: 'medianMark',
            accessorKey: 'medianMark',
            meta: { label: t('groups.table.medianMark') },
            header: ({ column }) =>
                h(
                    'div',
                    {
                        class: 'flex items-center justify-center gap-1',
                        title: t('groups.table.medianMark'),
                    },
                    [
                        h(DataTableColumnHeader, { column, title: t('groups.table.median') }),
                        h(Star, { class: 'w-3 h-3' }),
                    ],
                ),
            cell: ({ row }) => h('div', { class: 'text-center text-muted-foreground' }, row.original.medianMark || '-'),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) =>
                h('div', { class: 'flex justify-end' }, h(DataTableRowActions, { items: rowActions(row.original) })),
        },
    ]
}
