import { v4 as uuidv4 } from 'uuid';
import { tasksRepository } from '../tasks.repository';
import { marksRepository } from '../marks.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler';
import type { Member } from '@Students/types/students';
import type { Task, Mark, MarksParsedData, ReconciliationResult } from '../../types/marks';

export class MarksReconciler {
    private identityReconciler: IdentityReconciler;

    constructor() {
        this.identityReconciler = new IdentityReconciler();
    }

    /**
     * Reconciles parsed marks data with existing database records.
     */
    async reconcile(parsedData: MarksParsedData, groupName: string): Promise<ReconciliationResult> {
        // Step A: Resolve Students
        const [allExistingMembers, rawStudents] = await Promise.all([
            studentsRepository.getAllMembers(),
            parsedData.studentsData.map(d => d.student)
        ]);

        const resolvedIdentities = await this.identityReconciler.resolveIdentities(rawStudents as any, allExistingMembers);

        // Ensure resolvedIdentities match Member interface (IdentityReconciler returns ReconciledStudent)
        const resolvedStudents: Member[] = resolvedIdentities.map(ri => ({
            ...ri,
            role: ri.role || 'student'
        } as Member));

        // Step B: Reconcile Tasks
        const existingTasks = await tasksRepository.getTasksByGroup(groupName);
        const taskMap = new Map<string, Task>();

        existingTasks.forEach(t => {
            const key = `${t.name}|${t.date}`;
            taskMap.set(key, t);
        });

        const reconciledTasks: Task[] = parsedData.tasks.map(parsedTask => {
            const key = `${parsedTask.name}|${parsedTask.date}`;
            const existing = taskMap.get(key);
            if (existing) {
                return {
                    ...existing,
                    ...parsedTask,
                    id: existing.id
                };
            } else {
                return {
                    ...parsedTask,
                    id: uuidv4(),
                    groupName: groupName
                } as Task;
            }
        });

        // Step C: Reconcile Marks
        const allMarks = await marksRepository.getAllMarks();
        const markLookup = new Map<string, Mark>();

        allMarks.forEach(m => {
            markLookup.set(`${m.taskId}|${m.studentId}`, m);
        });

        const reconciledMarks: Mark[] = [];

        resolvedStudents.forEach((student, index) => {
            const originalData = parsedData.studentsData[index];
            if (!originalData) return;

            const rawMarks = originalData.marks;

            rawMarks.forEach(rawMark => {
                if (rawMark.taskIndex >= 0 && rawMark.taskIndex < reconciledTasks.length) {
                    const task = reconciledTasks[rawMark.taskIndex]!;
                    const taskId = task.id.toString();
                    const studentId = student.id.toString();

                    const lookupKey = `${taskId}|${studentId}`;
                    const existingMark = markLookup.get(lookupKey);

                    if (existingMark) {
                        reconciledMarks.push({
                            ...existingMark,
                            score: rawMark.score,
                            value: rawMark.score || existingMark.value,
                            synced: rawMark.synced || existingMark.synced,
                            updatedAt: new Date().toISOString(),
                            groupName: groupName
                        });
                    } else {
                        reconciledMarks.push({
                            id: uuidv4(),
                            groupName: groupName,
                            studentId: studentId,
                            taskId: taskId,
                            score: rawMark.score,
                            value: rawMark.score || 0,
                            synced: rawMark.synced || false,
                            createdAt: new Date().toISOString()
                        } as Mark);
                    }
                }
            });
        });

        return {
            students: resolvedStudents,
            tasks: reconciledTasks,
            marks: reconciledMarks
        };
    }
}
