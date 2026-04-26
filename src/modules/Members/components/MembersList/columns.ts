import type { Member } from '@Students/types/students'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

type RoleBadgeVariant = 'default' | 'secondary' | 'outline'

function getRoleBadgeVariant(role: Member['role']): RoleBadgeVariant {
    if (role === 'teacher')
        return 'default'
    if (role === 'assistant')
        return 'outline'
    return 'secondary'
}

export function createColumns(
    rowActions: (member: Member) => RowActionItem[],
    t: ComposerTranslation,
): ColumnDef<Member>[] {
    return [
        {
            id: 'select',
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) =>
                h(Checkbox, {
                    'modelValue':
                        table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                        table.toggleAllPageRowsSelected(!!value),
                    'ariaLabel': t('common.selectAll'),
                }),
            cell: ({ row }) =>
                h(Checkbox, {
                    'modelValue': row.getIsSelected(),
                    'disabled': !row.getCanSelect(),
                    'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
                    'ariaLabel': t('common.selectRow'),
                }),
        },
        {
            accessorKey: 'name',
            meta: { label: t('members.columns.name') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.name') }),
            cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('name')),
        },
        {
            accessorKey: 'email',
            meta: { label: t('members.columns.email') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.email') }),
            cell: ({ row }) => row.getValue('email') || '-',
        },
        {
            accessorKey: 'role',
            meta: { label: t('members.columns.role') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.role') }),
            cell: ({ row }) => {
                const role = row.getValue('role') as Member['role']
                const variant = getRoleBadgeVariant(role)
                const label = t(`members.dialog.role${role.charAt(0).toUpperCase() + role.slice(1)}`)
                return h(Badge, { variant }, () => label)
            },
        },
        {
            accessorKey: 'status',
            meta: { label: t('members.columns.status') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.status') }),
            cell: ({ row }) => {
                const isHidden = row.original.hidden
                return h(
                    Badge,
                    {
                        variant: isHidden ? 'destructive' : 'default',
                        class: isHidden ? 'opacity-70' : '',
                    },
                    () => (isHidden ? t('common.deleted') : t('common.active')),
                )
            },
        },
        {
            accessorKey: 'groupName',
            meta: { label: t('members.columns.group') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.group') }),
            cell: ({ row }) => row.getValue('groupName') || '-',
        },
        {
            accessorKey: 'iep',
            meta: { label: t('members.columns.iep') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.iep') }),
            cell: ({ row }) => row.getValue('iep') || '-',
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) =>
                h('div', { class: 'flex justify-end' }, h(DataTableRowActions, { items: rowActions(row.original) })),
        },
    ]
}
