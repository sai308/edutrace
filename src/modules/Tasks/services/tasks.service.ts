import type { Task } from '@Tasks/types/tasks'
import { v4 as uuidv4 } from 'uuid'
import { tasksRepository } from './tasks.repository'

/**
 * Converts a task name to its normalized form used for uniqueness enforcement.
 * Lowercases and strips all whitespace.
 */
export function normalizeTaskName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '')
}

/**
 * Constructs a complete Task object from form input.
 * Assigns a new UUID if no existingId is provided.
 * Throws if name is empty after trimming.
 */
export function buildTask(formData: Partial<Task>, existingId?: string): Task {
    const name = formData.name?.trim() ?? ''
    if (!name)
        throw new Error('Task name is required')
    return {
        id: existingId ?? uuidv4(),
        name,
        normalizedName: normalizeTaskName(name),
        maxPoints: Number(formData.maxPoints) || 0,
        description: formData.description?.trim() || undefined,
        date: formData.date || undefined,
    }
}

/**
 * Builds and persists a task. Returns the saved Task.
 * Throws ConstraintError if a task with the same normalizedName already exists
 * (enforced by IndexedDB unique index).
 */
export async function saveTask(formData: Partial<Task>, existingTask?: Task | null): Promise<Task> {
    const task = buildTask(formData, existingTask?.id)
    await tasksRepository.saveTask(task)
    return task
}
