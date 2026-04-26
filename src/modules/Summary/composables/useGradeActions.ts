import type { StudentSummaryData } from '@Summary/types/summary'
import type { Ref } from 'vue'
import { summaryService } from '@Summary/services/summary.service'
import { ref } from 'vue'
import { convertGradeTo100 } from '@/shared/utils/grades'

/**
 * Determines the 100-point value and isAuto flag to persist for a student's grade.
 * Uses totalRaw directly for auto-assigned grades; converts via convertGradeTo100 for manual.
 */
function resolveGradeStorageValue(
    student: StudentSummaryData,
    format: string,
): { value: number; isAuto: boolean } {
    const displayGrade = student.examGrade
    const rawTotal = student.totalRaw
    const displayTotal = student.total

    const cleanDisplay = String(displayGrade).replace('~', '').trim()
    const cleanTotal =
        displayTotal !== null && displayTotal !== undefined
            ? String(displayTotal).replace('~', '').trim()
            : ''

    const isAuto =
        student.examIsAuto ??
        (cleanDisplay === cleanTotal && rawTotal !== null && rawTotal !== undefined)

    const value = isAuto ? Math.round(rawTotal ?? 0) : convertGradeTo100(displayGrade!, format)

    return { value, isAuto }
}

/**
 * Manages grade actions (auto, manual, save, remove) and their associated dialog state.
 * Mutates the reactive students array in-place to reflect local state changes without
 * requiring a full data reload.
 *
 * The 300ms delay in handleGradeAction allows Radix Vue's ContextMenu exit animation and
 * DOM cleanup to complete before any reactive state mutations or async calls.
 */
export function useGradeActions(students: Ref<StudentSummaryData[]>, selectedFormat: Ref<string>) {
    const isDeleteDialogOpen = ref(false)
    const isManualDialogOpen = ref(false)
    const actionTarget = ref<StudentSummaryData | null>(null)

    function handleGradeAction(payload: {
        action: 'auto' | 'manual' | 'save' | 'remove'
        student: StudentSummaryData
    }) {
        const { action, student } = payload

        setTimeout(async () => {
            if (action === 'auto') {
                const st = students.value.find((s) => s.id === student.id)
                if (st) {
                    st.examGrade = st.total
                    st.completedAt = null
                    st.examIsAuto = true
                }
            } else if (action === 'manual') {
                actionTarget.value = students.value.find((s) => s.id === student.id) ?? student
                isManualDialogOpen.value = true
            } else if (action === 'save') {
                const st = students.value.find((s) => s.id === student.id)
                if (
                    !st ||
                    st.examGrade === null ||
                    st.examGrade === undefined ||
                    st.examGrade === ''
                ) {
                    return
                }

                const { value, isAuto } = resolveGradeStorageValue(st, selectedFormat.value)
                await summaryService.saveFinalAssessment({
                    studentId: student.id,
                    assessmentType: 'examination',
                    value: String(value),
                    isAuto,
                })
                st.completedAt = new Date().toISOString()
                st.examIsAuto = isAuto
            } else if (action === 'remove') {
                actionTarget.value = student
                isDeleteDialogOpen.value = true
            }
        }, 300)
    }

    async function handleSaveAll() {
        const unsaved = students.value.filter(
            (s) =>
                s.examGrade !== null &&
                s.examGrade !== undefined &&
                s.examGrade !== '' &&
                !s.completedAt,
        )

        for (const student of unsaved) {
            if (student.examGrade === null || student.examGrade === undefined) continue

            const { value, isAuto } = resolveGradeStorageValue(student, selectedFormat.value)
            await summaryService.saveFinalAssessment({
                studentId: student.id,
                assessmentType: 'examination',
                value: String(value),
                isAuto,
            })
            student.completedAt = new Date().toISOString()
            student.examIsAuto = isAuto
        }
    }

    async function handleDeleteConfirm() {
        isDeleteDialogOpen.value = false
        const student = actionTarget.value
        if (!student) return

        const assessment = await summaryService.getFinalAssessmentByStudent(
            student.id,
            'examination',
        )
        if (assessment?.id) {
            await summaryService.deleteFinalAssessment(assessment.id)
        }

        const st = students.value.find((s) => s.id === student.id)
        if (st) {
            st.examGrade = null
            st.completedAt = null
        }
        actionTarget.value = null
    }

    function handleManualConfirm(grade: string) {
        isManualDialogOpen.value = false
        const student = actionTarget.value
        if (!student || !grade.trim()) return

        const st = students.value.find((s) => s.id === student.id)
        if (st) {
            st.examGrade = grade.trim()
            st.completedAt = null
            st.examIsAuto = false
        }
        actionTarget.value = null
    }

    return {
        isDeleteDialogOpen,
        isManualDialogOpen,
        actionTarget,
        handleGradeAction,
        handleSaveAll,
        handleDeleteConfirm,
        handleManualConfirm,
    }
}
