import type { Group } from '@Groups/types/groups'
import type { Task } from '@Marks/types/marks'
import type { Module } from '../types/summary'

export interface SummaryTask {
    id: string
    name: string
    date?: string
    groupName: string
    groupId?: string | number
}

export interface SummaryModule extends Module {
    name: string
    tasks: SummaryTask[]
    test: SummaryTask | null
    tasksCoefficient: number
    testCoefficient: number
    minTasksRequired: number
}

/**
 * Serializes a task object for module storage.
 * Strips unnecessary Vue reactivity or extra properties if needed.
 */
export function serializeTask(task: Task | null): SummaryTask | null {
    if (!task) return null
    return {
        id: task.id,
        name: task.name,
        date: task.date,
        groupName: (task as any).groupName || '',
        groupId: (task as any).groupId,
    }
}

/**
 * Serializes a module object for storage in the repository.
 * Ensures all required properties are present and correctly formatted.
 */
export function serializeModule(module: any, group: Group): SummaryModule | null {
    if (!module || !group) return null

    return {
        id: module.id,
        name: module.name,
        tasks: module.tasks ? module.tasks.map((t: Task) => serializeTask(t)) : [],
        test: serializeTask(module.test),
        tasksCoefficient: module.tasksCoefficient,
        testCoefficient: module.testCoefficient,
        minTasksRequired: module.minTasksRequired,
        groupName: group.name,
        groupId: group.id!,
    }
}
