import * as Comlink from 'comlink';
import ParserWorker from '@/workers/parser.worker?worker';
import { v4 as uuidv4 } from 'uuid';
import { marksRepository } from './marks.repository';
import { tasksRepository } from './tasks.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import { MarksReconciler } from './reconciliation/MarksReconciler';
import type { Group } from '@Groups/types/groups';
import type { FlatMark, Mark, MarksProcessingStats, MarksParsedData } from '../types/marks';
import type { Meet } from '@Analytics/types/analytics';

interface ParserWorker {
    parseMarksCSV(text: string, filename: string): Promise<MarksParsedData>;
    parseMeetReport(text: string, filename: string): Promise<Meet>;
}

export class MarksService {
    private marksReconciler: MarksReconciler;
    private worker: Worker;
    private parser: Comlink.Remote<ParserWorker>;

    constructor() {
        this.marksReconciler = new MarksReconciler();
        this.worker = new (ParserWorker as any)();
        this.parser = Comlink.wrap(this.worker);
    }

    async processFile(file: File, groupName: string): Promise<MarksProcessingStats> {
        try {
            // 1. Parse via Worker
            const text = await file.text();
            const parsedData: MarksParsedData = await this.parser.parseMarksCSV(text, file.name);

            // 2. Reconcile
            const { students, tasks, marks } = await this.marksReconciler.reconcile(parsedData, groupName);

            // 3. Bulk Persist
            if (students.length > 0) {
                await studentsRepository.bulkPut(students);
            }

            if (tasks.length > 0) {
                await tasksRepository.bulkPut(tasks);
            }

            let stats = { added: 0, updated: 0, skipped: 0 };
            if (marks.length > 0) {
                stats = await marksRepository.bulkSaveSafe(marks);
            }

            return {
                newMarksCount: stats.added,
                skippedMarksCount: stats.skipped,
                updatedMarksCount: stats.updated
            };
        } catch (e) {
            console.error('Error processing marks:', e);
            throw e;
        }
    }

    async toggleSynced(mark: Mark): Promise<boolean | undefined> {
        if (!mark || !mark.id) return;
        const newSynced = !mark.synced;
        await marksRepository.updateMarkSynced(mark.id, newSynced);
        return newSynced;
    }

    async deleteMark(id: string | number): Promise<void> {
        await marksRepository.deleteMarks([id]);
    }

    async loadGroups(): Promise<Group[]> {
        const groups = await groupsRepository.getAll();
        return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    async createGroup(groupData: Partial<Group>): Promise<Group> {
        const dataToSave = { ...groupData } as Group;
        if (!dataToSave.id) {
            dataToSave.id = uuidv4();
        }

        await groupsRepository.add(dataToSave);
        return dataToSave;
    }

    async loadSuggestions(): Promise<{ allMeetIds: string[], allTeachers: string[] }> {
        const [meets, teachersList] = await Promise.all([
            meetsRepository.getAllMeets(),
            settingsRepository.getTeachers()
        ]);

        const allMeetIds = meets.map(m => m.meetId).filter(Boolean);
        const uniqueMeets = [...new Set(allMeetIds)];
        const uniqueTeachers = [...new Set(teachersList)];

        return { allMeetIds: uniqueMeets, allTeachers: uniqueTeachers };
    }

    async loadMarksData(groupName: string | null = null): Promise<FlatMark[]> {
        if (groupName) {
            return marksRepository.getMarksByGroupWithRelations(groupName);
        } else {
            return [];
        }
    }

    async deleteMarks(ids: (string | number)[]): Promise<void> {
        await marksRepository.deleteMarks(ids);
    }
}

export const marksService = new MarksService();
