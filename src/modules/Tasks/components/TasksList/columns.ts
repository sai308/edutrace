import type { ColumnDef } from '@tanstack/vue-table'
import type { Task } from '@Tasks/types/tasks'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { Calendar } from 'lucide-vue-next'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

interface Formatters {
    formatDate: (date: string | null | undefined) => string
}

export function createColumns(
    rowActions: (task: Task) => RowActionItem[],
    t: ComposerTranslation,
    formatters: Formatters,
): ColumnDef<Task>[] {
    return [
        {
            id: 'select',
            header: ({ table }) =>
                h(Checkbox, {
                    modelValue:
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                        table.toggleAllPageRowsSelected(!!value),
                    ariaLabel: t('common.selectAll'),
                    class: 'translate-y-[2px]',
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    modelValue: row.getIsSelected(),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                        row.toggleSelected(!!value),
                    ariaLabel: t('common.selectRow'),
                    class: 'translate-y-[2px]',
                }),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            meta: { label: t('tasks.columns.name') },
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('tasks.columns.name') }),
            cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('name')),
        },
        {
            accessorKey: 'date',
            meta: { label: t('tasks.columns.date') },
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('tasks.columns.date') }),
            cell: ({ row }) =>
                h('div', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, [
                    h(Calendar, { class: 'w-3 h-3 shrink-0' }),
                    h('span', formatters.formatDate(row.getValue('date') as string | undefined)),
                ]),
        },
        {
            accessorKey: 'maxPoints',
            meta: { label: t('tasks.columns.maxPoints') },
            header: ({ column }) =>
                h(DataTableColumnHeader, { column, title: t('tasks.columns.maxPoints') }),
            cell: ({ row }) => row.getValue('maxPoints') ?? '0',
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
