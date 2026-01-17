import { BaseRepository } from '@/shared/services/BaseRepository';
import type { FinalAssessment, SaveFinalAssessmentResult } from '../types/summary';

class FinalAssessmentsRepository extends BaseRepository<'finalAssessments'> {
    constructor() {
        super('finalAssessments');
    }

    async saveFinalAssessment(assessment: Partial<FinalAssessment> & { studentId: string; assessmentType: string }): Promise<SaveFinalAssessmentResult> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        // Check for existing assessment using composite index
        const index = store.index('student_type' as any);
        const existing = await index.get([assessment.studentId, assessment.assessmentType]);

        if (existing) {
            // Update existing assessment
            const updated = {
                ...existing,
                ...assessment,
                id: existing.id,
                createdAt: existing.createdAt, // Preserve original creation time
            } as any;
            await store.put(updated);
            await tx.done;
            return { id: existing.id!, isNew: false, updated: true };
        }

        // New assessment
        const id = await store.add({
            ...assessment,
            createdAt: new Date().toISOString(),
            syncedAt: (assessment as any).syncedAt || null,
            documentedAt: (assessment as any).documentedAt || null,
        } as any);
        await tx.done;
        return { id, isNew: true, updated: false };
    }

    async getFinalAssessmentByStudent(studentId: string, assessmentType: string): Promise<FinalAssessment | undefined> {
        return this.getFromIndex('student_type' as any, [studentId, assessmentType]);
    }

    async getAllFinalAssessments(): Promise<FinalAssessment[]> {
        return this.getAll();
    }

    async getFinalAssessmentsByType(assessmentType: string): Promise<FinalAssessment[]> {
        return this.getAllFromIndex('assessmentType' as any, assessmentType);
    }

    async deleteFinalAssessment(id: string | number): Promise<void> {
        return this.delete(id as any);
    }

    async updateSyncStatus(id: string | number, syncedAt: string | null): Promise<void> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        const assessment = await store.get(id as any);
        if (assessment) {
            (assessment as any).syncedAt = syncedAt;
            await store.put(assessment);
        }
        await tx.done;
    }

    async updateDocumentStatus(id: string | number, documentedAt: string | null): Promise<void> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        const assessment = await store.get(id as any);
        if (assessment) {
            (assessment as any).documentedAt = documentedAt;
            await store.put(assessment);
        }
        await tx.done;
    }
}

export const finalAssessmentsRepository = new FinalAssessmentsRepository();
