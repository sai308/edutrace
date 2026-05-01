import type { DetailedMatrixRow } from '@Analytics/types/analytics'
import type { ColumnDef } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { ComposerTranslation } from 'vue-i18n'
import { ATTENDANCE_BADGE_THRESHOLDS } from '@Analytics/constants/analytics.constants'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'

interface Formatters {
    formatDate: (d: string | null | undefined) => string
    formatSurname: (name: string | null | undefined) => string
}

function getPercentageClass(pct: number): string {
    if (pct >= ATTENDANCE_BADGE_THRESHOLDS.GREAT)
        return 'text-green-500'
    if (pct >= ATTENDANCE_BADGE_THRESHOLDS.GOOD)
        return 'text-amber-500'
    return 'text-red-500'
}

export function createColumns(
    t: ComposerTranslation,
    dates: string[],
    { formatDate }: Formatters,
    isCompact: Ref<boolean>,
): ColumnDef<DetailedMatrixRow>[] {
    const dateColumns: ColumnDef<DetailedMatrixRow>[] = dates.map(date => ({
        id: date,
        accessorFn: row => row[date]?.percentage ?? null,
        meta: { label: formatDate(date) },
        header: ({ column }) =>
            h(DataTableColumnHeader, {
                column,
                title: formatDate(date),
                class: 'whitespace-nowrap text-xs font-normal',
            }),
        cell: ({ row }) => {
            const cell = row.original[date]
            if (!cell)
                return h('div', { class: 'text-center text-muted-foreground opacity-30' }, '-')
            return h('div', { class: 'flex items-center justify-center' }, [
                h(
                    'div',
                    {
                        class: ['px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium inline-block', cell.status],
                    },
                    `${cell.percentage}%`,
                ),
            ])
        },
        enableSorting: false,
    }))

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
            id: 'name',
            accessorKey: 'name',
            meta: { label: t('analytics.details.table.student') },
            sortingFn: (a, b) =>
                (a.getValue('name') as string).localeCompare(b.getValue('name') as string, undefined, {
                    sensitivity: 'base',
                }),
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('analytics.details.table.student') }),
            cell: ({ row }) => {
                const name = row.original.name
                const display = isCompact.value ? (name.split(/\s+/)[0] ?? name) : name
                return h('div', { class: 'font-medium text-xs sm:text-sm truncate', title: name }, display)
            },
        },
        ...dateColumns,
        {
            id: 'totalPercentage',
            accessorKey: 'totalPercentage',
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('analytics.details.table.total') }),
            cell: ({ row }) => {
                const pct = row.original.totalPercentage
                return h('div', { class: 'flex items-center justify-center' }, [
                    h(
                        'div',
                        {
                            class: [
                                'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs sm:text-sm font-bold',
                                getPercentageClass(pct),
                            ],
                        },
                        `${pct}%`,
                    ),
                ])
            },
            enableHiding: false,
        },
    ]
}
