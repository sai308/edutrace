import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { SessionEntry } from '../../models/session.model'
import { Calendar, Clock, PenTool, UserX, Wand2 } from 'lucide-vue-next'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import { getECTSColorClass, toECTS } from '@/shared/utils/grades'
import { GradeTypeEnum } from '../../models/session.model'

interface Formatters {
    formatDate: (d: string | null | undefined) => string
    formatTime: (d: string | null | undefined) => string
    formatSurname: (name: string | null | undefined) => string
}

export function createColumns(
    t: ComposerTranslation,
    { formatDate, formatTime, formatSurname }: Formatters,
    ordinalMap: Map<string, number>,
): ColumnDef<SessionEntry>[] {
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
            id: 'ordinal',
            enableSorting: false,
            enableHiding: false,
            header: () => h('div', { class: 'text-center w-full' }, '#'),
            cell: ({ row }) => {
                const n = ordinalMap.get(row.original.studentId)
                return h(
                    'div',
                    { class: 'text-center tabular-nums text-muted-foreground text-xs font-mono' },
                    n != null ? String(n) : '',
                )
            },
        },
        {
            id: 'student',
            accessorFn: row => row.studentSnapshot.fullName,
            meta: { label: t('sessions.table.student') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.student') }),
            cell: ({ row }) => {
                const fullName = row.original.studentSnapshot.fullName
                const isAbsent = row.original.grade === null
                return h('div', { class: ['font-medium', isAbsent ? 'opacity-60 text-muted-foreground' : ''] }, [
                    h('span', { class: 'hidden sm:block truncate' }, fullName),
                    h('span', { class: 'block sm:hidden truncate', title: fullName }, formatSurname(fullName)),
                ])
            },
        },
        {
            id: 'gradeType',
            accessorFn: row => row.gradeType,
            meta: { label: t('sessions.table.gradeType') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.gradeType') }),
            cell: ({ row }) => {
                const { grade, gradeType } = row.original
                const tooltip
                    = grade === null
                        ? t('sessions.grades.absentTooltip')
                        : gradeType === GradeTypeEnum.AUTO
                            ? t('sessions.grades.auto')
                            : t('sessions.grades.manual')

                return h(
                    Badge,
                    {
                        variant: 'outline',
                        class: 'w-8 h-8 p-0 flex items-center justify-center cursor-help',
                        title: tooltip,
                    },
                    () => [
                        grade === null
                            ? h(UserX, { class: 'w-4 h-4 text-muted-foreground opacity-70' })
                            : gradeType === GradeTypeEnum.AUTO
                                ? h(Wand2, { class: 'w-4 h-4 text-purple-500' })
                                : h(PenTool, { class: 'w-4 h-4 text-emerald-600' }),
                    ],
                )
            },
        },
        {
            id: 'nationalScale',
            accessorFn: row => row.grade,
            meta: { label: t('sessions.table.nationalScale') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.nationalScale') }),
            cell: ({ row }) => {
                const grade = row.original.grade
                const label = toNationalScale(grade, t)
                return h(
                    'span',
                    {
                        class: ['font-medium', grade === null ? 'italic font-normal text-muted-foreground' : ''],
                    },
                    label,
                )
            },
        },
        {
            id: 'score',
            accessorFn: row => row.grade,
            meta: { label: t('sessions.table.score') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.score') }),
            cell: ({ row }) => {
                const grade = row.original.grade
                return grade !== null
                    ? h('span', String(grade))
                    : h('span', { class: 'text-muted-foreground italic' }, t('sessions.grades.noGrade'))
            },
        },
        {
            id: 'ectsScale',
            accessorFn: row => row.grade,
            meta: { label: t('sessions.table.ectsScale') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.ectsScale') }),
            cell: ({ row }) => {
                const grade = row.original.grade
                if (grade === null)
                    return null
                const ects = toECTS(grade)
                return h(
                    'span',
                    {
                        class: ['font-mono bg-muted px-2 py-1 rounded text-sm', getECTSColorClass(ects)],
                    },
                    ects,
                )
            },
        },
        {
            id: 'lastUpdate',
            accessorFn: row => row.updatedAt,
            meta: { label: t('sessions.table.lastUpdate') },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: t('sessions.table.lastUpdate') }),
            cell: ({ row }) => {
                const updatedAt = row.original.updatedAt
                return h('div', { class: 'flex flex-col items-end gap-1' }, [
                    h('div', { class: 'flex items-center gap-1 text-xs text-muted-foreground' }, [
                        h(Calendar, { class: 'w-3 h-3' }),
                        h('span', formatDate(updatedAt)),
                    ]),
                    h('div', { class: 'flex items-center gap-1 text-[10px] text-muted-foreground/80' }, [
                        h(Clock, { class: 'w-3 h-3' }),
                        h('span', formatTime(updatedAt)),
                    ]),
                ])
            },
        },
    ]
}

function toNationalScale(grade: number | null, t: ComposerTranslation): string {
    if (grade === null)
        return t('sessions.grades.absent')
    if (grade >= 90)
        return t('sessions.grades.excellent')
    if (grade >= 75)
        return t('sessions.grades.good')
    if (grade >= 60)
        return t('sessions.grades.satisfactory')
    return t('sessions.grades.unsatisfactory')
}
