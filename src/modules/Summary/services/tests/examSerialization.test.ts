import type { Group } from '@Groups/types/groups'
import type { Task } from '@Marks/types/marks'
import { describe, expect, it } from 'vitest'
import { serializeModule, serializeTask } from '../examSerialization'

// ─── serializeTask ────────────────────────────────────────────────────────────

describe('serializeTask', () => {
    it('returns null when task is null', () => {
        expect(serializeTask(null)).toBeNull()
    })

    it('extracts id, name, date, groupName, and groupId from a task', () => {
        const task: any = {
            id: 'task-1',
            name: 'Assignment 1',
            date: '2024-03-15',
            groupName: 'CS-2024',
            groupId: 'g1',
            maxPoints: 100,
            normalizedName: 'assignment1',
        }

        const result = serializeTask(task as Task)

        expect(result).not.toBeNull()
        expect(result!.id).toBe('task-1')
        expect(result!.name).toBe('Assignment 1')
        expect(result!.date).toBe('2024-03-15')
        expect(result!.groupName).toBe('CS-2024')
        expect(result!.groupId).toBe('g1')
    })

    it('strips fields that are not part of SummaryTask', () => {
        const task: any = {
            id: 't2',
            name: 'T2',
            groupName: 'G',
            maxPoints: 10,
            normalizedName: 'n',
        }

        const result = serializeTask(task as Task)

        expect(result).not.toHaveProperty('maxPoints')
        expect(result).not.toHaveProperty('normalizedName')
    })

    it('defaults groupName to empty string when absent on the task', () => {
        const task: any = { id: 't3', name: 'No Group Task' }

        const result = serializeTask(task as Task)

        expect(result!.groupName).toBe('')
    })

    it('sets groupId to undefined when absent on the task', () => {
        const task: any = { id: 't4', name: 'No GroupId Task', groupName: 'G1' }

        const result = serializeTask(task as Task)

        expect(result!.groupId).toBeUndefined()
    })

    it('preserves date as undefined when absent', () => {
        const task: any = { id: 't5', name: 'No Date Task', groupName: 'G1' }

        const result = serializeTask(task as Task)

        expect(result!.date).toBeUndefined()
    })
})

// ─── serializeModule ──────────────────────────────────────────────────────────

describe('serializeModule', () => {
    const mockGroup: Group = { id: 'g1', name: 'CS-2024', meetId: 'abc-001' }

    it('returns null when module is null', () => {
        expect(serializeModule(null, mockGroup)).toBeNull()
    })

    it('returns null when group is null', () => {
        const module = {
            id: 1,
            name: 'Mod',
            tasks: [],
            test: null,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }
        expect(serializeModule(module, null as any)).toBeNull()
    })

    it('serializes a complete module correctly', () => {
        const task: any = {
            id: 't1',
            name: 'Task 1',
            date: '2024-01-01',
            groupName: 'CS-2024',
            groupId: 'g1',
        }
        const module = {
            id: 5,
            name: 'Module Alpha',
            tasks: [task],
            test: null,
            tasksCoefficient: 2,
            testCoefficient: 3,
            minTasksRequired: 2,
        }

        const result = serializeModule(module, mockGroup)

        expect(result).not.toBeNull()
        expect(result!.id).toBe(5)
        expect(result!.name).toBe('Module Alpha')
        expect(result!.groupName).toBe('CS-2024')
        expect(result!.groupId).toBe('g1')
        expect(result!.tasksCoefficient).toBe(2)
        expect(result!.testCoefficient).toBe(3)
        expect(result!.minTasksRequired).toBe(2)
    })

    it('serializes tasks array through serializeTask', () => {
        const task: any = { id: 't2', name: 'Serialized Task', groupName: 'CS-2024' }
        const module = {
            id: 6,
            name: 'Mod B',
            tasks: [task],
            test: null,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }

        const result = serializeModule(module, mockGroup)

        expect(result!.tasks).toHaveLength(1)
        expect(result!.tasks[0]!.id).toBe('t2')
        expect(result!.tasks[0]!.name).toBe('Serialized Task')
    })

    it('serializes the test task through serializeTask', () => {
        const testTask: any = { id: 'test-1', name: 'Final Test', groupName: 'CS-2024' }
        const module = {
            id: 7,
            name: 'Mod C',
            tasks: [],
            test: testTask,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }

        const result = serializeModule(module, mockGroup)

        expect(result!.test).not.toBeNull()
        expect(result!.test!.id).toBe('test-1')
    })

    it('sets test to null when module.test is null', () => {
        const module = {
            id: 8,
            name: 'No Test Mod',
            tasks: [],
            test: null,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }

        const result = serializeModule(module, mockGroup)

        expect(result!.test).toBeNull()
    })

    it('returns empty tasks array when module.tasks is undefined', () => {
        const module = {
            id: 9,
            name: 'No Tasks Mod',
            test: null,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }

        const result = serializeModule(module, mockGroup)

        expect(result!.tasks).toEqual([])
    })

    it('sets groupName and groupId from the provided group, not the module', () => {
        const otherGroup: Group = { id: 'other-id', name: 'Other Group', meetId: 'xyz' }
        const module = {
            id: 10,
            name: 'Group Override Mod',
            groupName: 'Old Group',
            groupId: 'old-id',
            tasks: [],
            test: null,
            tasksCoefficient: 1,
            testCoefficient: 1,
            minTasksRequired: 1,
        }

        const result = serializeModule(module, otherGroup)

        expect(result!.groupName).toBe('Other Group')
        expect(result!.groupId).toBe('other-id')
    })
})
