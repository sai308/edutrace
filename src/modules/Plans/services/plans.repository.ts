import type { Plan } from '@Plans/types/plans'
import { BaseRepository } from '@/shared/services/BaseRepository'

class PlansRepository extends BaseRepository<'plans'> {
    constructor() {
        super('plans')
    }

    async savePlan(plan: Plan): Promise<string> {
        if (!plan.id?.trim())
            throw new Error('savePlan: plan must have a non-empty id')
        if (!plan.studentId?.trim())
            throw new Error('savePlan: plan must have a non-empty studentId')
        if (!plan.iep?.trim())
            throw new Error('savePlan: plan must have a non-empty iep')

        await this.put(plan)
        return plan.id
    }

    async getPlansByStudentId(studentId: string): Promise<Plan[]> {
        return this.getAllFromIndex('studentId', studentId)
    }
}

export const plansRepository = new PlansRepository()
