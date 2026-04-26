import type { Task } from '../types/tasks'
import { BaseRepository } from '@/shared/services/BaseRepository'

class TasksRepository extends BaseRepository<'tasks'> {
    constructor() {
        super('tasks')
    }

    async saveTask(task: Task): Promise<string | number> {
        if (!task.name?.trim()) throw new Error('Task name is required')
        if (!task.normalizedName?.trim()) throw new Error('Task normalizedName is required')
        if (task.id) {
            return this.put(task)
        }
        return this.add(task)
    }

    async getAllTasks(): Promise<Task[]> {
        return this.getAll()
    }

    async findTaskByNormalizedName(normalizedName: string): Promise<Task | undefined> {
        return this.getFromIndex('normalizedName' as any, normalizedName)
    }

    async deleteTasks(ids: (string | number)[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        await Promise.all(ids.map((id) => store.delete(id as any)))
        await tx.done
    }
}

export const tasksRepository = new TasksRepository()
