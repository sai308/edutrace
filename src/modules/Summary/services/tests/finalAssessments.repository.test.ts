import { describe, expect, it } from 'vitest'
import { finalAssessmentsRepository } from '../finalAssessments.repository'

function makeAssessment(overrides: Record<string, unknown> = {}): any {
    return {
        studentId: 'student-1',
        assessmentType: 'examination',
        value: '85',
        isAuto: false,
        ...overrides,
    }
}

describe('finalAssessmentsRepository', () => {
    describe('_validateAssessment (via saveFinalAssessment)', () => {
        it('throws if studentId is missing', async () => {
            await expect(
                finalAssessmentsRepository.saveFinalAssessment(makeAssessment({ studentId: '' })),
            ).rejects.toThrow('FinalAssessment.studentId is required')
        })

        it('throws if assessmentType is missing', async () => {
            await expect(
                finalAssessmentsRepository.saveFinalAssessment(
                    makeAssessment({ assessmentType: '' }),
                ),
            ).rejects.toThrow('FinalAssessment.assessmentType is required')
        })

        it('throws if value is null', async () => {
            await expect(
                finalAssessmentsRepository.saveFinalAssessment(makeAssessment({ value: null })),
            ).rejects.toThrow('FinalAssessment.value is required')
        })

        it('throws if value is undefined', async () => {
            await expect(
                finalAssessmentsRepository.saveFinalAssessment(
                    makeAssessment({ value: undefined }),
                ),
            ).rejects.toThrow('FinalAssessment.value is required')
        })
    })

    describe('saveFinalAssessment', () => {
        it('inserts a new assessment and returns isNew = true', async () => {
            const result = await finalAssessmentsRepository.saveFinalAssessment(makeAssessment())

            expect(result.isNew).toBe(true)
            expect(result.updated).toBe(false)
            expect(result.id).toBeDefined()
        })

        it('sets createdAt and documentedAt on insert', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-ts' }),
            )

            const saved = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-ts',
                'examination',
            )
            expect(saved?.createdAt).toBeDefined()
            expect(saved?.documentedAt).toBeDefined()
        })

        it('upserts an existing assessment and returns isNew = false', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-upsert', value: '70' }),
            )
            const result = await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-upsert', value: '90' }),
            )

            expect(result.isNew).toBe(false)
            expect(result.updated).toBe(true)

            const updated = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-upsert',
                'examination',
            )
            expect(updated?.value).toBe('90')
        })

        it('preserves createdAt on update', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-preserve' }),
            )
            const original = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-preserve',
                'examination',
            )
            const originalCreatedAt = original?.createdAt

            // Small delay to ensure timestamps differ
            await new Promise((r) => setTimeout(r, 5))

            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-preserve', value: '95' }),
            )
            const updated = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-preserve',
                'examination',
            )

            expect(updated?.createdAt).toBe(originalCreatedAt)
        })

        it('stores different assessment types separately', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ assessmentType: 'examination', value: '80' }),
            )
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ assessmentType: 'credit', value: '75' }),
            )

            const exam = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-1',
                'examination',
            )
            const credit = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-1',
                'credit',
            )

            expect(exam?.value).toBe('80')
            expect(credit?.value).toBe('75')
        })
    })

    describe('getFinalAssessmentByStudent', () => {
        it('returns undefined when no assessment exists', async () => {
            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'nonexistent',
                'examination',
            )
            expect(result).toBeUndefined()
        })

        it('returns the correct assessment by composite key', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-get', value: '88' }),
            )

            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-get',
                'examination',
            )
            expect(result?.value).toBe('88')
            expect(result?.studentId).toBe('student-get')
        })
    })

    describe('getAllFinalAssessments', () => {
        it('returns all stored assessments', async () => {
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-all-1' }),
            )
            await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-all-2' }),
            )

            const all = await finalAssessmentsRepository.getAllFinalAssessments()
            const ids = all.map((a) => a.studentId)

            expect(ids).toContain('student-all-1')
            expect(ids).toContain('student-all-2')
        })
    })

    describe('deleteFinalAssessment', () => {
        it('removes the assessment by id', async () => {
            const { id } = await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-del' }),
            )
            await finalAssessmentsRepository.deleteFinalAssessment(id)

            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-del',
                'examination',
            )
            expect(result).toBeUndefined()
        })
    })

    describe('updateSyncStatus', () => {
        it('updates syncedAt field without affecting other fields', async () => {
            const { id } = await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-sync' }),
            )
            const syncTime = new Date().toISOString()

            await finalAssessmentsRepository.updateSyncStatus(id, syncTime)

            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-sync',
                'examination',
            )
            expect(result?.syncedAt).toBe(syncTime)
            expect(result?.value).toBe('85') // unchanged
        })

        it('sets syncedAt to null', async () => {
            const { id } = await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-sync-null' }),
            )
            await finalAssessmentsRepository.updateSyncStatus(id, null)

            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-sync-null',
                'examination',
            )
            expect(result?.syncedAt).toBeNull()
        })
    })

    describe('updateDocumentStatus', () => {
        it('updates documentedAt field without affecting other fields', async () => {
            const { id } = await finalAssessmentsRepository.saveFinalAssessment(
                makeAssessment({ studentId: 'student-doc' }),
            )
            const docTime = new Date().toISOString()

            await finalAssessmentsRepository.updateDocumentStatus(id, docTime)

            const result = await finalAssessmentsRepository.getFinalAssessmentByStudent(
                'student-doc',
                'examination',
            )
            expect(result?.documentedAt).toBe(docTime)
            expect(result?.value).toBe('85') // unchanged
        })
    })
})
