import type { StudentDashboardStats } from '@Students/types/students'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { h } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

// Inline cell button events — not row menu actions
interface EmitFn {
    (e: 'select-group', group: string): void
    (e: 'open-analytics', meetId: string): void
}

export function createColumns(
    rowActions: (student: StudentDashboardStats) => RowActionItem[],
    emit: EmitFn,
    t: ComposerTranslation,
    getScoreColor: (v: number) => string,
    ordinalMap: Map<string, number>,
): ColumnDef<StudentDashboardStats>[] {
    return [
        {
            id: 'select',
            header: ({ table }) =>
                h(Checkbox, {
                    modelValue:
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (v: boolean | 'indeterminate') =>
                        table.toggleAllPageRowsSelected(!!v),
                    ariaLabel: t('common.selectAll'),
                    class: 'translate-y-[2px]',
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    modelValue: row.getIsSelected(),
                    'onUpdate:modelValue': (v: boolean | 'indeterminate') =>
                        row.toggleSelected(!!v),
                    ariaLabel: t('common.selectRow'),
                    class: 'translate-y-[2px]',
                }),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: 'ordinal',
            header: () => h('div', { class: 'text-center w-full' }, '#'),
            cell: ({ row }) => {
                const n = ordinalMap.get(row.original.id)
                return h(
                    'div',
                    { class: 'text-center tabular-nums text-muted-foreground text-xs font-mono' },
                    n != null ? String(n) : '',
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            meta: { label: t('students.table.name') },
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('students.table.name') }),
            cell: ({ row }) =>
                h(
                    'div',
                    { class: 'font-medium truncate', title: row.getValue('name') as string },
                    row.getValue('name') as string,
                ),
        },
        {
            id: 'groups',
            accessorFn: (row) => row.groups.join(' '),
            meta: { label: t('students.table.groups') },
            filterFn: (row, _id, value: string) => row.original.groups.includes(value),
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('students.table.groups') }),
            cell: ({ row }) => {
                const groups = row.original.groups
                return h(
                    'div',
                    { class: 'flex flex-wrap gap-1 overflow-hidden max-h-8' },
                    groups.map((group) =>
                        h(
                            Button,
                            {
                                key: group,
                                variant: 'secondary',
                                size: 'sm',
                                class: 'h-5 text-[10px] px-1.5 font-medium whitespace-nowrap truncate max-w-[100px]',
                                onClick: (e: MouseEvent) => {
                                    e.stopPropagation()
                                    emit('select-group', group)
                                },
                            },
                            () => group,
                        ),
                    ),
                )
            },
        },
        {
            id: 'meetIds',
            accessorFn: (row) => row.meetIds.join(' '),
            meta: { label: t('students.table.meetIds') },
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('students.table.meetIds') }),
            cell: ({ row }) => {
                const meetIds = row.original.meetIds
                return h(
                    'div',
                    { class: 'flex flex-wrap gap-1 overflow-hidden max-h-8' },
                    meetIds.map((meetId) =>
                        h(
                            Button,
                            {
                                key: meetId,
                                variant: 'outline',
                                size: 'sm',
                                class: 'h-5 text-[10px] px-1.5 truncate max-w-[80px]',
                                onClick: (e: MouseEvent) => {
                                    e.stopPropagation()
                                    emit('open-analytics', meetId)
                                },
                            },
                            () => meetId,
                        ),
                    ),
                )
            },
        },
        {
            id: 'sessions',
            accessorFn: (row) => row.sessionCount,
            meta: { label: t('students.table.sessions') },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: t('students.table.sessions'),
                    class: 'justify-center',
                }),
            cell: ({ row }) =>
                h('div', { class: 'text-center' }, [
                    h('span', { class: 'font-medium' }, row.original.sessionCount),
                    h('span', { class: 'text-muted-foreground' }, `/${row.original.totalSessions}`),
                ]),
        },
        {
            id: 'avgTime',
            accessorFn: (row) => row.averageAttendancePercent,
            meta: { label: `${t('students.table.avg')} %` },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: `${t('students.table.avg')} %`,
                    class: 'justify-center',
                }),
            cell: ({ row }) => {
                const v = row.original.averageAttendancePercent
                return h(
                    'div',
                    { class: ['text-center font-mono', getScoreColor(v)] },
                    `${v.toFixed(1)}%`,
                )
            },
        },
        {
            id: 'totalTime',
            accessorFn: (row) => row.totalAttendancePercent,
            meta: { label: `${t('students.table.total')} %` },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: `${t('students.table.total')} %`,
                    class: 'justify-center',
                }),
            cell: ({ row }) => {
                const v = row.original.totalAttendancePercent
                return h(
                    'div',
                    { class: ['text-center font-mono', getScoreColor(v)] },
                    `${v.toFixed(1)}%`,
                )
            },
        },
        {
            id: 'avgMark',
            accessorFn: (row) => row.averageMark,
            meta: { label: `${t('students.table.avg')} ★` },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: `${t('students.table.avg')} ★`,
                    class: 'justify-center',
                }),
            cell: ({ row }) => {
                const v = row.original.averageMark
                return h(
                    'div',
                    { class: ['text-center font-mono', getScoreColor(v * 20)] },
                    v ? v.toFixed(2) : '—',
                )
            },
        },
        {
            id: 'completion',
            accessorFn: (row) => row.completionPercent,
            meta: { label: `${t('students.table.total')} ✓` },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: `${t('students.table.total')} ✓`,
                    class: 'justify-center',
                }),
            cell: ({ row }) => {
                const v = row.original.completionPercent
                return h(
                    'div',
                    { class: ['text-center font-mono', getScoreColor(v)] },
                    v ? `${v.toFixed(1)}%` : '0%',
                )
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) =>
                h(
                    'div',
                    { class: 'flex justify-end' },
                    h(DataTableRowActions, { items: rowActions(row.original) }),
                ),
        },
    ]
}
