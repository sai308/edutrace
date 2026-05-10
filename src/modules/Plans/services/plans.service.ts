import type { Plan } from '@Plans/types/plans'
import type { SessionType } from '@Sessions/models/session.model'
import { plansRepository } from '@Plans/services/plans.repository'
import { SessionStatusEnum } from '@Sessions/models/session.model'
import { sessionRepository } from '@Sessions/services/sessions.repository'

const VALID_SESSION_TYPES: readonly SessionType[] = ['MAIN', 'FIRST_RETAKE', 'SECOND_RETAKE']

export class PlansService {
    async getAllPlans(): Promise<Plan[]> {
        return plansRepository.getAll()
    }

    async getPlansByStudentId(studentId: string): Promise<Plan[]> {
        return plansRepository.getPlansByStudentId(studentId)
    }

    async savePlan(plan: Plan): Promise<Plan> {
        if (!plan.id?.trim())
            throw new Error('Plan id is required')
        if (!plan.studentId?.trim())
            throw new Error('Plan studentId is required')
        if (!plan.iep?.trim())
            throw new Error('Plan iep is required')
        if (!plan.dateApplied)
            throw new Error('Plan dateApplied is required')
        if (!VALID_SESSION_TYPES.includes(plan.sessionType)) {
            throw new Error(`Invalid sessionType: ${plan.sessionType}`)
        }

        await plansRepository.savePlan(plan)
        return plan
    }

    /**
     * Reads the grade from the most recent CLOSED session record for this student.
     * The grade is returned as a snapshot — immutable, taken directly from the stored
     * session entry, NOT recalculated from the Summary module.
     */
    async getGradeSnapshotFromSessions(studentId: string): Promise<{
        grade: number | null
        date: string
        type: SessionType
        sessionId: string
    } | null> {
        const allSessions = await sessionRepository.getAll()
        const closedSessions = allSessions.filter(s => s.status === SessionStatusEnum.CLOSED)

        // Sort by closedAt descending — most recent first
        closedSessions.sort((a, b) => {
            const dateA = a.closedAt ? new Date(a.closedAt).getTime() : 0
            const dateB = b.closedAt ? new Date(b.closedAt).getTime() : 0
            return dateB - dateA
        })

        for (const session of closedSessions) {
            const entry = session.entries.find(e => e.studentId === studentId)
            if (entry && entry.grade !== null) {
                return {
                    grade: entry.grade,
                    date: session.closedAt!,
                    type: session.sessionType,
                    sessionId: session.id,
                }
            }
        }
        return null
    }

    async deletePlan(id: string): Promise<void> {
        await plansRepository.delete(id)
    }

    /**
     * Creates a new plan for a student, capturing the grade snapshot from the
     * most recent closed session at creation time. The grade is immutable after this.
     * If a plan already exists for this student, returns the existing one unchanged.
     */
    async initializePlan(studentId: string, iep: string): Promise<Plan> {
        if (!studentId?.trim())
            throw new Error('initializePlan: studentId is required')
        if (!iep?.trim())
            throw new Error('initializePlan: iep is required')

        // Ensure single record per student
        const existing = await plansRepository.getPlansByStudentId(studentId)
        if (existing.length > 0)
            return existing[0]!

        const snapshot = await this.getGradeSnapshotFromSessions(studentId)

        const id = crypto.randomUUID()
        const plan: Plan = {
            id,
            studentId,
            iep,
            grade: snapshot?.grade ?? null,
            dateApplied: snapshot?.date ?? new Date().toISOString(),
            sessionType: snapshot?.type ?? 'MAIN',
            isSynced: false,
            syncedAt: null,
        }
        await this.savePlan(plan)
        return plan
    }

    /**
     * Toggles the sync state of a plan.
     * The grade is IMMUTABLE — it is captured once when the plan is created and
     * is never changed here. Only isSynced and syncedAt are updated.
     */
    async toggleSync(id: string, isSynced: boolean): Promise<Plan | null> {
        if (!id?.trim())
            throw new Error('toggleSync: id is required')

        const plan = await plansRepository.getById(id)
        if (!plan)
            return null

        plan.isSynced = isSynced
        plan.syncedAt = isSynced ? new Date().toISOString() : null

        await this.savePlan(plan)
        return plan
    }
}

export const plansService = new PlansService()
