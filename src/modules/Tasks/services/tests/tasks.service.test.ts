import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasksRepository } from '../tasks.repository'
import { buildTask, normalizeTaskName, saveTask } from '../tasks.service'

vi.mock('../tasks.repository')

describe('normalizeTaskName', () => {
    it('lowercases and removes all spaces', () => {
        expect(normalizeTaskName('Hello World')).toBe('helloworld')
    })

    it('collapses multiple internal spaces', () => {
        expect(normalizeTaskName('Task  1  Demo')).toBe('task1demo')
    })

    it('returns empty string for empty input', () => {
        expect(normalizeTaskName('')).toBe('')
    })

    it('handles leading and trailing whitespace', () => {
        expect(normalizeTaskName('  Test  ')).toBe('test')
    })
})

describe('buildTask', () => {
    it('builds a complete task with a new UUID when no existingId', () => {
        const task = buildTask({ name: 'Test Task', maxPoints: 10 })
        expect(task.name).toBe('Test Task')
        expect(task.normalizedName).toBe('testtask')
        expect(task.maxPoints).toBe(10)
        expect(task.id).toBeTruthy()
        expect(typeof task.id).toBe('string')
    })

    it('preserves existingId when provided', () => {
        const task = buildTask({ name: 'My Task' }, 'existing-123')
        expect(task.id).toBe('existing-123')
    })

    it('trims leading and trailing whitespace from name', () => {
        const task = buildTask({ name: '  Padded Name  ' })
        expect(task.name).toBe('Padded Name')
        expect(task.normalizedName).toBe('paddedname')
    })

    it('throws when name is empty', () => {
        expect(() => buildTask({ name: '' })).toThrow('Task name is required')
    })

    it('throws when name is whitespace only', () => {
        expect(() => buildTask({ name: '   ' })).toThrow('Task name is required')
    })

    it('throws when name is missing', () => {
        expect(() => buildTask({})).toThrow('Task name is required')
    })

    it('defaults maxPoints to 0 when not provided', () => {
        const task = buildTask({ name: 'T' })
        expect(task.maxPoints).toBe(0)
    })

    it('coerces maxPoints to number', () => {
        const task = buildTask({ name: 'T', maxPoints: '15' as any })
        expect(task.maxPoints).toBe(15)
    })

    it('sets date to undefined when not provided', () => {
        const task = buildTask({ name: 'T' })
        expect(task.date).toBeUndefined()
    })

    it('sets description to undefined when empty string', () => {
        const task = buildTask({ name: 'T', description: '' })
        expect(task.description).toBeUndefined()
    })

    it('preserves non-empty description', () => {
        const task = buildTask({ name: 'T', description: 'Some desc' })
        expect(task.description).toBe('Some desc')
    })
})

describe('saveTask', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls repository with the built task for a new task', async () => {
        ;(tasksRepository.saveTask as any).mockResolvedValue('new-id')
        await saveTask({ name: 'New Task', maxPoints: 5 })
        expect(tasksRepository.saveTask).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'New Task',
                normalizedName: 'newtask',
                maxPoints: 5,
            }),
        )
    })

    it('assigns a new id when no existingTask provided', async () => {
        ;(tasksRepository.saveTask as any).mockResolvedValue('generated-id')
        await saveTask({ name: 'Fresh Task' })
        const [called] = (tasksRepository.saveTask as any).mock.calls[0]
        expect(called.id).toBeTruthy()
    })

    it('preserves existing task id when editing', async () => {
        ;(tasksRepository.saveTask as any).mockResolvedValue('existing-id')
        const existing = { id: 'existing-id', name: 'Old', normalizedName: 'old', maxPoints: 3 }
        await saveTask({ name: 'Updated', maxPoints: 7 }, existing)
        expect(tasksRepository.saveTask).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'existing-id',
                name: 'Updated',
                normalizedName: 'updated',
            }),
        )
    })

    it('propagates ConstraintError from repository without wrapping', async () => {
        const err = Object.assign(new Error('Duplicate key'), { name: 'ConstraintError' })
        ;(tasksRepository.saveTask as any).mockRejectedValue(err)
        await expect(saveTask({ name: 'Dup' })).rejects.toMatchObject({ name: 'ConstraintError' })
    })

    it('propagates validation errors from buildTask', async () => {
        await expect(saveTask({ name: '' })).rejects.toThrow('Task name is required')
        expect(tasksRepository.saveTask).not.toHaveBeenCalled()
    })
})
