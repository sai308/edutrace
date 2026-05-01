import type { FinalAssessment, SaveFinalAssessmentResult } from '@Summary/types/summary'
import { BaseRepository } from '@/shared/services/BaseRepository'

class FinalAssessmentsRepository extends BaseRepository<'finalAssessments'> {
    constructor() {
        super('finalAssessments')
    }

    private _validateAssessment(
        assessment: Partial<FinalAssessment> & { studentId?: string, assessmentType?: string },
    ): void {
        if (!assessment.studentId)
            throw new Error('FinalAssessment.studentId is required')
        if (!assessment.assessmentType)
            throw new Error('FinalAssessment.assessmentType is required')
        if (assessment.value === undefined || assessment.value === null) {
            throw new Error('FinalAssessment.value is required')
        }
    }

    async saveFinalAssessment(
        assessment: Partial<FinalAssessment> & { studentId: string, assessmentType: string },
    ): Promise<SaveFinalAssessmentResult> {
        this._validateAssessment(assessment)

        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        // Check for existing assessment using composite index
        const index = store.index('student_type')
        const existing = await index.get([assessment.studentId, assessment.assessmentType])

        if (existing) {
            // Update existing assessment
            const updated: FinalAssessment = {
                ...existing,
                ...assessment,
                id: existing.id,
                createdAt: existing.createdAt,
                documentedAt: assessment.documentedAt ?? existing.documentedAt ?? new Date().toISOString(),
            }
            await store.put(updated)
            await tx.done
            return { id: existing.id!, isNew: false, updated: true }
        }

        // New assessment
        const now = new Date().toISOString()
        const id = await store.add({
            ...assessment,
            createdAt: now,
            syncedAt: assessment.syncedAt ?? null,
            documentedAt: assessment.documentedAt ?? now,
        } as FinalAssessment)
        await tx.done
        return { id, isNew: true, updated: false }
    }

    async getFinalAssessmentByStudent(studentId: string, assessmentType: string): Promise<FinalAssessment | undefined> {
        return this.getFromIndex('student_type', [studentId, assessmentType])
    }

    async getAllFinalAssessments(): Promise<FinalAssessment[]> {
        return this.getAll()
    }

    async getFinalAssessmentsByType(assessmentType: string): Promise<FinalAssessment[]> {
        return this.getAllFromIndex('assessmentType', assessmentType)
    }

    async deleteFinalAssessment(id: string | number): Promise<void> {
        return this.delete(id as number)
    }

    async updateSyncStatus(id: string | number, syncedAt: string | null): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        const assessment = await store.get(id as number)
        if (assessment) {
            assessment.syncedAt = syncedAt
            await store.put(assessment)
        }
        await tx.done
    }

    async updateDocumentStatus(id: string | number, documentedAt: string | null): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        const assessment = await store.get(id as number)
        if (assessment) {
            assessment.documentedAt = documentedAt
            await store.put(assessment)
        }
        await tx.done
    }
}

export const finalAssessmentsRepository = new FinalAssessmentsRepository()
