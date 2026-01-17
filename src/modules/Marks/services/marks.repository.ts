import { BaseRepository } from '@/shared/services/BaseRepository';
import type { Member } from '@Students/types/students';
import type { Mark, Task, SaveMarkResult, BulkSaveStats, FlatMark } from '../types/marks';

class MarksRepository extends BaseRepository<'marks'> {
    constructor() {
        super('marks');
    }

    async saveMark(mark: Partial<Mark> & { taskId: string; studentId: string }): Promise<SaveMarkResult> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        // Check for duplicates using composite index (taskId, studentId)
        const index = store.index('task_student' as any);
        const existing = await index.get([mark.taskId, mark.studentId]);

        if (existing) {
            // Prevent overwriting if already synced
            if ((existing as any).synced) {
                return { id: (existing as any).id, isNew: false, updated: false, skipped: true };
            }

            // Update existing mark if score or other fields changed
            if (existing.score !== mark.score) {
                const updated = {
                    ...existing,
                    ...mark,
                    id: existing.id,
                    synced: false,
                    syncedAt: null
                };
                await store.put(updated as any);
                await tx.done;
                return { id: existing.id!, isNew: false, updated: true };
            }
            return { id: existing.id!, isNew: false, updated: false };
        }

        const id = await store.add({
            ...(mark as any),
            createdAt: new Date().toISOString()
        });
        await tx.done;
        return { id, isNew: true, updated: false };
    }

    async bulkSaveSafe(marks: Mark[]): Promise<BulkSaveStats> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        const stats = { added: 0, updated: 0, skipped: 0 };

        for (const mark of marks) {
            const existing = mark.id ? await store.get(mark.id as any) : undefined;

            if (existing) {
                if ((existing as any).synced) {
                    stats.skipped++;
                    continue;
                }

                if (existing.score !== mark.score) {
                    await store.put(mark as any);
                    stats.updated++;
                } else {
                    await store.put(mark as any);
                    stats.updated++;
                }
            } else {
                await store.add(mark as any);
                stats.added++;
            }
        }
        await tx.done;
        return stats;
    }

    async getMarksByTask(taskId: string): Promise<Mark[]> {
        return this.getAllFromIndex('taskId', taskId);
    }

    async getMarksByStudent(studentId: string): Promise<Mark[]> {
        return this.getAllFromIndex('studentId', studentId);
    }

    async updateMarkSynced(id: string | number, synced: boolean): Promise<void> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);

        const mark = await store.get(id as any);
        if (mark) {
            if ((mark as any).synced !== synced) {
                (mark as any).synced = synced;
                (mark as any).syncedAt = synced ? new Date().toISOString() : null;
                await store.put(mark);
            }
        }
        await tx.done;
    }

    async deleteMarks(ids: (string | number)[]): Promise<void> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        await Promise.all(ids.map(id => store.delete(id as any)));
        await tx.done;
    }

    async getAllMarksWithRelations(): Promise<FlatMark[]> {
        const db = await this.getDb();

        const [allMarks, allTasks, allMembers] = await Promise.all([
            db.getAll('marks'),
            db.getAll('tasks'),
            db.getAll('members')
        ]) as [Mark[], Task[], Member[]];

        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const memberMap = new Map(allMembers.map(m => [m.id, m]));

        const flatMarks: FlatMark[] = [];
        for (const mark of allMarks) {
            const task = taskMap.get(mark.taskId);
            const student = memberMap.get(mark.studentId);

            if (!task || !student) continue;

            flatMarks.push({
                id: mark.id!,
                studentName: student.name,
                groupName: task.groupName,
                taskName: task.name,
                taskDate: task.date || '',
                maxPoints: task.maxPoints,
                score: mark.score,
                synced: (mark as any).synced,
                createdAt: mark.createdAt
            });
        }

        return flatMarks;
    }
    async getAllMarks(): Promise<Mark[]> {
        return this.getAll();
    }
    async getMarksByGroup(groupName: string): Promise<Mark[]> {
        return this.getAllFromIndex('groupName', groupName);
    }

    async getMarksByGroupWithRelations(groupName: string): Promise<FlatMark[]> {
        const db = await this.getDb();
        const tx = db.transaction(['marks', 'tasks', 'members'], 'readonly');

        // 1. Get tasks for the group (Tasks reliably have groupName)
        const tasksStore = tx.objectStore('tasks');
        const tasksIndex = tasksStore.index('groupName');
        const groupTasks = await (tasksIndex as any).getAll(groupName) as Task[];

        if (groupTasks.length === 0) {
            return [];
        }

        const groupTaskMap = new Map(groupTasks.map(t => [t.id, t]));

        // 2. Get marks for these tasks
        const marksStore = tx.objectStore('marks');
        const taskIdIndex = marksStore.index('taskId');

        const marksPromises = groupTasks.map(t => (taskIdIndex as any).getAll(t.id));
        const marksArrays = await Promise.all(marksPromises) as Mark[][];
        const groupMarks = marksArrays.flat();

        if (groupMarks.length === 0) {
            return [];
        }

        // 3. Get all members for name lookup
        const membersStore = tx.objectStore('members');
        const allMembers = await membersStore.getAll() as Member[];
        const memberMap = new Map(allMembers.map(m => [m.id, m]));

        const flatMarks: FlatMark[] = [];
        for (const mark of groupMarks) {
            const task = groupTaskMap.get(mark.taskId);
            const student = memberMap.get(mark.studentId);

            if (!task || !student) continue;

            flatMarks.push({
                id: mark.id!,
                studentName: student.name,
                groupName: task.groupName,
                taskName: task.name,
                taskDate: task.date || '',
                maxPoints: task.maxPoints,
                score: mark.score,
                synced: (mark as any).synced,
                createdAt: mark.createdAt
            });
        }

        return flatMarks;
    }

    async getMarksByStudentIds(studentIds: string[]): Promise<Mark[]> {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const index = store.index('studentId');

        const promises = studentIds.map(id => (index as any).getAll(id));
        const results = await Promise.all(promises) as Mark[][];

        return results.flat();
    }
}

export const marksRepository = new MarksRepository();
