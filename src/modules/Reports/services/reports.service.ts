import * as Comlink from 'comlink';
import ParserWorker from '@/workers/parser.worker?worker';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler';
import type { Meet } from '@Analytics/types/analytics';
import type { Member } from '@Students/types/students';
import type { ReportProcessingStats } from '../types/reports';

interface ParserWorker {
    parseMarksCSV(text: string, filename: string): Promise<any>;
    parseMeetReport(text: string, filename: string): Promise<Meet>;
}

export class ReportsService {
    private identityReconciler: IdentityReconciler;
    private worker: Worker;
    private parser: Comlink.Remote<ParserWorker>;

    constructor() {
        this.identityReconciler = new IdentityReconciler();
        this.worker = new (ParserWorker as any)();
        this.parser = Comlink.wrap(this.worker);
    }

    /**
     * Parse a single file.
     */
    async parseFile(file: File): Promise<Meet> {
        const text = await file.text();
        return await this.parser.parseMeetReport(text, file.name);
    }

    /**
     * Process multiple files: parse, validate, save.
     */
    async processFiles(files: File[], filterMode: 'all' | 'related' = 'all'): Promise<ReportProcessingStats> {
        const stats: ReportProcessingStats = { saved: 0, skipped: 0, unrecognized: 0 };

        // Load dependencies in parallel
        const [groupsMap, limitMinutes] = await Promise.all([
            groupsRepository.getGroupMap(),
            settingsRepository.getDurationLimit()
        ]);

        const limitSeconds = limitMinutes > 0 ? limitMinutes * 60 : 0;

        // Parse all files first
        const parsePromises = files.map(f => this.parseFile(f));
        let results: Meet[] = [];
        try {
            results = await Promise.all(parsePromises);
        } catch (e) {
            console.error('Parsing error:', e);
            throw e;
        }

        for (const result of results) {
            // Filter mode check
            if (filterMode === 'related') {
                const hasGroup = groupsMap[result.meetId];
                if (!hasGroup) {
                    console.warn(`Skipping file with unrecognized group ID: ${result.meetId}`);
                    stats.unrecognized++;
                    continue;
                }
            }

            // Duplicate check
            const isDup = await meetsRepository.isDuplicateFile(result.filename || '', result.meetId, result.date);
            if (isDup) {
                console.warn(`Skipping duplicate file: ${result.filename}`);
                stats.skipped++;
                continue;
            }

            // Apply duration limit
            if (limitSeconds > 0) {
                result.participants.forEach(p => {
                    if (p.duration > limitSeconds) {
                        p.duration = limitSeconds;
                    }
                });
            }

            // Sync Students if group exists
            const group = groupsMap[result.meetId];
            if (group) {
                const rawStudents = result.participants.map(p => ({
                    name: p.name,
                    email: p.email || '',
                    groupName: group.name,
                }));

                const allMembers = await studentsRepository.getAllMembers();
                const reconciledIdentities = await this.identityReconciler.resolveIdentities(rawStudents, allMembers);

                // Add required fields for storage if new
                const studentsToSave: Member[] = reconciledIdentities.map(s => ({
                    ...s,
                    role: s.role || 'student'
                } as Member));

                // Bulk save students
                await studentsRepository.bulkPut(studentsToSave);

                // Update participants with resolved IDs
                result.participants.forEach((p, index) => {
                    const reconciled = reconciledIdentities[index];
                    if (reconciled) {
                        (p as any).studentId = reconciled.id;
                    }
                });
            }

            // Save Meet
            await meetsRepository.saveMeet(result);
            stats.saved++;
        }

        return stats;
    }
}

export const reportsService = new ReportsService();
