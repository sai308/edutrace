import { describe, expect, it } from 'vitest'
import { databaseService } from '@/shared/services/DatabaseService'
import { marksRepository } from '../marks.repository'

async function getDb() {
    return databaseService.getDb()
}

// Seed helpers — insert directly into IDB, bypassing repo validation
async function seedTask(id: string, name = 'Task', maxPoints = 100) {
    const db = await getDb()
    await db.put('tasks', {
        id,
        name,
        normalizedName: name.toLowerCase(),
        maxPoints,
        date: '2024-01-01',
    } as any)
}

async function seedMember(id: string, name = 'Student', groupName = 'GroupA') {
    const db = await getDb()
    await db.put('members', { id, name, groupName, role: 'student' } as any)
}

function makeMark(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'mark-1',
        taskId: 'task-1',
        studentId: 'student-1',
        groupName: 'GroupA',
        score: 80,
        value: 80,
        synced: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

describe('marksRepository', () => {
    describe('_validateMark (via saveMark)', () => {
        it('throws if taskId is missing', async () => {
            await expect(
                marksRepository.saveMark({ studentId: 's1', taskId: '', groupName: 'G' } as any),
            ).rejects.toThrow('Mark.taskId is required')
        })

        it('throws if studentId is missing', async () => {
            await expect(
                marksRepository.saveMark({ taskId: 't1', studentId: '', groupName: 'G' } as any),
            ).rejects.toThrow('Mark.studentId is required')
        })

        it('throws if groupName is missing', async () => {
            await expect(
                marksRepository.saveMark({ taskId: 't1', studentId: 's1', groupName: '' } as any),
            ).rejects.toThrow('Mark.groupName is required')
        })
    })

    describe('saveMark', () => {
        it('inserts a new mark and returns isNew = true', async () => {
            const result = await marksRepository.saveMark({
                taskId: 'task-new',
                studentId: 'student-new',
                groupName: 'GroupA',
                score: 75,
                value: 75,
                synced: false,
                createdAt: new Date().toISOString(),
            })

            expect(result.isNew).toBe(true)
            expect(result.id).toBeDefined()
        })

        it('skips overwrite if existing mark is synced', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'sm-synced',
                    taskId: 'tsync',
                    studentId: 'ssync',
                    synced: true,
                    score: 90,
                }) as any,
            )

            const result = await marksRepository.saveMark({
                taskId: 'tsync',
                studentId: 'ssync',
                groupName: 'GroupA',
                score: 50,
                value: 50,
            })

            expect(result.skipped).toBe(true)
            expect(result.isNew).toBe(false)

            const stored = await db.get('marks', 'sm-synced' as any)
            expect(stored?.score).toBe(90) // unchanged
        })

        it('updates mark when score changes and not synced', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'sm-update',
                    taskId: 'tupd',
                    studentId: 'supd',
                    synced: false,
                    score: 60,
                }) as any,
            )

            const result = await marksRepository.saveMark({
                taskId: 'tupd',
                studentId: 'supd',
                groupName: 'GroupA',
                score: 85,
                value: 85,
            })

            expect(result.updated).toBe(true)

            const stored = await db.get('marks', 'sm-update' as any)
            expect(stored?.score).toBe(85)
        })
    })

    describe('bulkSaveSafe', () => {
        it('adds new marks and returns added count', async () => {
            const marks = [
                makeMark({ id: 'bm-1', taskId: 'bmt1', studentId: 'bms1', score: 70 }),
                makeMark({ id: 'bm-2', taskId: 'bmt2', studentId: 'bms2', score: 80 }),
            ]

            const stats = await marksRepository.bulkSaveSafe(marks)

            expect(stats.added).toBe(2)
            expect(stats.updated).toBe(0)
            expect(stats.skipped).toBe(0)
        })

        it('skips marks with unchanged score (not synced)', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'bm-skip',
                    taskId: 'bmt-skip',
                    studentId: 'bms-skip',
                    score: 70,
                    synced: false,
                }) as any,
            )

            const stats = await marksRepository.bulkSaveSafe([
                makeMark({ id: 'bm-skip', taskId: 'bmt-skip', studentId: 'bms-skip', score: 70 }),
            ])

            expect(stats.added).toBe(0)
            expect(stats.updated).toBe(0)
            expect(stats.skipped).toBe(1)
        })

        it('updates marks with changed score (not synced)', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'bm-upd',
                    taskId: 'bmt-upd',
                    studentId: 'bms-upd',
                    score: 70,
                    synced: false,
                }) as any,
            )

            const stats = await marksRepository.bulkSaveSafe([
                makeMark({ id: 'bm-upd', taskId: 'bmt-upd', studentId: 'bms-upd', score: 95 }),
            ])

            expect(stats.updated).toBe(1)
            expect(stats.skipped).toBe(0)

            const stored = await db.get('marks', 'bm-upd' as any)
            expect(stored?.score).toBe(95)
        })

        it('skips synced marks regardless of score change', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'bm-prot',
                    taskId: 'bmt-prot',
                    studentId: 'bms-prot',
                    score: 70,
                    synced: true,
                }) as any,
            )

            const stats = await marksRepository.bulkSaveSafe([
                makeMark({ id: 'bm-prot', taskId: 'bmt-prot', studentId: 'bms-prot', score: 99 }),
            ])

            expect(stats.skipped).toBe(1)
            expect(stats.updated).toBe(0)

            const stored = await db.get('marks', 'bm-prot' as any)
            expect(stored?.score).toBe(70) // unchanged
        })

        it('throws validation error for marks missing required fields', async () => {
            await expect(
                marksRepository.bulkSaveSafe([
                    {
                        id: 'm1',
                        taskId: '',
                        studentId: 's1',
                        groupName: 'G',
                        score: 80,
                        value: 80,
                        synced: false,
                        createdAt: '',
                    },
                ]),
            ).rejects.toThrow('Mark.taskId is required')
        })
    })

    describe('updateMarkSynced', () => {
        it('sets synced = true and records syncedAt timestamp', async () => {
            const db = await getDb()
            await db.put('marks', makeMark({ id: 'sync-on', synced: false }) as any)

            await marksRepository.updateMarkSynced('sync-on', true)

            const stored = await db.get('marks', 'sync-on' as any)
            expect((stored as any).synced).toBe(true)
            expect((stored as any).syncedAt).toBeTruthy()
        })

        it('sets synced = false and clears syncedAt', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({ id: 'sync-off', synced: true, syncedAt: '2024-01-01T00:00:00Z' }) as any,
            )

            await marksRepository.updateMarkSynced('sync-off', false)

            const stored = await db.get('marks', 'sync-off' as any)
            expect((stored as any).synced).toBe(false)
            expect((stored as any).syncedAt).toBeNull()
        })

        it('is a no-op for unknown id', async () => {
            await expect(
                marksRepository.updateMarkSynced('nonexistent', true),
            ).resolves.toBeUndefined()
        })
    })

    describe('deleteMarks', () => {
        it('removes marks by ids', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({ id: 'del-1', taskId: 'del-t1', studentId: 'del-s1' }) as any,
            )
            await db.put(
                'marks',
                makeMark({ id: 'del-2', taskId: 'del-t2', studentId: 'del-s2' }) as any,
            )

            await marksRepository.deleteMarks(['del-1', 'del-2'])

            expect(await db.get('marks', 'del-1' as any)).toBeUndefined()
            expect(await db.get('marks', 'del-2' as any)).toBeUndefined()
        })
    })

    describe('getAllMarksWithRelations', () => {
        it('returns denormalized marks with student and task names', async () => {
            await seedTask('task-rel-1', 'Exam 1', 100)
            await seedMember('student-rel-1', 'Alice', 'GroupA')
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'rel-m1',
                    taskId: 'task-rel-1',
                    studentId: 'student-rel-1',
                    score: 88,
                }) as any,
            )

            const flat = await marksRepository.getAllMarksWithRelations()
            const found = flat.find((m) => m.id === 'rel-m1')

            expect(found).toBeDefined()
            expect(found!.studentName).toBe('Alice')
            expect(found!.taskName).toBe('Exam 1')
            expect(found!.score).toBe(88)
        })

        it('skips marks with missing task or student references', async () => {
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'orphan-m',
                    taskId: 'ghost-task',
                    studentId: 'ghost-student',
                }) as any,
            )

            const flat = await marksRepository.getAllMarksWithRelations()
            expect(flat.every((m) => m.id !== 'orphan-m')).toBe(true)
        })
    })

    describe('getMarksByGroupWithRelations', () => {
        it('returns only marks for the given group', async () => {
            await seedTask('task-grp-1', 'Quiz', 50)
            await seedMember('s-grp-1', 'Bob', 'GroupB')
            await seedMember('s-grp-2', 'Carol', 'GroupC')
            const db = await getDb()
            await db.put(
                'marks',
                makeMark({
                    id: 'grp-m1',
                    taskId: 'task-grp-1',
                    studentId: 's-grp-1',
                    groupName: 'GroupB',
                }) as any,
            )
            await db.put(
                'marks',
                makeMark({
                    id: 'grp-m2',
                    taskId: 'task-grp-1',
                    studentId: 's-grp-2',
                    groupName: 'GroupC',
                }) as any,
            )

            const flat = await marksRepository.getMarksByGroupWithRelations('GroupB')

            expect(flat).toHaveLength(1)
            expect(flat[0]!.studentName).toBe('Bob')
            expect(flat[0]!.groupName).toBe('GroupB')
        })

        it('returns empty array when no marks exist for group', async () => {
            const flat = await marksRepository.getMarksByGroupWithRelations('NonExistentGroup')
            expect(flat).toHaveLength(0)
        })
    })
})
