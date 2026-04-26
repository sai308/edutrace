import type { SessionEntry, SessionReport } from '@Sessions/models/session.model'
import { GradeTypeEnum, SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { summaryService } from '@Summary/services/summary.service'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionRepository } from '../sessions.repository'
import { SessionsService } from '../sessions.service'

vi.mock('../sessions.repository')
vi.mock('@Summary/services/summary.service')

// ── Fixtures ────────────────────────────────────────────────────────────────

const group = { id: 'g1', name: 'Group A', meetId: 'meet-001' }

function makeStudent(overrides: Record<string, unknown> = {}) {
    return {
        id: 's1',
        name: 'Alice',
        groups: ['Group A'],
        examGradeRaw: null,
        totalRaw: null,
        examIsAuto: true,
        completedAt: '2024-06-01T00:00:00.000Z',
        ...overrides,
    }
}

function makeEntry(overrides: Partial<SessionEntry> = {}): SessionEntry {
    return {
        studentId: 's1',
        studentSnapshot: { id: 's1', fullName: 'Alice', groupName: 'Group A' },
        grade: null,
        gradeType: GradeTypeEnum.AUTO,
        updatedAt: '2024-06-01T00:00:00.000Z',
        ...overrides,
    }
}

function makeSession(overrides: Partial<SessionReport> = {}): SessionReport {
    return {
        id: 'session-1',
        sessionType: SessionTypeEnum.MAIN,
        status: SessionStatusEnum.OPEN,
        groupId: 'g1',
        openedAt: '2024-06-01T00:00:00.000Z',
        closedAt: null,
        entries: [makeEntry()],
        ...overrides,
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('sessionsService', () => {
    let service: SessionsService

    beforeEach(() => {
        vi.clearAllMocks()
        service = new SessionsService()
        ;(sessionRepository.create as any).mockImplementation(async (data: any) => ({
            ...data,
            id: 'new-session-id',
        }))
        ;(sessionRepository.put as any).mockResolvedValue(undefined)
        ;(summaryService.loadExamData as any).mockResolvedValue({ students: [] })
    })

    // ── initializeMainSession ──────────────────────────────────────────────

    describe('initializeMainSession', () => {
        it('returns existing session when one already exists', async () => {
            const existing = makeSession()
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(existing)

            const result = await service.initializeMainSession(group)

            expect(result).toBe(existing)
            expect(sessionRepository.create).not.toHaveBeenCalled()
        })

        it('creates a MAIN OPEN session with entries from summary data', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: 85 })],
            })

            const result = await service.initializeMainSession(group)

            expect(sessionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionType: SessionTypeEnum.MAIN,
                    status: SessionStatusEnum.OPEN,
                    groupId: 'g1',
                }),
            )
            expect(result.entries).toHaveLength(1)
            expect(result.entries[0]!.grade).toBe(85)
            expect(result.entries[0]!.gradeType).toBe(GradeTypeEnum.AUTO)
        })

        it('falls back to totalRaw when examGradeRaw is null', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: null, totalRaw: 72 })],
            })

            const result = await service.initializeMainSession(group)

            expect(result.entries[0]!.grade).toBe(72)
        })

        it('sets grade to null when both examGradeRaw and totalRaw are null', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: null, totalRaw: null })],
            })

            const result = await service.initializeMainSession(group)

            expect(result.entries[0]!.grade).toBeNull()
        })

        it('sets gradeType to MANUAL when examIsAuto is false', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: 90, examIsAuto: false })],
            })

            const result = await service.initializeMainSession(group)

            expect(result.entries[0]!.gradeType).toBe(GradeTypeEnum.MANUAL)
        })

        it('throws when group has no id', async () => {
            await expect(service.initializeMainSession({ ...group, id: undefined } as any)).rejects.toThrow(
                'Group ID is required',
            )
        })
    })

    // ── syncMainSession ────────────────────────────────────────────────────

    describe('syncMainSession', () => {
        it('returns closed session without syncing', async () => {
            const closed = makeSession({ status: SessionStatusEnum.CLOSED })
            ;(sessionRepository.getById as any).mockResolvedValue(closed)

            const result = await service.syncMainSession(group, 'session-1')

            expect(result.status).toBe(SessionStatusEnum.CLOSED)
            expect(summaryService.loadExamData).not.toHaveBeenCalled()
        })

        it('returns non-MAIN session without syncing', async () => {
            const retake = makeSession({ sessionType: SessionTypeEnum.FIRST_RETAKE })
            ;(sessionRepository.getById as any).mockResolvedValue(retake)

            const result = await service.syncMainSession(group, 'session-1')

            expect(summaryService.loadExamData).not.toHaveBeenCalled()
            expect(result).toBe(retake)
        })

        it('updates an AUTO grade entry when a new value is available', async () => {
            const session = makeSession({
                entries: [makeEntry({ grade: null, gradeType: GradeTypeEnum.AUTO })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(session)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: 77 })],
            })

            const result = await service.syncMainSession(group, 'session-1')

            expect(result.entries[0]!.grade).toBe(77)
            expect(sessionRepository.put).toHaveBeenCalled()
        })

        it('does not overwrite a MANUAL grade entry', async () => {
            const session = makeSession({
                entries: [makeEntry({ grade: 50, gradeType: GradeTypeEnum.MANUAL })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(session)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: 90 })],
            })

            const result = await service.syncMainSession(group, 'session-1')

            expect(result.entries[0]!.grade).toBe(50)
            expect(sessionRepository.put).not.toHaveBeenCalled()
        })

        it('adds newly joined students not yet in the session', async () => {
            const session = makeSession({ entries: [] })
            ;(sessionRepository.getById as any).mockResolvedValue(session)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ id: 's-new', name: 'Bob', examGradeRaw: 65 })],
            })

            const result = await service.syncMainSession(group, 'session-1')

            expect(result.entries).toHaveLength(1)
            expect(result.entries[0]!.studentId).toBe('s-new')
            expect(sessionRepository.put).toHaveBeenCalled()
        })

        it('throws when session is not found', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(undefined)

            await expect(service.syncMainSession(group, 'missing')).rejects.toThrow('Session not found')
        })
    })

    // ── initializeRetakeSession ────────────────────────────────────────────

    describe('initializeRetakeSession', () => {
        it('returns existing retake session when one already exists', async () => {
            const existing = makeSession({ sessionType: SessionTypeEnum.FIRST_RETAKE })
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(existing)

            const result = await service.initializeRetakeSession(group, 'prev-id', SessionTypeEnum.FIRST_RETAKE)

            expect(result).toBe(existing)
            expect(sessionRepository.create).not.toHaveBeenCalled()
        })

        it('carries over only students who failed (grade < 60)', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            const prevSession = makeSession({
                status: SessionStatusEnum.CLOSED,
                entries: [
                    makeEntry({ studentId: 'fail-1', grade: 45 }),
                    makeEntry({ studentId: 'pass-1', grade: 75 }),
                    makeEntry({ studentId: 'null-1', grade: null }),
                ],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(prevSession)

            const result = await service.initializeRetakeSession(group, 'prev-id', SessionTypeEnum.FIRST_RETAKE)

            const ids = result.entries.map(e => e.studentId)
            expect(ids).toContain('fail-1')
            expect(ids).toContain('null-1')
            expect(ids).not.toContain('pass-1')
        })

        it('resets grades to null and sets gradeType to MANUAL', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            const prevSession = makeSession({
                status: SessionStatusEnum.CLOSED,
                entries: [makeEntry({ studentId: 's1', grade: 40 })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(prevSession)

            const result = await service.initializeRetakeSession(group, 'prev-id', SessionTypeEnum.FIRST_RETAKE)

            expect(result.entries[0]!.grade).toBeNull()
            expect(result.entries[0]!.gradeType).toBe(GradeTypeEnum.MANUAL)
        })

        it('throws when previous session is not closed', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(sessionRepository.getById as any).mockResolvedValue(makeSession({ status: SessionStatusEnum.OPEN }))

            await expect(
                service.initializeRetakeSession(group, 'prev-id', SessionTypeEnum.FIRST_RETAKE),
            ).rejects.toThrow('Previous session is not closed')
        })

        it('throws when previous session is not found', async () => {
            ;(sessionRepository.getGroupSession as any).mockResolvedValue(undefined)
            ;(sessionRepository.getById as any).mockResolvedValue(undefined)

            await expect(
                service.initializeRetakeSession(group, 'missing', SessionTypeEnum.FIRST_RETAKE),
            ).rejects.toThrow('Previous session not found')
        })

        it('throws when group has no id', async () => {
            await expect(
                service.initializeRetakeSession(
                    { ...group, id: undefined } as any,
                    'prev-id',
                    SessionTypeEnum.FIRST_RETAKE,
                ),
            ).rejects.toThrow('Group ID is required')
        })
    })

    // ── syncRetakeSession ──────────────────────────────────────────────────

    describe('syncRetakeSession', () => {
        it('returns a MAIN session without syncing', async () => {
            const mainSession = makeSession({ sessionType: SessionTypeEnum.MAIN })
            ;(sessionRepository.getById as any).mockResolvedValue(mainSession)

            const result = await service.syncRetakeSession(group, 'session-1')

            expect(summaryService.loadExamData).not.toHaveBeenCalled()
            expect(result).toBe(mainSession)
        })

        it('does not add new students to the retake session', async () => {
            const retake = makeSession({
                sessionType: SessionTypeEnum.FIRST_RETAKE,
                entries: [makeEntry({ studentId: 's1' })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(retake)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ id: 's1', examGradeRaw: 55 }), makeStudent({ id: 's-new', examGradeRaw: 70 })],
            })

            const result = await service.syncRetakeSession(group, 'session-1')

            expect(result.entries).toHaveLength(1)
            expect(result.entries[0]!.studentId).toBe('s1')
        })

        it('updates an AUTO grade entry in the retake session', async () => {
            const retake = makeSession({
                sessionType: SessionTypeEnum.FIRST_RETAKE,
                entries: [makeEntry({ grade: null, gradeType: GradeTypeEnum.AUTO })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(retake)
            ;(summaryService.loadExamData as any).mockResolvedValue({
                students: [makeStudent({ examGradeRaw: 68 })],
            })

            const result = await service.syncRetakeSession(group, 'session-1')

            expect(result.entries[0]!.grade).toBe(68)
            expect(sessionRepository.put).toHaveBeenCalled()
        })
    })

    // ── closeSession ───────────────────────────────────────────────────────

    describe('closeSession', () => {
        it('sets status to CLOSED and persists', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(makeSession())

            const result = await service.closeSession('session-1')

            expect(result.status).toBe(SessionStatusEnum.CLOSED)
            expect(result.closedAt).toBeDefined()
            expect(sessionRepository.put).toHaveBeenCalledWith(
                expect.objectContaining({ status: SessionStatusEnum.CLOSED }),
            )
        })

        it('throws when session is not found', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(undefined)
            await expect(service.closeSession('missing')).rejects.toThrow('Session not found')
        })
    })

    // ── updateGrade ────────────────────────────────────────────────────────

    describe('updateGrade', () => {
        it('updates the grade and sets gradeType to MANUAL', async () => {
            const session = makeSession({
                entries: [makeEntry({ studentId: 's1', grade: null, gradeType: GradeTypeEnum.AUTO })],
            })
            ;(sessionRepository.getById as any).mockResolvedValue(session)

            const result = await service.updateGrade('session-1', 's1', 88)

            expect(result.entries[0]!.grade).toBe(88)
            expect(result.entries[0]!.gradeType).toBe(GradeTypeEnum.MANUAL)
            expect(sessionRepository.put).toHaveBeenCalled()
        })

        it('throws when session is closed', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(makeSession({ status: SessionStatusEnum.CLOSED }))
            await expect(service.updateGrade('session-1', 's1', 90)).rejects.toThrow('Cannot edit a closed session')
        })

        it('throws when student is not in the session', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(makeSession({ entries: [] }))
            await expect(service.updateGrade('session-1', 'unknown', 50)).rejects.toThrow(
                'Student not found in session',
            )
        })

        it('throws when session is not found', async () => {
            ;(sessionRepository.getById as any).mockResolvedValue(undefined)
            await expect(service.updateGrade('missing', 's1', 70)).rejects.toThrow('Session not found')
        })
    })
})
