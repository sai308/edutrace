import type { SessionEntry, SessionReport } from '@Sessions/models/session.model'
import { GradeTypeEnum, SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionRepository } from '../sessions.repository'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(studentId: string, grade: number | null = null): SessionEntry {
    return {
        studentId,
        studentSnapshot: { id: studentId, fullName: `Student ${studentId}`, groupName: 'G1' },
        grade,
        gradeType: grade !== null ? GradeTypeEnum.MANUAL : GradeTypeEnum.AUTO,
        updatedAt: '2024-06-01T00:00:00.000Z',
    }
}

function makeSession(overrides: Partial<Omit<SessionReport, 'id'>> = {}): Omit<SessionReport, 'id'> {
    return {
        sessionType: SessionTypeEnum.MAIN,
        status: SessionStatusEnum.OPEN,
        groupId: 'g1',
        openedAt: '2024-06-01T00:00:00.000Z',
        closedAt: null,
        entries: [makeEntry('s1')],
        ...overrides,
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sessionRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('stores the session and returns it with a generated id', async () => {
            const data = makeSession()
            const result = await sessionRepository.create(data)

            expect(result.id).toBeTruthy()
            expect(result.sessionType).toBe(SessionTypeEnum.MAIN)
            expect(result.groupId).toBe('g1')

            const stored = await sessionRepository.getById(result.id as any)
            expect(stored).toBeDefined()
            expect(stored!.id).toBe(result.id)
        })

        it('each call generates a unique id', async () => {
            const a = await sessionRepository.create(makeSession())
            const b = await sessionRepository.create(makeSession({ groupId: 'g2' }))
            expect(a.id).not.toBe(b.id)
        })

        it('throws when groupId is missing', async () => {
            await expect(sessionRepository.create(makeSession({ groupId: '' }))).rejects.toThrow('groupId is required')
        })

        it('throws when sessionType is invalid', async () => {
            await expect(sessionRepository.create(makeSession({ sessionType: 'INVALID' as any }))).rejects.toThrow(
                'sessionType must be one of'
            )
        })

        it('throws when status is invalid', async () => {
            await expect(sessionRepository.create(makeSession({ status: 'PENDING' as any }))).rejects.toThrow(
                'status must be one of'
            )
        })

        it('throws when entries is not an array', async () => {
            await expect(sessionRepository.create(makeSession({ entries: 'not-array' as any }))).rejects.toThrow(
                'entries must be an array'
            )
        })

        it.each([SessionTypeEnum.MAIN, SessionTypeEnum.FIRST_RETAKE, SessionTypeEnum.SECOND_RETAKE])(
            'accepts sessionType %s',
            async (sessionType) => {
                const result = await sessionRepository.create(makeSession({ sessionType }))
                expect(result.sessionType).toBe(sessionType)
            }
        )

        it('persists entries correctly', async () => {
            const entries = [makeEntry('s1', 85), makeEntry('s2', 70)]
            const result = await sessionRepository.create(makeSession({ entries }))

            const stored = await sessionRepository.getById(result.id as any)
            expect(stored!.entries).toHaveLength(2)
            expect(stored!.entries[0]!.grade).toBe(85)
            expect(stored!.entries[1]!.grade).toBe(70)
        })
    })

    // ─── getByGroupId ─────────────────────────────────────────────────────────

    describe('getByGroupId', () => {
        it('returns empty array when no sessions exist for the group', async () => {
            const result = await sessionRepository.getByGroupId('nonexistent-group')
            expect(result).toEqual([])
        })

        it('returns all sessions for a given group', async () => {
            await sessionRepository.create(makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.MAIN }))
            await sessionRepository.create(makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.FIRST_RETAKE }))
            await sessionRepository.create(makeSession({ groupId: 'g2', sessionType: SessionTypeEnum.MAIN }))

            const result = await sessionRepository.getByGroupId('g1')
            expect(result).toHaveLength(2)
            expect(result.every((s) => s.groupId === 'g1')).toBe(true)
        })

        it('does not return sessions from other groups', async () => {
            await sessionRepository.create(makeSession({ groupId: 'g-other', sessionType: SessionTypeEnum.MAIN }))

            const result = await sessionRepository.getByGroupId('g1')
            expect(result).toHaveLength(0)
        })
    })

    // ─── getGroupSession ──────────────────────────────────────────────────────

    describe('getGroupSession', () => {
        it('returns undefined when no session exists for the group/type combo', async () => {
            const result = await sessionRepository.getGroupSession('g1', SessionTypeEnum.MAIN)
            expect(result).toBeUndefined()
        })

        it('returns the matching session for group + type', async () => {
            const created = await sessionRepository.create(
                makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.MAIN })
            )

            const result = await sessionRepository.getGroupSession('g1', SessionTypeEnum.MAIN)
            expect(result).toBeDefined()
            expect(result!.id).toBe(created.id)
        })

        it('does not return a session for a different type', async () => {
            await sessionRepository.create(makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.FIRST_RETAKE }))

            const result = await sessionRepository.getGroupSession('g1', SessionTypeEnum.MAIN)
            expect(result).toBeUndefined()
        })

        it('does not return a session for a different group', async () => {
            await sessionRepository.create(makeSession({ groupId: 'g2', sessionType: SessionTypeEnum.MAIN }))

            const result = await sessionRepository.getGroupSession('g1', SessionTypeEnum.MAIN)
            expect(result).toBeUndefined()
        })

        it('returns the correct session when multiple groups/types exist', async () => {
            const target = await sessionRepository.create(
                makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.SECOND_RETAKE })
            )
            await sessionRepository.create(makeSession({ groupId: 'g1', sessionType: SessionTypeEnum.MAIN }))
            await sessionRepository.create(makeSession({ groupId: 'g2', sessionType: SessionTypeEnum.SECOND_RETAKE }))

            const result = await sessionRepository.getGroupSession('g1', SessionTypeEnum.SECOND_RETAKE)
            expect(result!.id).toBe(target.id)
        })
    })

    // ─── put / getById (BaseRepository integration) ───────────────────────────

    describe('put and getById', () => {
        it('updates an existing session', async () => {
            const created = await sessionRepository.create(makeSession())

            created.status = SessionStatusEnum.CLOSED
            created.closedAt = '2024-06-10T12:00:00.000Z'
            await sessionRepository.put(created)

            const updated = await sessionRepository.getById(created.id as any)
            expect(updated!.status).toBe(SessionStatusEnum.CLOSED)
            expect(updated!.closedAt).toBe('2024-06-10T12:00:00.000Z')
        })
    })

    // ─── getAll ───────────────────────────────────────────────────────────────

    describe('getAll', () => {
        it('returns empty array when store is empty', async () => {
            expect(await sessionRepository.getAll()).toEqual([])
        })

        it('returns all created sessions', async () => {
            await sessionRepository.create(makeSession({ groupId: 'g1' }))
            await sessionRepository.create(makeSession({ groupId: 'g2' }))
            await sessionRepository.create(makeSession({ groupId: 'g3' }))

            const all = await sessionRepository.getAll()
            expect(all).toHaveLength(3)
        })
    })
})
