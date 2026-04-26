import type { SessionReport } from '@Sessions/models/session.model'
import type { Plan } from '../../models/plan.model'
import { SessionStatusEnum } from '@Sessions/models/session.model'
import { sessionRepository } from '@Sessions/services/sessions.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { plansRepository } from '../plans.repository'
import { PlansService } from '../plans.service'

vi.mock('../plans.repository')
vi.mock('@Sessions/services/sessions.repository')

function makePlan(overrides: Partial<Plan> = {}): Plan {
    return {
        id: 'plan-1',
        studentId: 'student-1',
        iep: 'E001',
        grade: 85,
        dateApplied: '2024-06-01T10:00:00.000Z',
        sessionType: 'MAIN',
        isSynced: false,
        syncedAt: null,
        ...overrides,
    }
}

function makeSession(overrides: Partial<SessionReport> = {}): SessionReport {
    return {
        id: 'session-1',
        sessionType: 'MAIN',
        status: SessionStatusEnum.CLOSED,
        groupId: 'group-1',
        openedAt: '2024-05-01T08:00:00.000Z',
        closedAt: '2024-06-01T10:00:00.000Z',
        entries: [],
        ...overrides,
    }
}

describe('plansService', () => {
    let service: PlansService

    beforeEach(() => {
        vi.clearAllMocks()
        service = new PlansService()
    })

    // ─── getAllPlans ────────────────────────────────────────────────────────────

    describe('getAllPlans', () => {
        it('returns all plans from repository', async () => {
            const plans = [makePlan(), makePlan({ id: 'plan-2', studentId: 'student-2' })]
            ;(plansRepository.getAll as any).mockResolvedValue(plans)

            const result = await service.getAllPlans()

            expect(result).toEqual(plans)
            expect(plansRepository.getAll).toHaveBeenCalledOnce()
        })
    })

    // ─── getPlansByStudentId ────────────────────────────────────────────────────

    describe('getPlansByStudentId', () => {
        it('returns plans filtered by student id', async () => {
            const plans = [makePlan()]
            ;(plansRepository.getPlansByStudentId as any).mockResolvedValue(plans)

            const result = await service.getPlansByStudentId('student-1')

            expect(result).toEqual(plans)
            expect(plansRepository.getPlansByStudentId).toHaveBeenCalledWith('student-1')
        })
    })

    // ─── savePlan ───────────────────────────────────────────────────────────────

    describe('savePlan', () => {
        it('persists a valid plan and returns it', async () => {
            const plan = makePlan()
            ;(plansRepository.savePlan as any).mockResolvedValue(plan.id)

            const result = await service.savePlan(plan)

            expect(result).toBe(plan)
            expect(plansRepository.savePlan).toHaveBeenCalledWith(plan)
        })

        it('throws when id is empty', async () => {
            await expect(service.savePlan(makePlan({ id: '' }))).rejects.toThrow(
                'Plan id is required',
            )
        })

        it('throws when id is whitespace only', async () => {
            await expect(service.savePlan(makePlan({ id: '   ' }))).rejects.toThrow(
                'Plan id is required',
            )
        })

        it('throws when studentId is empty', async () => {
            await expect(service.savePlan(makePlan({ studentId: '' }))).rejects.toThrow(
                'Plan studentId is required',
            )
        })

        it('throws when iep is empty', async () => {
            await expect(service.savePlan(makePlan({ iep: '' }))).rejects.toThrow(
                'Plan iep is required',
            )
        })

        it('throws when dateApplied is empty', async () => {
            await expect(service.savePlan(makePlan({ dateApplied: '' }))).rejects.toThrow(
                'Plan dateApplied is required',
            )
        })

        it('throws when sessionType is invalid', async () => {
            await expect(
                service.savePlan(makePlan({ sessionType: 'INVALID' as any })),
            ).rejects.toThrow('Invalid sessionType: INVALID')
        })

        it.each(['MAIN', 'FIRST_RETAKE', 'SECOND_RETAKE'] as const)(
            'accepts sessionType %s',
            async (sessionType) => {
                const plan = makePlan({ sessionType })
                ;(plansRepository.savePlan as any).mockResolvedValue(plan.id)
                await expect(service.savePlan(plan)).resolves.toBe(plan)
            },
        )
    })

    // ─── getGradeSnapshotFromSessions ───────────────────────────────────────────

    describe('getGradeSnapshotFromSessions', () => {
        it('returns null when there are no sessions', async () => {
            ;(sessionRepository.getAll as any).mockResolvedValue([])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result).toBeNull()
        })

        it('returns null when all sessions are open', async () => {
            const openSession = makeSession({ status: SessionStatusEnum.OPEN, closedAt: null })
            ;(sessionRepository.getAll as any).mockResolvedValue([openSession])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result).toBeNull()
        })

        it('returns null when student has no entries in closed sessions', async () => {
            const session = makeSession({
                entries: [
                    {
                        studentId: 'other-student',
                        grade: 90,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'other-student', fullName: 'Other' },
                        updatedAt: '2024-06-01T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([session])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result).toBeNull()
        })

        it('returns null when student grade is null in all closed sessions', async () => {
            const session = makeSession({
                entries: [
                    {
                        studentId: 'student-1',
                        grade: null,
                        gradeType: 'MANUAL',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-06-01T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([session])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result).toBeNull()
        })

        it('returns grade snapshot from the only closed session', async () => {
            const session = makeSession({
                id: 'session-1',
                sessionType: 'MAIN',
                closedAt: '2024-06-01T10:00:00.000Z',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: 88,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-06-01T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([session])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result).toEqual({
                grade: 88,
                date: '2024-06-01T10:00:00.000Z',
                type: 'MAIN',
                sessionId: 'session-1',
            })
        })

        it('returns the most recent session when multiple closed sessions exist', async () => {
            const older = makeSession({
                id: 'session-old',
                closedAt: '2024-03-01T10:00:00.000Z',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: 70,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-03-01T10:00:00.000Z',
                    },
                ],
            })
            const newer = makeSession({
                id: 'session-new',
                sessionType: 'FIRST_RETAKE',
                closedAt: '2024-06-15T10:00:00.000Z',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: 92,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-06-15T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([older, newer])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result?.sessionId).toBe('session-new')
            expect(result?.grade).toBe(92)
            expect(result?.type).toBe('FIRST_RETAKE')
        })

        it('skips sessions where grade is null and returns next most recent with a grade', async () => {
            const nullGradeSession = makeSession({
                id: 'session-null',
                closedAt: '2024-07-01T10:00:00.000Z',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: null,
                        gradeType: 'MANUAL',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-07-01T10:00:00.000Z',
                    },
                ],
            })
            const gradedSession = makeSession({
                id: 'session-graded',
                closedAt: '2024-06-01T10:00:00.000Z',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: 75,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-06-01T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([nullGradeSession, gradedSession])

            const result = await service.getGradeSnapshotFromSessions('student-1')

            expect(result?.sessionId).toBe('session-graded')
            expect(result?.grade).toBe(75)
        })
    })

    // ─── initializePlan ─────────────────────────────────────────────────────────

    describe('initializePlan', () => {
        it('throws when studentId is empty', async () => {
            await expect(service.initializePlan('', 'E001')).rejects.toThrow(
                'studentId is required',
            )
        })

        it('throws when studentId is whitespace only', async () => {
            await expect(service.initializePlan('   ', 'E001')).rejects.toThrow(
                'studentId is required',
            )
        })

        it('throws when iep is empty', async () => {
            await expect(service.initializePlan('student-1', '')).rejects.toThrow('iep is required')
        })

        it('returns existing plan without creating a new one (idempotent)', async () => {
            const existing = makePlan()
            ;(plansRepository.getPlansByStudentId as any).mockResolvedValue([existing])

            const result = await service.initializePlan('student-1', 'E001')

            expect(result).toBe(existing)
            expect(plansRepository.savePlan).not.toHaveBeenCalled()
        })

        it('creates a new plan with grade snapshot when none exists', async () => {
            ;(plansRepository.getPlansByStudentId as any).mockResolvedValue([])
            const session = makeSession({
                id: 'session-1',
                closedAt: '2024-06-01T10:00:00.000Z',
                sessionType: 'MAIN',
                entries: [
                    {
                        studentId: 'student-1',
                        grade: 80,
                        gradeType: 'AUTO',
                        studentSnapshot: { id: 'student-1', fullName: 'Alice' },
                        updatedAt: '2024-06-01T10:00:00.000Z',
                    },
                ],
            })
            ;(sessionRepository.getAll as any).mockResolvedValue([session])
            ;(plansRepository.savePlan as any).mockResolvedValue('new-id')

            const result = await service.initializePlan('student-1', 'E001')

            expect(result.studentId).toBe('student-1')
            expect(result.iep).toBe('E001')
            expect(result.grade).toBe(80)
            expect(result.dateApplied).toBe('2024-06-01T10:00:00.000Z')
            expect(result.sessionType).toBe('MAIN')
            expect(result.isSynced).toBe(false)
            expect(result.syncedAt).toBeNull()
            expect(result.id).toBeTruthy()
        })

        it('creates a plan with null grade and current date when no closed sessions exist', async () => {
            ;(plansRepository.getPlansByStudentId as any).mockResolvedValue([])
            ;(sessionRepository.getAll as any).mockResolvedValue([])
            ;(plansRepository.savePlan as any).mockResolvedValue('new-id')

            const before = new Date().toISOString()
            const result = await service.initializePlan('student-1', 'E001')
            const after = new Date().toISOString()

            expect(result.grade).toBeNull()
            expect(result.sessionType).toBe('MAIN')
            expect(result.dateApplied >= before).toBe(true)
            expect(result.dateApplied <= after).toBe(true)
        })
    })

    // ─── toggleSync ─────────────────────────────────────────────────────────────

    describe('toggleSync', () => {
        it('throws when id is empty', async () => {
            await expect(service.toggleSync('', true)).rejects.toThrow('id is required')
        })

        it('returns null when plan is not found', async () => {
            ;(plansRepository.getById as any).mockResolvedValue(undefined)

            const result = await service.toggleSync('nonexistent', true)

            expect(result).toBeNull()
            expect(plansRepository.savePlan).not.toHaveBeenCalled()
        })

        it('sets isSynced=true and records syncedAt timestamp', async () => {
            const plan = makePlan({ isSynced: false, syncedAt: null })
            ;(plansRepository.getById as any).mockResolvedValue(plan)
            ;(plansRepository.savePlan as any).mockResolvedValue(plan.id)

            const before = new Date().toISOString()
            const result = await service.toggleSync('plan-1', true)
            const after = new Date().toISOString()

            expect(result?.isSynced).toBe(true)
            expect(result?.syncedAt).not.toBeNull()
            expect(result!.syncedAt! >= before).toBe(true)
            expect(result!.syncedAt! <= after).toBe(true)
        })

        it('sets isSynced=false and clears syncedAt', async () => {
            const plan = makePlan({ isSynced: true, syncedAt: '2024-06-01T10:00:00.000Z' })
            ;(plansRepository.getById as any).mockResolvedValue(plan)
            ;(plansRepository.savePlan as any).mockResolvedValue(plan.id)

            const result = await service.toggleSync('plan-1', false)

            expect(result?.isSynced).toBe(false)
            expect(result?.syncedAt).toBeNull()
        })

        it('does not modify grade when toggling sync', async () => {
            const plan = makePlan({ grade: 88 })
            ;(plansRepository.getById as any).mockResolvedValue(plan)
            ;(plansRepository.savePlan as any).mockResolvedValue(plan.id)

            const result = await service.toggleSync('plan-1', true)

            expect(result?.grade).toBe(88)
        })
    })

    // ─── deletePlan ─────────────────────────────────────────────────────────────

    describe('deletePlan', () => {
        it('delegates deletion to repository', async () => {
            ;(plansRepository.delete as any).mockResolvedValue(undefined)

            await service.deletePlan('plan-1')

            expect(plansRepository.delete).toHaveBeenCalledWith('plan-1')
        })
    })
})
