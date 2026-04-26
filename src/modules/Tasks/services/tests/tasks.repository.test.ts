import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasksRepository } from '../tasks.repository'

describe('tasksRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveTask', () => {
        it('throws when name is empty', async () => {
            await expect(
                tasksRepository.saveTask({
                    id: 'a',
                    name: '',
                    normalizedName: 'test',
                    maxPoints: 0,
                }),
            ).rejects.toThrow('Task name is required')
        })

        it('throws when name is whitespace only', async () => {
            await expect(
                tasksRepository.saveTask({
                    id: 'a',
                    name: '   ',
                    normalizedName: 'test',
                    maxPoints: 0,
                }),
            ).rejects.toThrow('Task name is required')
        })

        it('throws when normalizedName is empty', async () => {
            await expect(
                tasksRepository.saveTask({
                    id: 'a',
                    name: 'Task',
                    normalizedName: '',
                    maxPoints: 0,
                }),
            ).rejects.toThrow('Task normalizedName is required')
        })

        it('calls put when task has an id', async () => {
            const putSpy = vi.spyOn(tasksRepository, 'put').mockResolvedValue('a' as any)
            await tasksRepository.saveTask({
                id: 'a',
                name: 'Task 1',
                normalizedName: 'task1',
                maxPoints: 5,
            })
            expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', name: 'Task 1' }))
        })

        it('calls add when task has no id', async () => {
            const addSpy = vi.spyOn(tasksRepository, 'add').mockResolvedValue('new' as any)
            await tasksRepository.saveTask({
                id: '',
                name: 'New Task',
                normalizedName: 'newtask',
                maxPoints: 0,
            })
            expect(addSpy).toHaveBeenCalled()
        })
    })

    // ─── getAllTasks ───────────────────────────────────────────────────────

    describe('getAllTasks', () => {
        it('returns an empty array when no tasks are stored', async () => {
            expect(await tasksRepository.getAllTasks()).toEqual([])
        })

        it('returns all stored tasks', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 1,
                name: 'Task Alpha',
                normalizedName: 'taskalpha',
                maxPoints: 10,
            })
            await db.put('tasks', {
                id: 2,
                name: 'Task Beta',
                normalizedName: 'taskbeta',
                maxPoints: 5,
            })

            const result = await tasksRepository.getAllTasks()

            expect(result).toHaveLength(2)
            expect(result.map(t => t.name)).toEqual(expect.arrayContaining(['Task Alpha', 'Task Beta']))
        })

        it('includes all task fields in the result', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 3,
                name: 'Full Task',
                normalizedName: 'fulltask',
                maxPoints: 20,
                description: 'Desc',
                date: '2024-01-01',
            })

            const tasks = await tasksRepository.getAllTasks()
            const task = tasks.find(t => (t as any).id === 3)!

            expect(task.description).toBe('Desc')
            expect(task.date).toBe('2024-01-01')
            expect(task.maxPoints).toBe(20)
        })
    })

    // ─── findTaskByNormalizedName ──────────────────────────────────────────

    describe('findTaskByNormalizedName', () => {
        it('returns undefined when no task matches', async () => {
            const result = await tasksRepository.findTaskByNormalizedName('nonexistent')
            expect(result).toBeUndefined()
        })

        it('returns the matching task', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 4,
                name: 'Find Me',
                normalizedName: 'findme',
                maxPoints: 0,
            })

            const result = await tasksRepository.findTaskByNormalizedName('findme')

            expect(result).toBeDefined()
            expect(result!.name).toBe('Find Me')
            expect(result!.normalizedName).toBe('findme')
        })

        it('does not return a task with a different normalizedName', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 5,
                name: 'Other Task',
                normalizedName: 'othertask',
                maxPoints: 0,
            })

            const result = await tasksRepository.findTaskByNormalizedName('findme')
            expect(result).toBeUndefined()
        })
    })

    // ─── deleteTasks ──────────────────────────────────────────────────────

    describe('deleteTasks', () => {
        it('removes the specified tasks by id', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 10,
                name: 'Delete Task A',
                normalizedName: 'deleta',
                maxPoints: 0,
            })
            await db.put('tasks', {
                id: 11,
                name: 'Delete Task B',
                normalizedName: 'deletb',
                maxPoints: 0,
            })
            await db.put('tasks', {
                id: 12,
                name: 'Keep Task',
                normalizedName: 'keeptask',
                maxPoints: 0,
            })

            await tasksRepository.deleteTasks([10, 11])

            const remaining = await tasksRepository.getAllTasks()
            expect(remaining).toHaveLength(1)
            expect(remaining[0]!.id).toBe(12)
        })

        it('does nothing when given an empty array', async () => {
            const db = await (tasksRepository as any).getDb()
            await db.put('tasks', {
                id: 13,
                name: 'Intact Task',
                normalizedName: 'intact',
                maxPoints: 0,
            })

            await tasksRepository.deleteTasks([])

            const tasks = await tasksRepository.getAllTasks()
            expect(tasks.some(t => (t as any).id === 13)).toBe(true)
        })

        it('silently ignores non-existent ids', async () => {
            await expect(tasksRepository.deleteTasks([9999])).resolves.not.toThrow()
        })
    })
})
