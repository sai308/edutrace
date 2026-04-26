import type { Member } from '@Students/types/students'
import type { Task } from '@Tasks/types/tasks'
import type { Mark, MarksParsedData, ReconciliationResult } from '../../types/marks'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { v4 as uuidv4 } from 'uuid'
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler'
import { marksRepository } from '../marks.repository'

export class MarksReconciler {
    private identityReconciler: IdentityReconciler

    constructor() {
        this.identityReconciler = new IdentityReconciler()
    }

    private _normalizeName(name: string): string {
        if (!name)
            return ''
        return name.toLowerCase().replace(/\s+/g, '')
    }

    /**
     * Reconciles parsed marks data with existing database records.
     */
    async reconcile(parsedData: MarksParsedData, groupName: string): Promise<ReconciliationResult> {
        // Step A: Resolve Students
        const [allExistingMembers, rawStudents] = await Promise.all([
            studentsRepository.getAllMembers(),
            parsedData.studentsData.map(d => d.student),
        ])

        const resolvedIdentities = await this.identityReconciler.resolveIdentities(
            rawStudents as any,
            allExistingMembers,
        )

        // Ensure resolvedIdentities match Member interface (IdentityReconciler returns ReconciledStudent)
        const resolvedStudents: Member[] = resolvedIdentities.map(
            ri =>
                ({
                    ...ri,
                    role: ri.role || 'student',
                }) as Member,
        )

        // Step B: Reconcile Tasks (globally, no group coupling)
        const existingTasks = await tasksRepository.getAllTasks()
        const taskMap = new Map<string, Task>()

        existingTasks.forEach((t: Task) => {
            taskMap.set(t.normalizedName, t)
        })

        // Map each parsed task to a reconciled task, seeding taskMap incrementally.
        // This prevents duplicate normalizedName collisions when the same task name
        // appears more than once within a single CSV (e.g. "Task 1" and "Task1").
        const reconciledTasks: Task[] = parsedData.tasks.map((parsedTask) => {
            const normalizedName = this._normalizeName(parsedTask.name)
            const existing = taskMap.get(normalizedName)
            if (existing) {
                // Reuse existing (DB or already-resolved within this batch)
                const merged: Task = {
                    ...existing,
                    maxPoints: parsedTask.maxPoints ?? existing.maxPoints,
                    date: parsedTask.date ?? existing.date,
                    description: parsedTask.description ?? existing.description,
                }
                taskMap.set(normalizedName, merged)
                return merged
            }
            else {
                const newTask: Task = {
                    ...parsedTask,
                    id: uuidv4(),
                    normalizedName,
                } as Task
                // Register immediately so subsequent rows with the same name reuse this
                taskMap.set(normalizedName, newTask)
                return newTask
            }
        })

        // Deduplicate by id: when the same task is resolved multiple times within a batch
        // (e.g. "Task 1" and "Task1" both normalize to the same existing/new task), the array
        // would contain duplicate entries with the same primary key. bulkPut uses Promise.all
        // which fires all puts concurrently — IDB's uniqueness check on 'name' would see
        // the same value in-flight twice and raise a ConstraintError before either put completes.
        const uniqueTasks = [...new Map(reconciledTasks.map(t => [t.id, t])).values()]

        // Step C: Reconcile Marks
        const allMarks = await marksRepository.getAllMarks()
        const markLookup = new Map<string, Mark>()

        allMarks.forEach((m) => {
            markLookup.set(`${m.taskId}|${m.studentId}`, m)
        })

        const reconciledMarks: Mark[] = []

        resolvedStudents.forEach((student, index) => {
            const originalData = parsedData.studentsData[index]
            if (!originalData)
                return

            const rawMarks = originalData.marks

            rawMarks.forEach((rawMark) => {
                if (rawMark.taskIndex >= 0 && rawMark.taskIndex < reconciledTasks.length) {
                    const task = reconciledTasks[rawMark.taskIndex]!
                    const taskId = task.id.toString()
                    const studentId = student.id.toString()

                    const lookupKey = `${taskId}|${studentId}`
                    const existingMark = markLookup.get(lookupKey)

                    if (existingMark) {
                        reconciledMarks.push({
                            ...existingMark,
                            score: rawMark.score,
                            value: rawMark.score || existingMark.value,
                            synced: rawMark.synced || existingMark.synced,
                            updatedAt: new Date().toISOString(),
                            groupName,
                        })
                    }
                    else {
                        reconciledMarks.push({
                            id: uuidv4(),
                            groupName,
                            studentId,
                            taskId,
                            score: rawMark.score,
                            value: rawMark.score || 0,
                            synced: rawMark.synced || false,
                            createdAt: new Date().toISOString(),
                        } as Mark)
                    }
                }
            })
        })

        return {
            students: resolvedStudents,
            tasks: uniqueTasks,
            marks: reconciledMarks,
        }
    }
}
