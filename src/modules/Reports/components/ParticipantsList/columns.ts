import type { Participant } from '@Analytics/types/analytics'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'

export function createColumns(
    t: (key: string) => string,
    getScoreColor: (score: number) => string,
    formatDuration: (d: number) => string,
    getAttendancePercentage: (d: number) => number,
): ColumnDef<Participant>[] {
    return [
        {
            accessorKey: 'name',
            meta: { label: t('reports.session.columns.name') },
            sortingFn: (a, b) =>
                (a.getValue('name') as string).localeCompare(b.getValue('name') as string, undefined, {
                    sensitivity: 'base',
                }),
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.session.columns.name') }),
            cell: ({ row }) => h('span', { class: 'font-medium whitespace-nowrap' }, row.getValue('name') as string),
        },
        {
            accessorKey: 'email',
            meta: { label: t('reports.session.columns.email') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('reports.session.columns.email') }),
            cell: ({ row }) => row.getValue('email') || '-',
        },
        {
            accessorKey: 'duration',
            meta: { label: t('reports.session.columns.duration') },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: t('reports.session.columns.duration'),
                    class: 'justify-end',
                }),
            cell: ({ row }) =>
                h('div', { class: 'text-right whitespace-nowrap' }, formatDuration(row.getValue('duration') as number)),
        },
        {
            id: 'attendance',
            meta: { label: t('reports.session.columns.attendance') },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: t('reports.session.columns.attendance'),
                    class: 'justify-end',
                }),
            accessorFn: row => getAttendancePercentage(row.duration),
            cell: ({ row }) => {
                const percentage = row.getValue('attendance') as number
                return h('div', { class: 'text-right' }, [
                    h(
                        Badge,
                        {
                            variant: 'outline',
                            class: getScoreColor(percentage),
                        },
                        () => `${percentage}%`,
                    ),
                ])
            },
        },
        {
            accessorKey: 'joinTime',
            meta: { label: t('reports.session.columns.joinTime') },
            header: ({ column }) =>
                h(DataTableColumnHeader, {
                    column,
                    title: t('reports.session.columns.joinTime'),
                    class: 'justify-end',
                }),
            cell: ({ row }) => {
                const joinTime = row.getValue('joinTime') as string
                return h('div', { class: 'text-right whitespace-nowrap' }, joinTime?.split(' ')?.[1] || '-')
            },
        },
    ]
}
