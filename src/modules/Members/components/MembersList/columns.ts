import type { Member } from '@Students/types/students'
import type { ColumnDef } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

type RoleBadgeVariant = 'default' | 'secondary' | 'outline'

function compactName(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length < 2)
        return name
    return `${parts[0]} ${parts[1]![0]!.toUpperCase()}.`
}

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
    isCompact: Ref<boolean>,
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
            sortingFn: (a, b) =>
                (a.getValue('name') as string).localeCompare(b.getValue('name') as string, undefined, {
                    sensitivity: 'base',
                }),
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('members.columns.name') }),
            cell: ({ row }) => {
                const name = row.getValue('name') as string
                const display = isCompact.value ? compactName(name) : name
                return h('div', { class: 'font-medium truncate', title: name }, display)
            },
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
