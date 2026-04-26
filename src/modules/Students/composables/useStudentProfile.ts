import type { StudentDashboardStats } from '@Students/types/students'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColors } from '@/shared/composables/useColors'
import { useFormatters } from '@/shared/composables/useFormatters'
import { useMarkFormat } from '@/shared/composables/useMarkFormat'
import { useToast } from '@/shared/services/toast'

export type ProfileView = 'attendance' | 'marks' | 'edit'

export interface ProfileMeet {
    meetId: string
    date: string
    participants: Array<{ name: string; duration: number; joinTime?: string }>
    startTime?: string
    endTime?: string
}

export interface ProfileTask {
    id: string | number
    name: string
    maxPoints?: number
}

export function useStudentProfile(
    student: () => StudentDashboardStats | null | undefined,
    meets: () => ProfileMeet[],
    groupsMap: () => Record<string, { name?: string }>,
    tasks: () => ProfileTask[],
    allStudents: () => Array<{ id: string | number; iep?: string }>,
) {
    const { t } = useI18n()
    const { formatDuration, formatTime } = useFormatters()
    const { formatMarkToFiveScale } = useMarkFormat()
    const { toast } = useToast()
    const { getScoreColor } = useColors()

    // ---- Copy email ----
    const showCopyCheck = ref(false)

    function copyEmail() {
        const email = student()?.email
        if (!email) return
        navigator.clipboard.writeText(email)
        showCopyCheck.value = true
        toast.success(t('toast.emailCopied'))
        setTimeout(() => {
            showCopyCheck.value = false
        }, 2000)
    }

    // ---- Edit form ----
    const formData = ref({ name: '', groupName: '', email: '', iep: '' })

    function resetForm() {
        const s = student()
        if (!s) return
        formData.value = {
            name: s.name ?? '',
            groupName: (s.groups ?? []).join(', '),
            email: s.email ?? '',
            iep: s.iep ?? '',
        }
    }

    watch(
        student,
        (s) => {
            if (s) resetForm()
        },
        { immediate: true },
    )

    function handleSave(emit: (event: 'update:open' | 'save', ...args: unknown[]) => void) {
        const iep = formData.value.iep?.trim()
        if (iep) {
            const isDuplicate = allStudents().some((s) => s.iep === iep && s.id !== student()?.id)
            if (isDuplicate) {
                toast.error(t('students.editModal.iepNotUnique'))
                return
            }
        }
        emit('save', { formData: { ...formData.value }, originalStudent: student() })
    }

    // ---- Helpers ----
    function calculateMeetDuration(meet: ProfileMeet): number {
        const durations = meet.participants.map((p) => p.duration).sort((a, b) => a - b)
        if (durations.length === 0) return 0
        const mid = Math.floor(durations.length / 2)
        const median =
            durations.length % 2 !== 0
                ? durations[mid]!
                : (durations[mid - 1]! + durations[mid]!) / 2
        const valid = durations.filter((d) => d <= median * 2)
        return valid.length === 0 ? 0 : Math.max(...valid)
    }

    function studentGroups() {
        const s = student()
        if (!s) return []
        return s.groups ?? []
    }

    function studentMeets() {
        const groups = studentGroups()
        return meets().filter((meet) => {
            const groupName = groupsMap()[meet.meetId]?.name
            return groupName && groups.includes(groupName)
        })
    }

    // ---- Attendance chart ----
    const attendanceChartData = computed(() => {
        if (!student()) return []
        return studentMeets()
            .map((meet) => {
                const s = student()!
                const participant = meet.participants.find(
                    (p) => p.name === s.name || (s.aliases ?? []).includes(p.name),
                )
                return {
                    date: new Date(meet.date).getTime(),
                    duration: participant ? participant.duration / 60 : 0,
                }
            })
            .sort((a, b) => a.date - b.date)
    })

    const attendanceChartConfig = computed(() => ({
        duration: {
            label: t('students.profile.attendance.minutes'),
            color: 'var(--chart-1)',
        },
    }))

    const attendanceYDomain = computed(() => {
        if (!attendanceChartData.value.length) return [0, 60]
        const maxVal = Math.max(...attendanceChartData.value.map((d) => d.duration))
        const roundedMax = Math.ceil(maxVal / 10) * 10 || 10
        return [0, roundedMax]
    })

    const attendanceNumTicks = computed(() => (attendanceYDomain.value[1] as number) / 10)

    // ---- Attendance stats + history ----
    const attendanceStats = computed(() => {
        const s = student()
        if (!s) {
            return {
                totalSessions: 0,
                totalPossibleSessions: 0,
                averagePercent: '0',
                totalTime: '0',
            }
        }
        return {
            totalSessions: s.sessionCount ?? 0,
            totalPossibleSessions: s.totalSessions ?? 0,
            averagePercent: s.averageAttendancePercent?.toFixed(1) ?? '0',
            totalTime: formatDuration(s.totalDuration ?? 0),
        }
    })

    const attendedMeets = computed(() => {
        if (!student()) return []
        const s = student()!
        return studentMeets()
            .map((meet) => {
                const participant = meet.participants.find(
                    (p) => p.name === s.name || (s.aliases ?? []).includes(p.name),
                )
                const duration = participant?.duration ?? 0
                const meetDuration = calculateMeetDuration(meet)
                const percentage = meetDuration > 0 ? (duration / meetDuration) * 100 : 0

                let offsetPercent = 0
                let durationPercent = 0
                let startTime: Date | null = null
                let joinTime: Date | null = null

                if (meet.startTime && meet.endTime && participant?.joinTime) {
                    let sessionStart = new Date(meet.startTime)
                    let sessionEnd = new Date(meet.endTime)
                    const timeComponent = new Date(participant.joinTime)

                    if (!isNaN(timeComponent.getTime())) {
                        joinTime = new Date(sessionStart)
                        joinTime.setHours(timeComponent.getHours())
                        joinTime.setMinutes(timeComponent.getMinutes())
                        joinTime.setSeconds(timeComponent.getSeconds())
                    } else {
                        joinTime = new Date(participant.joinTime)
                    }

                    const leaveTime = new Date(joinTime.getTime() + duration * 1000)
                    if (joinTime < sessionStart) sessionStart = joinTime

                    const safeDuration = calculateMeetDuration(meet)
                    const metadataDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000

                    if (safeDuration > 0 && metadataDuration > safeDuration * 5) {
                        const proposedEnd = new Date(sessionStart.getTime() + safeDuration * 1000)
                        sessionEnd = new Date(Math.max(proposedEnd.getTime(), leaveTime.getTime()))
                        sessionEnd = new Date(sessionEnd.getTime() + safeDuration * 0.1 * 1000)
                    }

                    if (leaveTime > sessionEnd) sessionEnd = leaveTime

                    const totalSessionDuration =
                        (sessionEnd.getTime() - sessionStart.getTime()) / 1000
                    if (totalSessionDuration > 0) {
                        const offsetSeconds = (joinTime.getTime() - sessionStart.getTime()) / 1000
                        offsetPercent = Math.max(
                            0,
                            Math.min(100, (offsetSeconds / totalSessionDuration) * 100),
                        )
                        durationPercent = Math.max(
                            0,
                            Math.min(100 - offsetPercent, (duration / totalSessionDuration) * 100),
                        )
                    }
                    startTime = sessionStart
                }

                return {
                    id: meet.meetId,
                    date: new Date(meet.date).toLocaleDateString(),
                    group: groupsMap()[meet.meetId]?.name ?? 'Unknown',
                    meetId: meet.meetId,
                    duration: formatDuration(duration),
                    percentage: Math.min(percentage, 100).toFixed(1),
                    hasTimeline: !!startTime,
                    offsetPercent,
                    durationPercent,
                    joinTime,
                }
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    // ---- Grade distribution ----
    const gradeDistributionData = computed(() => {
        const s = student()
        if (!s?.marks) return []
        const grades: Record<string, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        const taskMap = new Map(tasks().map((t) => [t.id, t]))
        s.marks.forEach((mark: { taskId: string | number; score: number }) => {
            const task = taskMap.get(mark.taskId)
            if (task?.maxPoints && task.maxPoints > 0) {
                const grade = formatMarkToFiveScale({
                    score: mark.score,
                    maxPoints: task.maxPoints,
                })
                grades[grade] = (grades[grade] ?? 0) + 1
            }
        })
        return (
            [
                { grade: '5', count: grades['5'], fill: 'var(--color-grade5)' },
                { grade: '4', count: grades['4'], fill: 'var(--color-grade4)' },
                { grade: '3', count: grades['3'], fill: 'var(--color-grade3)' },
                { grade: '2', count: grades['2'], fill: 'var(--color-grade2)' },
                { grade: '1', count: grades['1'], fill: 'var(--color-grade1)' },
            ] as { grade: string; count: number; fill: string }[]
        ).filter((d) => d.count > 0)
    })

    const gradeDistributionConfig = {
        count: { label: 'Mark' },
        grade5: { label: '5', color: 'rgb(22, 163, 74)' },
        grade4: { label: '4', color: 'rgb(37, 99, 235)' },
        grade3: { label: '3', color: 'rgb(202, 138, 4)' },
        grade2: { label: '2', color: 'rgb(234, 88, 12)' },
        grade1: { label: '1', color: 'rgb(220, 38, 38)' },
    }

    // ---- Task completion ----
    const taskCompletionData = computed(() => {
        const s = student()
        if (!s) return []
        const completed = s.completedTasks ?? 0
        const pending = Math.max(0, (s.totalTasks ?? 0) - completed)
        if (completed === 0 && pending === 0) return []
        return [
            { status: 'completed', count: completed, fill: 'var(--color-completed)' },
            { status: 'pending', count: pending, fill: 'var(--color-pending)' },
        ] as { status: string; count: number; fill: string }[]
    })

    const taskCompletionConfig = computed(() => ({
        count: { label: 'Tasks' },
        completed: { label: t('students.profile.marks.completed'), color: 'rgb(34, 197, 94)' },
        pending: { label: t('students.profile.marks.pending'), color: 'rgb(148, 163, 184)' },
    }))

    // ---- Marks stats + history ----
    const marksStats = computed(() => {
        const s = student()
        if (!s)
            return { averageGrade: '0', completedTasks: 0, totalTasks: 0, completionPercent: '0' }
        return {
            averageGrade: s.averageMark?.toFixed(2) ?? '0',
            completedTasks: s.completedTasks ?? 0,
            totalTasks: s.totalTasks ?? 0,
            completionPercent: s.completionPercent?.toFixed(1) ?? '0',
        }
    })

    const studentMarks = computed(() => {
        const s = student()
        if (!s?.marks) return []
        const taskMap = new Map(tasks().map((t) => [t.id, t]))
        return s.marks
            .map(
                (mark: {
                    id: string | number
                    taskId: string | number
                    score: number
                    createdAt: string
                }) => {
                    const task = taskMap.get(mark.taskId)
                    const maxPoints = task?.maxPoints ?? 0
                    const grade =
                        maxPoints > 0
                            ? formatMarkToFiveScale({ score: mark.score, maxPoints })
                            : '-'
                    return {
                        id: mark.id,
                        date: new Date(mark.createdAt).toLocaleDateString(),
                        taskName: task?.name ?? `Task #${mark.taskId}`,
                        score: mark.score,
                        maxPoints,
                        grade,
                    }
                },
            )
            .sort(
                (a: { date: string }, b: { date: string }) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
    })

    return {
        // copy
        showCopyCheck,
        copyEmail,
        // form
        formData,
        resetForm,
        handleSave,
        // attendance
        attendanceChartData,
        attendanceChartConfig,
        attendanceYDomain,
        attendanceNumTicks,
        attendanceStats,
        attendedMeets,
        // grades
        gradeDistributionData,
        gradeDistributionConfig,
        // tasks
        taskCompletionData,
        taskCompletionConfig,
        // marks
        marksStats,
        studentMarks,
        // utils exposed for template
        formatTime,
        getScoreColor,
    }
}
