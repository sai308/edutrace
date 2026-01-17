import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { Meet } from '@/modules/Analytics/types/analytics'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Eye, Trash2, Calendar, Clock, Link as LinkIcon } from 'lucide-vue-next'
import DataTableColumnHeader from '@/components/DataTableColumnHeader.vue'

export const createColumns = (emit: any): ColumnDef<Meet>[] => [
    {
        id: 'select',
        header: ({ table }) => h(Checkbox, {
            'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
            'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
            'ariaLabel': 'Select all',
        }),
        cell: ({ row }) => h(Checkbox, {
            'modelValue': row.getIsSelected(),
            'onUpdate:modelValue': value => row.toggleSelected(!!value),
            'ariaLabel': 'Select row',
        }),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'groupName',
        header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Group' }),
        cell: ({ row }) => row.getValue('groupName') || h('span', { class: 'text-muted-foreground' }, '-'),
    },
    {
        accessorKey: 'meetId',
        header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Meet ID' }),
        cell: ({ row }) => h('div', { class: 'flex items-center gap-2 font-mono text-xs uppercase' }, [
            h(LinkIcon, { class: 'h-3 w-3 text-muted-foreground' }),
            h('span', row.getValue('meetId') as string)
        ]),
    },
    {
        accessorKey: 'date',
        header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Date' }),
        cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
            h(Calendar, { class: 'h-3 w-3 text-muted-foreground' }),
            h('span', new Date(row.getValue('date')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
        ]),
    },
    {
        id: 'participants',
        header: 'Participants',
        accessorFn: (row) => row.participants?.length || 0,
    },
    {
        id: 'duration',
        header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Duration' }),
        accessorFn: (row) => {
            return row.participants?.length
                ? Math.max(...row.participants.map(p => p.duration))
                : 0
        },
        cell: ({ row }) => {
            const seconds = row.getValue('duration') as number
            const m = Math.floor(seconds / 60)
            const h_val = Math.floor(seconds / 3600)
            const label = h_val > 0 ? `${h_val}h ${m % 60}m` : `${m}m`
            return h('div', { class: 'flex items-center gap-2 text-muted-foreground' }, [
                h(Clock, { class: 'h-3 w-3' }),
                h('span', { class: 'text-foreground' }, label)
            ])
        }
    },
    {
        accessorKey: 'uploadedAt',
        header: ({ column }) => h(DataTableColumnHeader, { column, title: 'Uploaded at' }),
        cell: ({ row }) => {
            const isoStr = row.getValue('uploadedAt') as string
            if (!isoStr) return h('span', { class: 'text-muted-foreground' }, '-')
            const date = new Date(isoStr)
            return h('div', [
                h('div', { class: 'flex items-center gap-1 text-xs' }, [
                    h(Calendar, { class: 'h-3 w-3 text-muted-foreground' }),
                    h('span', date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
                ]),
                h('div', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, [
                    h(Clock, { class: 'h-3 w-3 text-muted-foreground' }),
                    h('span', date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
                ])
            ])
        }
    },
    {
        id: 'actions',
        cell: ({ row }) => h('div', { class: 'flex justify-end gap-2' }, [
            h(Button, {
                variant: 'ghost',
                size: 'icon',
                onClick: () => emit('view-details', row.original.id)
            }, () => h(Eye, { class: 'h-4 w-4 text-muted-foreground group-hover:text-foreground' })),
            h(Button, {
                variant: 'ghost',
                size: 'icon',
                class: 'text-muted-foreground hover:text-destructive',
                onClick: () => emit('delete-meet', row.original.id)
            }, () => h(Trash2, { class: 'h-4 w-4' }))
        ])
    }
]