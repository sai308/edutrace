import type { Module, StudentSummaryData } from '@Summary/types/summary'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ComposerTranslation } from 'vue-i18n'
import type { RowActionItem } from '@/shared/types/table'
import {
    BadgeCheck,
    Calendar,
    ClipboardList,
    Clock,
    FileCheck,
    PenLine,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-vue-next'
import { h } from 'vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import DataTableColumnHeader from '@/shared/components/DataTableColumnHeader.vue'
import DataTableRowActions from '@/shared/components/DataTableRowActions.vue'

interface Formatters {
    formatDate: (date: string | Date) => string
    formatTime: (date: string | Date) => string
}

export function createSummaryColumns(
    modules: Module[],
    onStudentClick: (student: StudentSummaryData) => void,
    rowActions: (student: StudentSummaryData) => RowActionItem[],
    ordinalMap: Map<string, number>,
    formatters: Formatters,
    t: ComposerTranslation
): ColumnDef<StudentSummaryData>[] {
    const cols: ColumnDef<StudentSummaryData>[] = []

    // 0: Ordinal Number (#)
    cols.push({
        id: 'ordinal',
        enableSorting: false,
        enableHiding: false,
        header: () => h('div', { class: 'text-center w-full' }, '#'),
        cell: ({ row }) => {
            const n = ordinalMap.get(row.original.id)
            return h(
                'div',
                { class: 'text-center tabular-nums text-muted-foreground text-xs font-mono' },
                n != null ? String(n) : ''
            )
        },
    })

    // 1: Student
    cols.push({
        accessorKey: 'name',
        meta: { label: t('summary.student') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.student') }),
        cell: ({ row }) =>
            h(
                'button',
                {
                    class: 'font-medium hover:text-primary transition-colors text-left cursor-pointer border-b border-dotted border-transparent hover:border-current pb-0.5',
                    onClick: () => onStudentClick(row.original),
                },
                row.original.name
            ),
        enableSorting: true,
        enableHiding: false,
        filterFn: 'includesString',
    })

    const renderGradeTooltipContent = (gradeDetails: any) => {
        if (!gradeDetails) return null

        if (gradeDetails.type === 'empty') {
            return h('div', { class: 'text-sm text-muted-foreground' }, gradeDetails.text)
        }

        const nodes = []
        if (gradeDetails.metrics && gradeDetails.metrics.length > 0) {
            nodes.push(
                h(
                    'div',
                    { class: 'flex items-center flex-wrap gap-4 py-0.5' },
                    gradeDetails.metrics.map((m: any) => {
                        if (m.type === 'tasks') {
                            return h(
                                'div',
                                { class: 'flex items-center gap-1.5 text-sm font-medium' },
                                [
                                    h(ClipboardList, { class: 'w-4 h-4 text-muted-foreground' }),
                                    h('span', `${m.avg}`),
                                    h(
                                        'span',
                                        { class: 'text-muted-foreground font-normal ml-0.5' },
                                        `(${m.completed}/${m.total})`
                                    ),
                                    m.coeff !== 1
                                        ? h(
                                              'span',
                                              {
                                                  class: 'text-muted-foreground text-xs font-normal opacity-70 ml-0.5',
                                              },
                                              `×${m.coeff}`
                                          )
                                        : null,
                                ].filter(Boolean)
                            )
                        } else if (m.type === 'test') {
                            return h(
                                'div',
                                { class: 'flex items-center gap-1.5 text-sm font-medium' },
                                [
                                    h(FileCheck, { class: 'w-4 h-4 text-muted-foreground' }),
                                    h('span', `${m.val}`),
                                    m.coeff !== 1
                                        ? h(
                                              'span',
                                              {
                                                  class: 'text-muted-foreground text-xs font-normal opacity-70 ml-0.5',
                                              },
                                              `×${m.coeff}`
                                          )
                                        : null,
                                ].filter(Boolean)
                            )
                        }
                        return null
                    })
                )
            )
        }

        if (gradeDetails.missingTest || (gradeDetails.missingTasks && gradeDetails.missingTasks.length > 0)) {
            if (nodes.length > 0) {
                nodes.push(h('div', { class: 'my-2 border-t border-border' }))
            }

            const missingLabel = gradeDetails.missingLabel || t('summary.missingItems')
            nodes.push(h('div', { class: 'text-xs font-semibold text-rose-500 mb-1.5' }, missingLabel))

            const listItems = []
            if (gradeDetails.missingTest) {
                listItems.push(h('li', { class: 'text-xs text-muted-foreground' }, `• ${gradeDetails.missingTest}`))
            }
            if (gradeDetails.missingTasks) {
                gradeDetails.missingTasks.forEach((task: string) => {
                    listItems.push(
                        h(
                            'li',
                            {
                                class: 'text-xs text-muted-foreground line-clamp-1 truncate',
                                title: task,
                            },
                            `• ${task}`
                        )
                    )
                })
            }

            nodes.push(h('ul', { class: 'space-y-1' }, listItems))
        }

        return h('div', { class: 'flex flex-col' }, nodes)
    }

    // 2...(N-5): Dynamic Modules
    modules.forEach((mod) => {
        cols.push({
            id: `module_${mod.id}`,
            accessorFn: (row) => row.moduleGrades?.[mod.name],
            meta: { label: mod.name },
            header: ({ column }) => h(DataTableColumnHeader, { column, title: mod.name }),
            cell: ({ row }) => {
                const gradeStr = row.original.moduleGrades?.[mod.name]
                const gradeDetails = row.original.moduleDetails?.[mod.name]

                if (
                    gradeStr === null ||
                    gradeStr === undefined ||
                    gradeStr === '-' ||
                    (typeof gradeStr === 'string' && gradeStr.trim() === '')
                ) {
                    const emptyNode = h('span', { class: 'text-muted-foreground/50 mx-4' }, '-')
                    if (gradeDetails) {
                        return h(TooltipProvider, {}, () =>
                            h(Tooltip, { delayDuration: 200 }, () => [
                                h(TooltipTrigger, { asChild: true }, () =>
                                    h(
                                        'div',
                                        {
                                            class: 'cursor-help w-max hover:bg-muted/50 rounded flex items-center justify-center p-1 -m-1',
                                        },
                                        emptyNode
                                    )
                                ),
                                h(TooltipContent, { class: 'w-[280px] p-3 shadow-md' }, () =>
                                    renderGradeTooltipContent(gradeDetails)
                                ),
                            ])
                        )
                    }
                    return emptyNode
                }

                const isPartial = typeof gradeStr === 'string' && gradeStr.includes('~')
                const cleanGrade = typeof gradeStr === 'string' ? gradeStr.replace('~', '') : gradeStr

                const valueNode = h(
                    'span',
                    {
                        class: ['font-medium mx-4', isPartial ? 'text-amber-500' : ''],
                    },
                    String(cleanGrade)
                )

                if (gradeDetails) {
                    return h(TooltipProvider, {}, () =>
                        h(Tooltip, { delayDuration: 200 }, () => [
                            h(TooltipTrigger, { asChild: true }, () =>
                                h(
                                    'div',
                                    {
                                        class: 'cursor-help w-max hover:bg-muted/50 rounded flex items-center justify-center p-1 -m-1',
                                    },
                                    valueNode
                                )
                            ),
                            h(TooltipContent, { class: 'w-[280px] p-3 shadow-md' }, () =>
                                renderGradeTooltipContent(gradeDetails)
                            ),
                        ])
                    )
                }

                return valueNode
            },
            enableSorting: true,
        })
    })

    // N-5: Total
    cols.push({
        accessorKey: 'total',
        meta: { label: t('summary.total') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.total') }),
        cell: ({ row }) => {
            const totalStr = row.original.total

            if (totalStr === null || totalStr === undefined)
                return h('span', { class: 'text-muted-foreground/50 mx-4' }, '-')

            const isPartial = typeof totalStr === 'string' && totalStr.includes('~')
            const cleanTotal = typeof totalStr === 'string' ? totalStr.replace('~', '') : totalStr
            const parsed = Number(cleanTotal)
            const displayTotal = !isNaN(parsed) && cleanTotal !== '' ? Math.round(parsed).toString() : cleanTotal

            return h(
                'span',
                {
                    class: [
                        isPartial ? 'italic' : 'font-bold',
                        'mx-4',
                        isPartial ? 'text-gray-500' : 'text-foreground',
                    ],
                },
                String(displayTotal)
            )
        },
        enableSorting: true,
    })

    // N-4: Completion %
    cols.push({
        accessorKey: 'completionPercent',
        meta: { label: t('summary.completion') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.completion') }),
        cell: ({ row }) => {
            const val = row.original.completionPercent
            const details = row.original.completionDetails
            const str = `${Math.round(val)}%`
            const colorClass = val === 100 ? 'text-emerald-500' : val >= 70 ? 'text-emerald-500/80' : 'text-rose-500'

            return h(TooltipProvider, {}, () =>
                h(Tooltip, { delayDuration: 200 }, () => [
                    h(TooltipTrigger, { asChild: true }, () =>
                        h('span', { class: `${colorClass} font-medium text-xs ml-4 cursor-help` }, str)
                    ),
                    h(TooltipContent, { class: 'text-xs' }, () => details),
                ])
            )
        },
        enableSorting: true,
    })

    // N-3: Average attendance %
    cols.push({
        accessorKey: 'averageAttendancePercent',
        meta: { label: t('summary.attendance') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.attendance') }),
        cell: ({ row }) => {
            const val = row.original.averageAttendancePercent
            const details = row.original.attendanceDetails
            const str = `${Math.round(val)}%`
            const colorClass = val >= 60 ? 'text-emerald-500/80' : 'text-rose-500'

            return h(TooltipProvider, {}, () =>
                h(Tooltip, { delayDuration: 200 }, () => [
                    h(TooltipTrigger, { asChild: true }, () =>
                        h('span', { class: `${colorClass} font-medium text-xs mx-4 cursor-help` }, str)
                    ),
                    h(TooltipContent, { class: 'text-xs' }, () => details),
                ])
            )
        },
        enableSorting: true,
    })

    // N-2: Status
    cols.push({
        accessorKey: 'status',
        meta: { label: t('summary.status') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.status') }),
        cell: ({ row }) => {
            const status = row.original.status
            const cause = row.original.statusCause

            let icon = ShieldAlert
            let iconClass = 'text-rose-500 mr-1.5 h-3.5 w-3.5'
            let textClass = 'text-rose-500'
            let label = t('summary.notAllowed')

            if (status === 'automatic') {
                icon = BadgeCheck
                iconClass = 'text-blue-500 mr-1.5 h-3.5 w-3.5'
                textClass = 'text-blue-500'
                label = t('summary.automatic')
            } else if (status === 'allowed') {
                icon = ShieldCheck
                iconClass = 'text-emerald-500 mr-1.5 h-3.5 w-3.5'
                textClass = 'text-emerald-500'
                label = t('summary.allowed')
            }

            // Override with Manual if a manual grade is set
            const hasGrade =
                row.original.examGrade !== null && row.original.examGrade !== undefined && row.original.examGrade !== ''
            if (hasGrade && !row.original.examIsAuto) {
                icon = PenLine
                iconClass = 'text-amber-500 mr-1.5 h-3.5 w-3.5'
                textClass = 'text-amber-500'
                label = t('summary.manual')
            }

            const badgeNode = h('div', { class: `flex items-center text-xs ml-4 ${textClass}` }, [
                h(icon, { class: iconClass }),
                label,
            ])

            return h(TooltipProvider, {}, () =>
                h(Tooltip, { delayDuration: 200 }, () => [
                    h(TooltipTrigger, { asChild: true }, () => h('div', { class: 'cursor-help w-max' }, badgeNode)),
                    h(TooltipContent, { class: 'text-xs max-w-[200px]' }, () => cause),
                ])
            )
        },
        enableSorting: true,
    })

    // N-1: Credit Grade (Final grade)
    cols.push({
        accessorKey: 'examGrade',
        meta: { label: t('summary.creditGrade') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.creditGrade') }),
        cell: ({ row }) => {
            const grade = row.original.examGrade
            const hasGrade = grade !== null && grade !== undefined && grade !== ''
            const isUnsaved = hasGrade && !row.original.completedAt

            return h('span', { class: 'font-bold flex items-center gap-1 mx-4' }, [
                hasGrade ? grade : '-',
                isUnsaved ? h('div', { class: 'w-2 h-2 rounded-full bg-amber-500' }) : null,
            ])
        },
        enableSorting: true,
    })

    // N: Date saved
    cols.push({
        accessorKey: 'completedAt',
        meta: { label: t('summary.date') },
        header: ({ column }) => h(DataTableColumnHeader, { column, title: t('summary.date') }),
        cell: ({ row }) => {
            const dateStr = row.original.completedAt
            if (!dateStr) return h('span', { class: 'text-muted-foreground/50 mx-4' }, '-')
            return h('div', { class: 'text-xs text-muted-foreground mx-4' }, [
                h('div', { class: 'flex flex-col gap-1' }, [
                    h('div', { class: 'flex items-center gap-1' }, [
                        h(Calendar, { class: 'w-3 h-3' }),
                        h('span', formatters.formatDate(dateStr)),
                    ]),
                    h('div', { class: 'flex items-center gap-1 text-[10px] opacity-80' }, [
                        h(Clock, { class: 'w-3 h-3' }),
                        h('span', formatters.formatTime(dateStr)),
                    ]),
                ]),
            ])
        },
        enableSorting: true,
    })

    // Last: Row actions
    cols.push({
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) =>
            h('div', { class: 'flex justify-end' }, h(DataTableRowActions, { items: rowActions(row.original) })),
    })

    return cols
}
