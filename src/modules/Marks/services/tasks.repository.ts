import { BaseRepository } from '@/shared/services/BaseRepository';
import type { Task } from '../types/marks';

class TasksRepository extends BaseRepository<'tasks'> {
    constructor() {
        super('tasks');
    }

    async saveTask(task: Task): Promise<string | number> {
        if (task.id) {
            return this.put(task);
        }
        return this.add(task);
    }

    async getAllTasks(): Promise<Task[]> {
        return this.getAll();
    }

    async getTasksByGroup(groupName: string): Promise<Task[]> {
        return this.getAllFromIndex('groupName', groupName);
    }

    async findTaskByNaturalKey(name: string, date: string, groupName: string): Promise<Task | undefined> {
        const db = await this.getDb();
        // Uses composite index: [name, date, groupName]
        return db.getFromIndex(this.storeName, 'name_date_group' as any, [name, date, groupName] as any);
    }
}

export const tasksRepository = new TasksRepository();
