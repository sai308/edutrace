import type { Plan } from '../../models/plan.model'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { plansRepository } from '../plans.repository'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<Plan> = {}): Plan {
    return {
        id: 'plan-1',
        studentId: 'student-1',
        iep: 'E001',
        grade: 85,
        dateApplied: '2024-06-01T00:00:00.000Z',
        sessionType: 'MAIN',
        isSynced: false,
        syncedAt: null,
        ...overrides,
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('plansRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── savePlan ─────────────────────────────────────────────────────────────

    describe('savePlan', () => {
        it('stores the plan and returns its id', async () => {
            const plan = makePlan()
            const result = await plansRepository.savePlan(plan)

            expect(result).toBe('plan-1')
        })

        it('persisted plan is retrievable by id', async () => {
            const plan = makePlan()
            await plansRepository.savePlan(plan)

            const stored = await plansRepository.getById('plan-1' as any)
            expect(stored).toBeDefined()
            expect(stored!.studentId).toBe('student-1')
            expect(stored!.iep).toBe('E001')
            expect(stored!.grade).toBe(85)
        })

        it('updates an existing plan on second save', async () => {
            await plansRepository.savePlan(makePlan({ grade: 70 }))
            await plansRepository.savePlan(makePlan({ grade: 90 }))

            const stored = await plansRepository.getById('plan-1' as any)
            expect(stored!.grade).toBe(90)
        })

        it('throws when id is empty', async () => {
            await expect(plansRepository.savePlan(makePlan({ id: '' }))).rejects.toThrow(
                'plan must have a non-empty id'
            )
        })

        it('throws when id is whitespace only', async () => {
            await expect(plansRepository.savePlan(makePlan({ id: '   ' }))).rejects.toThrow(
                'plan must have a non-empty id'
            )
        })

        it('throws when studentId is empty', async () => {
            await expect(plansRepository.savePlan(makePlan({ studentId: '' }))).rejects.toThrow(
                'plan must have a non-empty studentId'
            )
        })

        it('throws when iep is empty', async () => {
            await expect(plansRepository.savePlan(makePlan({ iep: '' }))).rejects.toThrow(
                'plan must have a non-empty iep'
            )
        })

        it('preserves all fields faithfully', async () => {
            const plan = makePlan({
                id: 'plan-full',
                studentId: 'stu-99',
                iep: 'Z999',
                grade: 72,
                dateApplied: '2025-03-01T08:00:00.000Z',
                sessionType: 'FIRST_RETAKE',
                isSynced: true,
                syncedAt: '2025-03-02T00:00:00.000Z',
            })
            await plansRepository.savePlan(plan)

            const stored = await plansRepository.getById('plan-full' as any)
            expect(stored).toEqual(plan)
        })
    })

    // ─── getPlansByStudentId ──────────────────────────────────────────────────

    describe('getPlansByStudentId', () => {
        it('returns empty array when no plans exist for the student', async () => {
            const result = await plansRepository.getPlansByStudentId('nonexistent')
            expect(result).toEqual([])
        })

        it('returns plans for the given student', async () => {
            await plansRepository.savePlan(makePlan({ id: 'p1', studentId: 'stu-A', iep: 'I1' }))
            await plansRepository.savePlan(makePlan({ id: 'p2', studentId: 'stu-A', iep: 'I2' }))
            await plansRepository.savePlan(makePlan({ id: 'p3', studentId: 'stu-B', iep: 'I3' }))

            const result = await plansRepository.getPlansByStudentId('stu-A')
            expect(result).toHaveLength(2)
            expect(result.every((p) => p.studentId === 'stu-A')).toBe(true)
        })

        it('does not return plans from other students', async () => {
            await plansRepository.savePlan(makePlan({ id: 'p-other', studentId: 'stu-other', iep: 'I1' }))

            const result = await plansRepository.getPlansByStudentId('stu-A')
            expect(result).toHaveLength(0)
        })

        it('returns a single plan when only one exists', async () => {
            await plansRepository.savePlan(makePlan({ id: 'single', studentId: 'stu-single', iep: 'I1', grade: 95 }))

            const result = await plansRepository.getPlansByStudentId('stu-single')
            expect(result).toHaveLength(1)
            expect(result[0]!.grade).toBe(95)
        })
    })

    // ─── getAll ───────────────────────────────────────────────────────────────

    describe('getAll', () => {
        it('returns empty array when store is empty', async () => {
            expect(await plansRepository.getAll()).toEqual([])
        })

        it('returns all stored plans', async () => {
            await plansRepository.savePlan(makePlan({ id: 'pa', studentId: 'sa', iep: 'X1' }))
            await plansRepository.savePlan(makePlan({ id: 'pb', studentId: 'sb', iep: 'X2' }))
            await plansRepository.savePlan(makePlan({ id: 'pc', studentId: 'sc', iep: 'X3' }))

            const all = await plansRepository.getAll()
            expect(all).toHaveLength(3)
        })
    })

    // ─── delete ───────────────────────────────────────────────────────────────

    describe('delete', () => {
        it('removes the plan from the store', async () => {
            await plansRepository.savePlan(makePlan())

            await plansRepository.delete('plan-1' as any)

            expect(await plansRepository.getById('plan-1' as any)).toBeUndefined()
        })

        it('does not throw when deleting a nonexistent plan', async () => {
            await expect(plansRepository.delete('ghost-id' as any)).resolves.not.toThrow()
        })

        it('only removes the targeted plan', async () => {
            await plansRepository.savePlan(makePlan({ id: 'keep-me', studentId: 's1', iep: 'I1' }))
            await plansRepository.savePlan(makePlan({ id: 'delete-me', studentId: 's2', iep: 'I2' }))

            await plansRepository.delete('delete-me' as any)

            expect(await plansRepository.getById('keep-me' as any)).toBeDefined()
            expect(await plansRepository.getById('delete-me' as any)).toBeUndefined()
        })
    })
})
