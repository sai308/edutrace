import type { ColumnDef } from '@tanstack/vue-table'
import type { Unit } from '@Units/types/units'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

export function createColumns(rowActions: (unit: Unit) => RowActionItem[], t: ComposerTranslation): ColumnDef<Unit>[] {
    return [
        {
            id: 'select',
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
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            meta: { label: t('modules.columns.name') },
            header: t('modules.columns.name'),
            cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('name')),
        },
        {
            accessorKey: 'taskIds',
            meta: { label: t('modules.columns.tasksCount') },
            header: t('modules.columns.tasksCount'),
            cell: ({ row }) => {
                const taskIds = row.getValue('taskIds') as string[]
                return h('div', { class: 'text-muted-foreground' }, taskIds ? taskIds.length : 0)
            },
        },
        {
            accessorKey: 'testTaskId',
            meta: { label: t('modules.columns.hasTest') },
            header: t('modules.columns.hasTest'),
            cell: ({ row }) => {
                const testTaskId = row.getValue('testTaskId') as string | null
                return h('div', {}, testTaskId ? t('modules.columns.yes') : t('modules.columns.no'))
            },
        },
        {
            accessorKey: 'taskCoef',
            meta: { label: t('modules.columns.taskCoef') },
            header: t('modules.columns.taskCoef'),
            cell: ({ row }) => h('div', {}, row.getValue('taskCoef')),
        },
        {
            accessorKey: 'testCoef',
            meta: { label: t('modules.columns.testCoef') },
            header: t('modules.columns.testCoef'),
            cell: ({ row }) => h('div', {}, row.getValue('testCoef')),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) =>
                h('div', { class: 'flex justify-end' }, h(DataTableRowActions, { items: rowActions(row.original) })),
        },
    ]
}
