import type { StudentSummaryData } from '../../types/summary'
import { describe, expect, it, vi } from 'vitest'
import { exportSummaryCsv, exportSummaryDocx, extractModuleNames } from '../summaryExport.service'

vi.mock('@/i18n', () => ({
    default: {
        global: {
            t: (key: string) => key,
        },
    },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStudent(
    name: string,
    moduleGrades: Record<string, string | number | null> = {},
    overrides: Partial<StudentSummaryData> = {},
): StudentSummaryData {
    return {
        id: `id-${name}`,
        name,
        aliases: [],
        groups: ['G1'],
        marks: [],
        sessionCount: 5,
        totalSessions: 10,
        totalDuration: 3600,
        averageAttendancePercent: 75,
        averageMark: 4,
        totalTasks: 10,
        completedTasks: 8,
        completionPercent: 80,
        completion: 80,
        completionExact: '80.00',
        completionDetails: '',
        attendance: 75,
        attendanceExact: '75.00',
        attendanceDetails: '',
        status: 'allowed',
        statusCause: '',
        isAllowed: true,
        moduleGrades,
        moduleDetails: {},
        total: 4.5,
        totalRaw: 90,
        examGrade: 5,
        examGradeRaw: 100,
        examIsAuto: false,
        completedAt: null,
        meets: [],
        ...overrides,
    } as StudentSummaryData
}

async function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(blob, 'utf-8')
    })
}

// ─── extractModuleNames ───────────────────────────────────────────────────────

describe('extractModuleNames', () => {
    it('returns an empty array when students list is empty', () => {
        expect(extractModuleNames([])).toEqual([])
    })

    it('returns an empty array when all students have empty moduleGrades', () => {
        expect(extractModuleNames([makeStudent('Alice'), makeStudent('Bob')])).toEqual([])
    })

    it('returns keys from the first student that has grades', () => {
        const students = [
            makeStudent('Alice', {}),
            makeStudent('Bob', { 'Module 1': 4, 'Module 2': 5 }),
        ]
        expect(extractModuleNames(students)).toEqual(['Module 1', 'Module 2'])
    })

    it('returns keys from the first student even if later students have more', () => {
        const students = [
            makeStudent('Alice', { 'Mod A': 3 }),
            makeStudent('Bob', { 'Mod A': 4, 'Mod B': 5 }),
        ]
        expect(extractModuleNames(students)).toEqual(['Mod A'])
    })
})

// ─── exportSummaryCsv ─────────────────────────────────────────────────────────

describe('exportSummaryCsv', () => {
    it('returns a Blob', () => {
        const result = exportSummaryCsv([], 'Group 1')
        expect(result).toBeInstanceOf(Blob)
    })

    it('returns a CSV MIME type', () => {
        const result = exportSummaryCsv([], 'Group 1')
        expect(result.type).toContain('text/csv')
    })

    it('starts with a UTF-8 BOM', async () => {
        const blob = exportSummaryCsv([], 'Group 1')
        // FileReader strips the BOM when decoding UTF-8; re-encode the stripped text
        // and compare sizes — the original blob should be 3 bytes larger (BOM = EF BB BF)
        const text = await readBlob(blob)
        const noBomBlob = new Blob([text], { type: 'text/csv;charset=utf-8' })
        expect(blob.size - noBomBlob.size).toBe(3)
    })

    it('includes the group name in the title row', async () => {
        const blob = exportSummaryCsv([], 'Physics 101')
        const text = await readBlob(blob)
        expect(text).toContain('Physics 101')
    })

    it('includes i18n header keys in the header row', async () => {
        const blob = exportSummaryCsv([], 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('control.settings.summaryExport.colName')
        expect(text).toContain('control.settings.summaryExport.colTotal')
        expect(text).toContain('control.settings.summaryExport.colExam')
    })

    it('includes a # column in the header', async () => {
        const blob = exportSummaryCsv([], 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('#')
    })

    it('includes module names as columns in the header', async () => {
        const students = [makeStudent('Alice', { 'Module A': 4, 'Module B': 5 })]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('Module A')
        expect(text).toContain('Module B')
    })

    it('outputs one data row per student', async () => {
        const students = [makeStudent('Alice', { 'Mod 1': 4 }), makeStudent('Bob', { 'Mod 1': 3 })]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('Alice')
        expect(text).toContain('Bob')
    })

    it('sorts students alphabetically by name', async () => {
        const students = [
            makeStudent('Zelda', { M: 5 }),
            makeStudent('Alice', { M: 4 }),
            makeStudent('Bob', { M: 3 }),
        ]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        const alicePos = text.indexOf('Alice')
        const bobPos = text.indexOf('Bob')
        const zeldaPos = text.indexOf('Zelda')
        expect(alicePos).toBeLessThan(bobPos)
        expect(bobPos).toBeLessThan(zeldaPos)
    })

    it('includes row numbers starting from 1', async () => {
        const students = [makeStudent('Alice', { M: 4 }), makeStudent('Bob', { M: 5 })]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        const lines = text.split('\r\n')
        const dataRows = lines.filter((l) => /^\d+,/.test(l))
        expect(dataRows[0]).toMatch(/^1,/)
        expect(dataRows[1]).toMatch(/^2,/)
    })

    it('outputs module grade values in data rows', async () => {
        const students = [makeStudent('Alice', { 'Mod X': 4.5 })]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('4.5')
    })

    it('outputs empty string for null module grades', async () => {
        const students = [makeStudent('Alice', { 'Mod Y': null })]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        const dataLine = text.split('\r\n').find((l) => l.includes('Alice'))!
        // null → cellValue → '' → adjacent commas
        expect(dataLine).toContain(',,')
    })

    it('wraps values containing commas in quotes', async () => {
        const students = [makeStudent('Smith, John', {})]
        const blob = exportSummaryCsv(students, 'G1')
        const text = await readBlob(blob)
        expect(text).toContain('"Smith, John"')
    })
})

// ─── exportSummaryDocx ────────────────────────────────────────────────────────

describe('exportSummaryDocx', () => {
    it('returns a Blob', () => {
        const result = exportSummaryDocx([], 'Group 1')
        expect(result).toBeInstanceOf(Blob)
    })

    it('returns the correct DOCX MIME type', () => {
        const result = exportSummaryDocx([], 'Group 1')
        expect(result.type).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
    })

    it('returns a non-empty Blob', () => {
        const result = exportSummaryDocx([], 'Group 1')
        expect(result.size).toBeGreaterThan(0)
    })

    it('produces a larger file when students are provided', () => {
        const empty = exportSummaryDocx([], 'G1')
        const withStudents = exportSummaryDocx(
            [makeStudent('Alice', { 'Mod 1': 4 }), makeStudent('Bob', { 'Mod 1': 5 })],
            'G1',
        )
        expect(withStudents.size).toBeGreaterThan(empty.size)
    })
})
