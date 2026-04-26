/**
 * D3 — Import pipeline integration test (P2)
 *
 * Tests the full marks-import pipeline:
 *   CSV text → workerForTesting.parseMarksCSV → MarksReconciler.reconcile
 *   → studentsRepository.bulkPut / tasksRepository.bulkPut / marksRepository.bulkSaveSafe
 *   → assertions on the real fake-indexeddb state
 *
 * The Comlink/Worker layer in MarksService is intentionally bypassed here: we call
 * workerForTesting directly so the test does not depend on a Worker environment.
 * This lets us test the reconciliation + persistence logic end-to-end.
 *
 * Static imports are used throughout (not dynamic) so all modules share the same
 * databaseService instance as tests/setup.ts, ensuring connections are properly
 * closed and the DB is deleted between tests.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { marksRepository } from '../../src/modules/Marks/services/marks.repository'
import { MarksReconciler } from '../../src/modules/Marks/services/reconciliation/MarksReconciler'
import { studentsRepository } from '../../src/modules/Students/services/students.repository'
import { tasksRepository } from '../../src/modules/Tasks/services/tasks.repository'
import { databaseService } from '../../src/shared/services/DatabaseService'
import { workerForTesting } from '../../src/workers/parser.worker.js'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Build a minimal Marks CSV string following the 4-row header convention. */
function buildMarksCsv(rows: {
    lastName: string
    firstName: string
    email: string
    scores: (number | null)[]
}[], tasks: { name: string, date: string, maxPoints: number }[]): string {
    const header = ['Surname', 'Name', 'Email', ...tasks.map(t => t.name)]
    const dates = ['', '', '', ...tasks.map(t => t.date)]
    const maxPts = ['', '', '', ...tasks.map(t => String(t.maxPoints))]

    const dataRows = rows.map(r => [
        r.lastName,
        r.firstName,
        r.email,
        ...r.scores.map(s => (s === null ? '' : String(s))),
    ])

    return [header, dates, maxPts, ...dataRows]
        .map(row => row.join(','))
        .join('\n')
}

const GROUP_NAME = 'IM-31'

const TASKS = [
    { name: 'Lab 1', date: '2024-02-01', maxPoints: 10 },
    { name: 'Lab 2', date: '2024-02-08', maxPoints: 10 },
]

const STUDENTS = [
    { lastName: 'Doe', firstName: 'John', email: 'john.doe@example.com', scores: [8, 9] },
    { lastName: 'Smith', firstName: 'Jane', email: 'jane.smith@example.com', scores: [7, null] },
    { lastName: 'Brown', firstName: 'Bob', email: 'bob.brown@example.com', scores: [null, 6] },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('marks import pipeline (integration)', () => {
    let reconciler: MarksReconciler

    beforeEach(async () => {
        reconciler = new MarksReconciler()
        // Ensure DB schema is initialised (fake-indexeddb was reset by global beforeEach).
        await databaseService.getDb()
    })

    /** Run one full import cycle and return the reconciled data. */
    async function runImport(students = STUDENTS, tasks = TASKS) {
        const csv = buildMarksCsv(students, tasks)
        const parsedData = workerForTesting.parseMarksCSV(csv, 'IM-31_marks.csv', GROUP_NAME)
        const { students: s, tasks: t, marks: m } = await reconciler.reconcile(parsedData, GROUP_NAME)
        if (s.length)
            await studentsRepository.bulkPut(s)
        if (t.length)
            await tasksRepository.bulkPut(t)
        const stats = m.length ? await marksRepository.bulkSaveSafe(m) : { added: 0, updated: 0, skipped: 0 }
        return stats
    }

    // ── 1. Basic import ─────────────────────────────────────────────────────

    it('persists correct number of members, tasks, and marks', async () => {
        await runImport()

        const dbMembers = await studentsRepository.getAllMembers()
        const dbTasks = await tasksRepository.getAllTasks()
        const dbMarks = await marksRepository.getAllMarks()

        expect(dbMembers).toHaveLength(3)
        expect(dbTasks).toHaveLength(2)
        // John: 2 marks, Jane: 1 mark (Lab 1 only), Bob: 1 mark (Lab 2 only)
        expect(dbMarks).toHaveLength(4)
    })

    it('stores member names as "lastName firstName"', async () => {
        await runImport()

        const dbMembers = await studentsRepository.getAllMembers()
        const names = dbMembers.map(m => m.name).sort()

        expect(names).toContain('Doe John')
        expect(names).toContain('Smith Jane')
        expect(names).toContain('Brown Bob')
    })

    it('stores correct task names and normalizedNames', async () => {
        await runImport()

        const dbTasks = await tasksRepository.getAllTasks()
        expect(dbTasks.find(t => t.name === 'Lab 1')?.normalizedName).toBe('lab1')
        expect(dbTasks.find(t => t.name === 'Lab 2')?.normalizedName).toBe('lab2')
    })

    it('stores correct scores for each student-task pair', async () => {
        await runImport()

        const dbMembers = await studentsRepository.getAllMembers()
        const dbTasks = await tasksRepository.getAllTasks()
        const dbMarks = await marksRepository.getAllMarks()

        const john = dbMembers.find(m => m.name === 'Doe John')!
        const lab1 = dbTasks.find(t => t.name === 'Lab 1')!
        const lab2 = dbTasks.find(t => t.name === 'Lab 2')!

        const johnLab1 = dbMarks.find(m => m.studentId === john.id && m.taskId === String(lab1.id))
        const johnLab2 = dbMarks.find(m => m.studentId === john.id && m.taskId === String(lab2.id))

        expect(johnLab1?.score).toBe(8)
        expect(johnLab2?.score).toBe(9)
    })

    // ── 2. Re-import idempotency ─────────────────────────────────────────────

    it('skips marks that already exist with the same score on re-import', async () => {
        const stats1 = await runImport()
        expect(stats1.added).toBe(4)

        const stats2 = await runImport()
        expect(stats2.added).toBe(0)

        // No duplicates created
        const dbMarks = await marksRepository.getAllMarks()
        expect(dbMarks).toHaveLength(4)
    })

    it('updates marks whose score changed on re-import', async () => {
        await runImport()

        // Re-import with John's Lab 1 score changed 8 → 10
        const updatedStudents = STUDENTS.map(s =>
            s.lastName === 'Doe' ? { ...s, scores: [10, 9] } : s,
        )
        const stats2 = await runImport(updatedStudents)

        expect(stats2.updated).toBe(1)

        const dbMembers = await studentsRepository.getAllMembers()
        const dbTasks = await tasksRepository.getAllTasks()
        const dbMarks = await marksRepository.getAllMarks()

        const john = dbMembers.find(m => m.name === 'Doe John')!
        const lab1 = dbTasks.find(t => t.name === 'Lab 1')!
        const johnLab1 = dbMarks.find(m => m.studentId === john.id && m.taskId === String(lab1.id))

        expect(johnLab1?.score).toBe(10)
        expect(dbMarks).toHaveLength(4) // count unchanged
    })

    // ── 3. Identity reconciliation ───────────────────────────────────────────

    it('reuses existing member by email match even if name differs', async () => {
        await runImport()

        // Second import with same emails but uppercase first names
        const altStudents = STUDENTS.map(s => ({ ...s, firstName: s.firstName.toUpperCase() }))
        await runImport(altStudents)

        // Should still be 3 members — identity reconciler matched by email
        const dbMembers = await studentsRepository.getAllMembers()
        expect(dbMembers).toHaveLength(3)
    })

    // ── 4. Task deduplication ────────────────────────────────────────────────

    it('does not duplicate tasks across two imports of the same CSV', async () => {
        await runImport()
        await runImport()

        const dbTasks = await tasksRepository.getAllTasks()
        expect(dbTasks).toHaveLength(2)
    })
})
