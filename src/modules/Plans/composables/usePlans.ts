import type { Group } from '@Groups/types/groups'
import type { Plan } from '@Plans/types/plans'
import type { SessionType } from '@Sessions/models/session.model'
import type { Member } from '@Students/types/students'
import type { EctsStats } from '@/shared/utils/grades'
import { groupsRepository } from '@Groups/services/groups.repository'
import { plansService } from '@Plans/services/plans.service'
import { studentsRepository } from '@Students/services/students.repository'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuerySync } from '@/shared/composables/useQuerySync'
import { logger } from '@/shared/lib/logger'
import { useToast } from '@/shared/services/toast'
import { computeECTSStats } from '@/shared/utils/grades'

export interface GradeSnapshot {
    grade: number | null
    date: string
    type: SessionType
    sessionId: string
}

export interface StudentPlanItem {
    student: Member
    plan: Plan | undefined
    hasPlan: boolean
}

export function usePlans() {
    const { t } = useI18n()
    const { toast } = useToast()

    const plans = ref<Plan[]>([])
    const students = ref<Member[]>([])
    const groups = ref<Group[]>([])
    const filterGroup = ref<string | null>(null)
    const latestGrades = ref<Record<string, GradeSnapshot>>({})

    useQuerySync({ group: filterGroup } as any)

    async function loadData(): Promise<void> {
        const allMembers = await studentsRepository.getAllMembers()
        students.value = allMembers.filter(m => m.role === 'student' && m.iep)

        plans.value = await plansService.getAllPlans()

        const iepGroupNames = new Set(students.value.filter(s => !!s.groupName).map(s => s.groupName))
        const allGroups = await groupsRepository.getAll()
        groups.value = allGroups.filter(g => iepGroupNames.has(g.name))

        // Auto-select the first group that has students with IEP (if no URL param set)
        if (!filterGroup.value && groups.value.length > 0) {
            filterGroup.value = groups.value[0]!.name
        }

        // Pre-load grade snapshots for students who don't have a persisted plan yet
        const grades: Record<string, GradeSnapshot> = {}
        for (const student of students.value) {
            if (!plans.value.some(p => p.studentId === student.id)) {
                const latest = await plansService.getGradeSnapshotFromSessions(student.id!)
                if (latest) {
                    grades[student.id!] = latest
                }
            }
        }
        latestGrades.value = grades
    }

    onMounted(loadData)

    const studentPlans = computed<StudentPlanItem[]>(() => {
        let result = students.value.map((student) => {
            const existingPlan = plans.value.find(p => p.studentId === student.id)

            // Build a display-only preview plan when no persisted plan exists yet
            let displayPlan: Plan | undefined = existingPlan
            if (!existingPlan && student.id && latestGrades.value[student.id]) {
                const latest = latestGrades.value[student.id]!
                displayPlan = {
                    id: '',
                    studentId: student.id,
                    iep: student.iep!,
                    grade: latest.grade,
                    dateApplied: latest.date,
                    sessionType: latest.type,
                    isSynced: false,
                    syncedAt: null,
                }
            }

            return { student, plan: displayPlan, hasPlan: !!existingPlan }
        })

        if (filterGroup.value) {
            result = result.filter(item => item.student.groupName === filterGroup.value)
        }

        return result
    })

    const stats = computed<EctsStats>(() =>
        computeECTSStats(studentPlans.value.map(item => item.plan?.grade ?? null)),
    )

    async function handleToggleSync(
        studentId: string,
        iep: string,
        isSynced: boolean,
        hasPlan: boolean,
        existingPlan?: Plan,
    ): Promise<void> {
        try {
            let updated: Plan | null = null

            if (hasPlan && existingPlan) {
                // Plan already persisted — only update sync state (grade is immutable)
                updated = await plansService.toggleSync(existingPlan.id, isSynced)
                if (!updated)
                    throw new Error('Could not update the existing plan record.')
            }
            else {
                // No persisted plan yet — create it (captures grade snapshot), then apply sync state
                const newPlan = await plansService.initializePlan(studentId, iep)
                updated = await plansService.toggleSync(newPlan.id, isSynced)
                if (!updated)
                    throw new Error('Could not verify the newly created plan record.')
            }

            // Reload all plans from DB to guarantee reactive accuracy after persist
            plans.value = await plansService.getAllPlans()
            toast.success(isSynced ? t('plans.messages.syncEnabled') : t('plans.messages.syncDisabled'))
        }
        catch (err: any) {
            logger.error('Failed to toggle plan sync:', err)
            toast.error(err.message || t('plans.messages.syncError'))
        }
    }

    return {
        plans,
        students,
        groups,
        filterGroup,
        studentPlans,
        stats,
        handleToggleSync,
        loadData,
    }
}
