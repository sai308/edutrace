import { describe, expect, it } from 'vitest'
import { databaseService } from '../DatabaseService'
import * as statsService from '../stats.service'

// ─── getEntityCounts ──────────────────────────────────────────────────────────

describe('getEntityCounts', () => {
    it('returns zero for all entities when the database is empty', async () => {
        const counts = await statsService.getEntityCounts()

        expect(counts.reports).toBe(0)
        expect(counts.groups).toBe(0)
        expect(counts.marks).toBe(0)
        expect(counts.tasks).toBe(0)
        expect(counts.members).toBe(0)
        expect(counts.finalAssessments).toBe(0)
        expect(counts.modules).toBe(0)
        expect(counts.units).toBe(0)
        expect(counts.documentSessions).toBe(0)
        expect(counts.plans).toBe(0)
    })

    it('counts meets correctly (reported as "reports")', async () => {
        const db = await databaseService.getDb()
        await db.put('meets', {
            id: 'm1',
            meetId: 'abc-001',
            date: '2024-01-01',
            filename: 'f1.csv',
            participants: [],
        })
        await db.put('meets', {
            id: 'm2',
            meetId: 'abc-002',
            date: '2024-01-08',
            filename: 'f2.csv',
            participants: [],
        })

        const counts = await statsService.getEntityCounts()

        expect(counts.reports).toBe(2)
    })

    it('counts groups correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'g1', meetId: 'cnt-001', name: 'Count Group A' })
        await db.put('groups', { id: 'g2', meetId: 'cnt-002', name: 'Count Group B' })
        await db.put('groups', { id: 'g3', meetId: 'cnt-003', name: 'Count Group C' })

        const counts = await statsService.getEntityCounts()

        expect(counts.groups).toBe(3)
    })

    it('counts tasks correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', {
            id: '1',
            name: 'Count Task',
            normalizedName: 'counttask',
            maxPoints: 10,
        } as any)

        const counts = await statsService.getEntityCounts()

        expect(counts.tasks).toBe(1)
    })

    it('counts marks correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 1,
            taskId: '1',
            studentId: 's1',
            score: 80,
            value: 80,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })
        await db.put('marks', {
            id: 2,
            taskId: '1',
            studentId: 's2',
            score: 90,
            value: 90,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })

        const counts = await statsService.getEntityCounts()

        expect(counts.marks).toBe(2)
    })

    it('counts members correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'cnt-s1',
            name: 'Count Student A',
            role: 'student',
            groupName: 'G1',
        })
        await db.put('members', {
            id: 'cnt-s2',
            name: 'Count Student B',
            role: 'teacher',
            groupName: null,
        })

        const counts = await statsService.getEntityCounts()

        expect(counts.members).toBe(2)
    })

    it('counts finalAssessments correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('finalAssessments', {
            id: 1,
            studentId: 'cnt-fa1',
            assessmentType: 'exam',
            value: 90,
        })
        await db.put('finalAssessments', {
            id: 2,
            studentId: 'cnt-fa2',
            assessmentType: 'exam',
            value: 80,
        })

        const counts = await statsService.getEntityCounts()

        expect(counts.finalAssessments).toBe(2)
    })

    it('counts units correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('units', {
            id: 1,
            name: 'Cnt Unit A',
            normalizedName: 'cntunita',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 1,
        })

        const counts = await statsService.getEntityCounts()

        expect(counts.units).toBe(1)
    })

    it('counts modules correctly', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 1, groupId: 'g1', groupName: 'G1', name: 'Cnt Module' })

        const counts = await statsService.getEntityCounts()

        expect(counts.modules).toBe(1)
    })

    it('returns all entity types in the result object', async () => {
        const counts = await statsService.getEntityCounts()

        expect(counts).toHaveProperty('reports')
        expect(counts).toHaveProperty('groups')
        expect(counts).toHaveProperty('marks')
        expect(counts).toHaveProperty('tasks')
        expect(counts).toHaveProperty('members')
        expect(counts).toHaveProperty('finalAssessments')
        expect(counts).toHaveProperty('modules')
        expect(counts).toHaveProperty('units')
        expect(counts).toHaveProperty('documentSessions')
        expect(counts).toHaveProperty('plans')
    })
})

// ─── getEntitySizes ───────────────────────────────────────────────────────────

describe('getEntitySizes', () => {
    it('returns numeric values for all size keys when empty', async () => {
        const sizes = await statsService.getEntitySizes()

        expect(typeof sizes.reports).toBe('number')
        expect(typeof sizes.groups).toBe('number')
        expect(typeof sizes.marks).toBe('number')
        expect(typeof sizes.tasks).toBe('number')
        expect(typeof sizes.members).toBe('number')
        expect(typeof sizes.summary).toBe('number')
        expect(typeof sizes.documentSessions).toBe('number')
        expect(typeof sizes.plans).toBe('number')
    })

    it('returns all size keys in the result object', async () => {
        const sizes = await statsService.getEntitySizes()

        expect(sizes).toHaveProperty('reports')
        expect(sizes).toHaveProperty('groups')
        expect(sizes).toHaveProperty('marks')
        expect(sizes).toHaveProperty('tasks')
        expect(sizes).toHaveProperty('members')
        expect(sizes).toHaveProperty('summary')
        expect(sizes).toHaveProperty('documentSessions')
        expect(sizes).toHaveProperty('plans')
    })

    it('reports size grows when a meet is added', async () => {
        const before = await statsService.getEntitySizes()
        const beforeSize = before.reports

        const db = await databaseService.getDb()
        await db.put('meets', {
            id: 'sz-m1',
            meetId: 'sz-001',
            date: '2024-01-01',
            filename: 'f.csv',
            participants: [{ name: 'Alice', duration: 3600 }],
        })

        const after = await statsService.getEntitySizes()

        expect(after.reports).toBeGreaterThan(beforeSize)
    })

    it('groups size grows when a group is added', async () => {
        const before = await statsService.getEntitySizes()

        const db = await databaseService.getDb()
        await db.put('groups', { id: 'sz-g1', meetId: 'sz-grp-001', name: 'Size Test Group' })

        const after = await statsService.getEntitySizes()

        expect(after.groups).toBeGreaterThan(before.groups)
    })

    it('summary size grows when a unit is added', async () => {
        const before = await statsService.getEntitySizes()

        const db = await databaseService.getDb()
        await db.put('units', {
            id: 99,
            name: 'Size Unit',
            normalizedName: 'sizeunit',
            taskIds: ['t1', 't2', 't3'],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 1,
        })

        const after = await statsService.getEntitySizes()

        expect(after.summary).toBeGreaterThan(before.summary)
    })

    it('marks size grows when a mark is added', async () => {
        const before = await statsService.getEntitySizes()

        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 99,
            taskId: '1',
            studentId: 'sz-s1',
            score: 95,
            value: 95,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })

        const after = await statsService.getEntitySizes()

        expect(after.marks).toBeGreaterThan(before.marks)
    })

    it('all sizes are non-negative numbers', async () => {
        const sizes = await statsService.getEntitySizes()

        for (const [, val] of Object.entries(sizes)) {
            expect(val).toBeGreaterThanOrEqual(0)
        }
    })
})
