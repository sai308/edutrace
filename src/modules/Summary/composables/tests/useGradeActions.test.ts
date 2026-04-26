import type { StudentSummaryData } from '@Summary/types/summary'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Mock summaryService before importing the composable
vi.mock('@Summary/services/summary.service', () => ({
    summaryService: {
        saveFinalAssessment: vi.fn().mockResolvedValue({ id: 1, isNew: true, updated: false }),
        getFinalAssessmentByStudent: vi.fn().mockResolvedValue(undefined),
        deleteFinalAssessment: vi.fn().mockResolvedValue(undefined),
    },
}))

// Helper to build a minimal StudentSummaryData for testing
function makeStudent(overrides: Partial<StudentSummaryData> = {}): StudentSummaryData {
    return {
        id: 's1',
        name: 'Alice',
        email: '',
        aliases: [],
        groups: ['G1'],
        marks: [],
        sessionCount: 5,
        totalSessions: 5,
        totalDuration: 1800,
        averageAttendancePercent: 100,
        averageMark: 90,
        totalTasks: 10,
        completedTasks: 10,
        completionPercent: 100,
        completion: 100,
        completionExact: '100.00',
        completionDetails: '',
        attendance: 100,
        attendanceExact: '100.00',
        attendanceDetails: '',
        status: 'automatic',
        statusCause: '',
        isAllowed: true,
        moduleGrades: {},
        moduleDetails: {},
        total: '90',
        totalRaw: 90,
        examGrade: null,
        examGradeRaw: null,
        examIsAuto: false,
        completedAt: null,
        meets: [],
        ...overrides,
    }
}

describe('useGradeActions', () => {
    let summaryService: any

    beforeEach(async () => {
        vi.clearAllMocks()
        summaryService = (await import('@Summary/services/summary.service')).summaryService
    })

    async function setupComposable(
        initialStudents: StudentSummaryData[] = [makeStudent()],
        format = '100-scale',
    ) {
        const { useGradeActions } = await import('@Summary/composables/useGradeActions')
        const students = ref(initialStudents)
        const selectedFormat = ref(format)
        return { ...useGradeActions(students, selectedFormat), students, selectedFormat }
    }

    describe('handleGradeAction - auto', () => {
        it('sets examGrade to student total and marks as unsaved', async () => {
            vi.useFakeTimers()
            const student = makeStudent({ total: '90', totalRaw: 90, examGrade: null })
            const { handleGradeAction, students } = await setupComposable([student])

            handleGradeAction({ action: 'auto', student })
            vi.runAllTimers()

            expect(students.value[0]!.examGrade).toBe('90')
            expect(students.value[0]!.completedAt).toBeNull()
            expect(students.value[0]!.examIsAuto).toBe(true)
            vi.useRealTimers()
        })
    })

    describe('handleGradeAction - manual', () => {
        it('opens manual dialog and sets actionTarget', async () => {
            vi.useFakeTimers()
            const student = makeStudent()
            const { handleGradeAction, isManualDialogOpen, actionTarget } = await setupComposable([
                student,
            ])

            handleGradeAction({ action: 'manual', student })
            vi.runAllTimers()

            expect(isManualDialogOpen.value).toBe(true)
            expect(actionTarget.value?.id).toBe('s1')
            vi.useRealTimers()
        })
    })

    describe('handleGradeAction - save', () => {
        it('saves an auto grade using totalRaw directly', async () => {
            vi.useFakeTimers()
            const student = makeStudent({
                examGrade: '90',
                examIsAuto: true,
                totalRaw: 90,
                completedAt: null,
            })
            const { handleGradeAction, students } = await setupComposable([student], '5-scale')

            handleGradeAction({ action: 'save', student })
            vi.runAllTimers()
            await vi.runAllTimersAsync()

            expect(summaryService.saveFinalAssessment).toHaveBeenCalledWith(
                expect.objectContaining({ value: '90', isAuto: true }),
            )
            expect(students.value[0]!.completedAt).not.toBeNull()
            vi.useRealTimers()
        })

        it('converts a manual grade from display format to 100-point', async () => {
            vi.useFakeTimers()
            // Grade "4" in 5-scale → 82 in 100-point
            const student = makeStudent({
                examGrade: '4',
                examIsAuto: false,
                totalRaw: 90,
                total: '5',
                completedAt: null,
            })
            const { handleGradeAction } = await setupComposable([student], '5-scale')

            handleGradeAction({ action: 'save', student })
            vi.runAllTimers()
            await vi.runAllTimersAsync()

            expect(summaryService.saveFinalAssessment).toHaveBeenCalledWith(
                expect.objectContaining({ value: '82', isAuto: false }),
            )
            vi.useRealTimers()
        })

        it('skips save when examGrade is empty', async () => {
            vi.useFakeTimers()
            const student = makeStudent({ examGrade: '' })
            const { handleGradeAction } = await setupComposable([student])

            handleGradeAction({ action: 'save', student })
            vi.runAllTimers()
            await vi.runAllTimersAsync()

            expect(summaryService.saveFinalAssessment).not.toHaveBeenCalled()
            vi.useRealTimers()
        })
    })

    describe('handleGradeAction - remove', () => {
        it('opens delete dialog and sets actionTarget', async () => {
            vi.useFakeTimers()
            const student = makeStudent()
            const { handleGradeAction, isDeleteDialogOpen, actionTarget } = await setupComposable([
                student,
            ])

            handleGradeAction({ action: 'remove', student })
            vi.runAllTimers()

            expect(isDeleteDialogOpen.value).toBe(true)
            expect(actionTarget.value?.id).toBe('s1')
            vi.useRealTimers()
        })
    })

    describe('handleSaveAll', () => {
        it('saves all students with an unsaved grade', async () => {
            const s1 = makeStudent({
                id: 's1',
                examGrade: '90',
                examIsAuto: true,
                totalRaw: 90,
                completedAt: null,
            })
            const s2 = makeStudent({
                id: 's2',
                examGrade: '80',
                examIsAuto: true,
                totalRaw: 80,
                completedAt: null,
            })
            const s3 = makeStudent({
                id: 's3',
                examGrade: '75',
                completedAt: '2024-01-01T00:00:00Z',
            }) // already saved

            const { handleSaveAll } = await setupComposable([s1, s2, s3])
            await handleSaveAll()

            expect(summaryService.saveFinalAssessment).toHaveBeenCalledTimes(2)
        })

        it('marks each student as saved after persisting', async () => {
            const student = makeStudent({
                examGrade: '85',
                examIsAuto: true,
                totalRaw: 85,
                completedAt: null,
            })
            const { handleSaveAll, students } = await setupComposable([student])

            await handleSaveAll()

            expect(students.value[0]!.completedAt).not.toBeNull()
        })

        it('skips students with null examGrade', async () => {
            const student = makeStudent({ examGrade: null })
            const { handleSaveAll } = await setupComposable([student])

            await handleSaveAll()

            expect(summaryService.saveFinalAssessment).not.toHaveBeenCalled()
        })
    })

    describe('handleDeleteConfirm', () => {
        it('clears local grade state after deletion', async () => {
            const student = makeStudent({ examGrade: '90', completedAt: '2024-01-01T00:00:00Z' })
            const { handleGradeAction, handleDeleteConfirm, students } = await setupComposable([
                student,
            ])

            vi.useFakeTimers()
            handleGradeAction({ action: 'remove', student })
            vi.runAllTimers()
            vi.useRealTimers()

            summaryService.getFinalAssessmentByStudent.mockResolvedValue({ id: 42 })
            await handleDeleteConfirm()

            expect(summaryService.deleteFinalAssessment).toHaveBeenCalledWith(42)
            expect(students.value[0]!.examGrade).toBeNull()
            expect(students.value[0]!.completedAt).toBeNull()
        })

        it('does nothing when no actionTarget is set', async () => {
            const { handleDeleteConfirm } = await setupComposable([makeStudent()])
            await handleDeleteConfirm() // actionTarget is null

            expect(summaryService.deleteFinalAssessment).not.toHaveBeenCalled()
        })
    })

    describe('handleManualConfirm', () => {
        it('sets grade and marks student as unsaved', async () => {
            const student = makeStudent({ examGrade: null })
            const { handleGradeAction, handleManualConfirm, students } = await setupComposable([
                student,
            ])

            vi.useFakeTimers()
            handleGradeAction({ action: 'manual', student })
            vi.runAllTimers()
            vi.useRealTimers()

            handleManualConfirm('B+')

            expect(students.value[0]!.examGrade).toBe('B+')
            expect(students.value[0]!.completedAt).toBeNull()
            expect(students.value[0]!.examIsAuto).toBe(false)
        })

        it('trims whitespace from the grade', async () => {
            const student = makeStudent()
            const { handleGradeAction, handleManualConfirm, students } = await setupComposable([
                student,
            ])

            vi.useFakeTimers()
            handleGradeAction({ action: 'manual', student })
            vi.runAllTimers()
            vi.useRealTimers()

            handleManualConfirm('  75  ')

            expect(students.value[0]!.examGrade).toBe('75')
        })

        it('does nothing when grade is blank', async () => {
            const student = makeStudent({ examGrade: '90' })
            const { handleGradeAction, handleManualConfirm, students } = await setupComposable([
                student,
            ])

            vi.useFakeTimers()
            handleGradeAction({ action: 'manual', student })
            vi.runAllTimers()
            vi.useRealTimers()

            handleManualConfirm('   ')

            // Grade should remain unchanged
            expect(students.value[0]!.examGrade).toBe('90')
        })
    })
})
