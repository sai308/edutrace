import type { Member } from '@Students/types/students'
import type { BulkSaveStats, FlatMark, Mark, SaveMarkResult, Task } from '../types/marks'
import { BaseRepository } from '@/shared/services/BaseRepository'

class MarksRepository extends BaseRepository<'marks'> {
    constructor() {
        super('marks')
    }

    private _validateMark(mark: Partial<Mark>): void {
        if (!mark.taskId)
            throw new Error('Mark.taskId is required')
        if (!mark.studentId)
            throw new Error('Mark.studentId is required')
        if (!mark.groupName)
            throw new Error('Mark.groupName is required')
    }

    async saveMark(mark: Partial<Mark> & { taskId: string, studentId: string }): Promise<SaveMarkResult> {
        this._validateMark(mark)
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        // Check for duplicates using composite index (taskId, studentId)
        const index = store.index('task_student')
        const existing = await index.get([mark.taskId, mark.studentId])

        if (existing) {
            // Prevent overwriting if already synced
            if (existing.synced) {
                return { id: existing.id!, isNew: false, updated: false, skipped: true }
            }

            // Update existing mark if score or other fields changed
            if (existing.score !== mark.score) {
                const updated: Mark = {
                    ...existing,
                    ...mark,
                    id: existing.id,
                    synced: false,
                    syncedAt: null,
                }
                await store.put(updated)
                await tx.done
                return { id: existing.id!, isNew: false, updated: true }
            }
            return { id: existing.id!, isNew: false, updated: false }
        }

        const id = await store.add({
            ...mark,
            createdAt: new Date().toISOString(),
        } as Mark)
        await tx.done
        return { id, isNew: true, updated: false }
    }

    async bulkSaveSafe(marks: Mark[]): Promise<BulkSaveStats> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        const stats = { added: 0, updated: 0, skipped: 0 }

        for (const mark of marks) {
            this._validateMark(mark)
            const existing = mark.id != null ? await store.get(mark.id as unknown as number) : undefined

            if (existing) {
                if (existing.synced) {
                    stats.skipped++
                    continue
                }

                if (existing.score !== mark.score) {
                    await store.put(mark)
                    stats.updated++
                }
                else {
                    // Score unchanged and not synced — nothing to update
                    stats.skipped++
                }
            }
            else {
                await store.add(mark)
                stats.added++
            }
        }
        await tx.done
        return stats
    }

    async getMarksByTask(taskId: string): Promise<Mark[]> {
        return this.getAllFromIndex('taskId', taskId)
    }

    async getMarksByStudent(studentId: string): Promise<Mark[]> {
        return this.getAllFromIndex('studentId', studentId)
    }

    async updateMarkSynced(id: string | number, synced: boolean): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        const mark = await store.get(id as unknown as number)
        if (mark) {
            if (mark.synced !== synced) {
                mark.synced = synced
                mark.syncedAt = synced ? new Date().toISOString() : null
                await store.put(mark)
            }
        }
        await tx.done
    }

    async deleteMarks(ids: (string | number)[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        await Promise.all(ids.map(id => store.delete(id as unknown as number)))
        await tx.done
    }

    async getAllMarksWithRelations(): Promise<FlatMark[]> {
        const db = await this.getDb()

        const [allMarks, allTasks, allMembers] = (await Promise.all([
            db.getAll('marks'),
            db.getAll('tasks'),
            db.getAll('members'),
        ])) as [Mark[], Task[], Member[]]

        const taskMap = new Map(allTasks.map(t => [t.id.toString(), t]))
        const memberMap = new Map(allMembers.map(m => [m.id.toString(), m]))

        const flatMarks: FlatMark[] = []
        for (const mark of allMarks) {
            const task = taskMap.get(mark.taskId.toString())
            const student = memberMap.get(mark.studentId.toString())

            if (!task || !student)
                continue

            flatMarks.push({
                id: mark.id!,
                studentName: student.name,
                groupName: mark.groupName,
                taskName: task.name,
                taskDate: task.date || '',
                maxPoints: task.maxPoints,
                score: mark.score,
                synced: mark.synced,
                syncedAt: mark.syncedAt,
                createdAt: mark.createdAt,
            })
        }

        return flatMarks
    }

    async getAllMarks(): Promise<Mark[]> {
        return this.getAll()
    }

    async getMarksByGroup(groupName: string): Promise<Mark[]> {
        return this.getAllFromIndex('groupName', groupName)
    }

    async getMarksByGroupWithRelations(groupName: string): Promise<FlatMark[]> {
        const db = await this.getDb()
        const tx = db.transaction(['marks', 'tasks', 'members'], 'readonly')

        // 1. Get all marks for this group via marks.groupName index
        const marksIndex = tx.objectStore('marks').index('groupName')
        const groupMarks = await marksIndex.getAll(groupName)

        if (groupMarks.length === 0) {
            return []
        }

        // 2. Collect unique taskIds and fetch tasks by primary key
        const uniqueTaskIds = [...new Set(groupMarks.map(m => m.taskId))]
        const tasksStore = tx.objectStore('tasks')
        // taskId is stored as string in Mark but the tasks store key is number in the schema;
        // cast through unknown to avoid idb type error while preserving runtime behaviour.
        const taskResults = await Promise.all(uniqueTaskIds.map(id => tasksStore.get(id as unknown as number)))
        const taskMap = new Map<string, Task>()
        taskResults.forEach((t: Task | undefined) => {
            if (t)
                taskMap.set(t.id.toString(), t)
        })

        // 3. Get all members for name lookup
        const membersStore = tx.objectStore('members')
        const allMembers = (await membersStore.getAll()) as Member[]
        const memberMap = new Map(allMembers.map(m => [m.id.toString(), m]))

        const flatMarks: FlatMark[] = []
        for (const mark of groupMarks) {
            const task = taskMap.get(mark.taskId.toString())
            const student = memberMap.get(mark.studentId.toString())

            if (!task || !student)
                continue

            flatMarks.push({
                id: mark.id!,
                studentName: student.name,
                groupName: mark.groupName,
                taskName: task.name,
                taskDate: task.date || '',
                maxPoints: task.maxPoints,
                score: mark.score,
                synced: mark.synced,
                syncedAt: mark.syncedAt,
                createdAt: mark.createdAt,
            })
        }

        return flatMarks
    }

    async getMarksByStudentIds(studentIds: string[]): Promise<Mark[]> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const index = store.index('studentId')

        const promises = studentIds.map(id => index.getAll(id))
        const results = (await Promise.all(promises)) as Mark[][]

        return results.flat()
    }
}

export const marksRepository = new MarksRepository()
