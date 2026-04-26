import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unitsRepository } from '../units.repository'
import { buildUnit, normalizeUnitName, saveUnit } from '../units.service'

vi.mock('../units.repository')

describe('normalizeUnitName', () => {
    it('lowercases and removes all spaces', () => {
        expect(normalizeUnitName('Module One')).toBe('moduleone')
    })

    it('collapses multiple internal spaces', () => {
        expect(normalizeUnitName('Unit  2  Advanced')).toBe('unit2advanced')
    })

    it('returns empty string for empty input', () => {
        expect(normalizeUnitName('')).toBe('')
    })

    it('handles leading and trailing whitespace', () => {
        expect(normalizeUnitName('  Test  ')).toBe('test')
    })
})

describe('buildUnit', () => {
    it('builds a new unit from form data with defaults', () => {
        const unit = buildUnit({ name: 'Module 1' })
        expect(unit.name).toBe('Module 1')
        expect(unit.normalizedName).toBe('module1')
        expect(unit.taskIds).toEqual([])
        expect(unit.testTaskId).toBeNull()
        expect(unit.taskCoef).toBe(1)
        expect(unit.testCoef).toBe(1)
        expect(unit.description).toBe('')
        expect(unit.id).toBeUndefined()
        expect(unit.createdAt).toBeTruthy()
        expect(unit.updatedAt).toBeTruthy()
    })

    it('trims name and computes normalizedName', () => {
        const unit = buildUnit({ name: '  Advanced Module  ' })
        expect(unit.name).toBe('Advanced Module')
        expect(unit.normalizedName).toBe('advancedmodule')
    })

    it('throws when name is empty after trim', () => {
        expect(() => buildUnit({ name: '' })).toThrow('Unit name is required')
        expect(() => buildUnit({ name: '   ' })).toThrow('Unit name is required')
        expect(() => buildUnit({})).toThrow('Unit name is required')
    })

    it('preserves id, ordinal, and createdAt from existingUnit', () => {
        const existing = {
            id: 5,
            name: 'Old',
            normalizedName: 'old',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 3,
            createdAt: '2024-01-01T00:00:00.000Z',
        }
        const unit = buildUnit({ name: 'New Name' }, existing)
        expect(unit.id).toBe(5)
        expect(unit.ordinal).toBe(3)
        expect(unit.createdAt).toBe('2024-01-01T00:00:00.000Z')
    })

    it('sets updatedAt to a new timestamp', () => {
        const before = new Date().toISOString()
        const unit = buildUnit({ name: 'Module' })
        expect(unit.updatedAt! >= before).toBe(true)
    })

    it('coerces taskCoef and testCoef to numbers', () => {
        const unit = buildUnit({ name: 'M', taskCoef: '2.5' as any, testCoef: '0.5' as any })
        expect(unit.taskCoef).toBe(2.5)
        expect(unit.testCoef).toBe(0.5)
    })

    it('defaults coefs to 1 when falsy', () => {
        const unit = buildUnit({ name: 'M', taskCoef: 0, testCoef: 0 })
        expect(unit.taskCoef).toBe(1)
        expect(unit.testCoef).toBe(1)
    })
})

describe('saveUnit', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws when name is empty', async () => {
        await expect(saveUnit({ name: '' })).rejects.toThrow('Unit name is required')
        expect(unitsRepository.findUnitByNormalizedName).not.toHaveBeenCalled()
    })

    it('throws DuplicateUnitError when another unit with same name exists', async () => {
        ;(unitsRepository.findUnitByNormalizedName as any).mockResolvedValue({
            id: 99,
            name: 'Module 1',
        })
        const err = await saveUnit({ name: 'Module 1' }).catch(e => e)
        expect(err.name).toBe('DuplicateUnitError')
        expect(unitsRepository.saveUnit).not.toHaveBeenCalled()
    })

    it('does not throw DuplicateUnitError when duplicate is the same unit being edited', async () => {
        ;(unitsRepository.findUnitByNormalizedName as any).mockResolvedValue({
            id: 5,
            name: 'Module 1',
        })
        ;(unitsRepository.saveUnit as any).mockResolvedValue(5)
        const existing = {
            id: 5,
            name: 'Module 1',
            normalizedName: 'module1',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
        }
        await expect(saveUnit({ name: 'Module 1' }, existing)).resolves.toBeUndefined()
    })

    it('calls repository saveUnit with the built unit', async () => {
        ;(unitsRepository.findUnitByNormalizedName as any).mockResolvedValue(undefined)
        ;(unitsRepository.saveUnit as any).mockResolvedValue(1)
        await saveUnit({
            name: 'Module 2',
            taskIds: ['t1'],
            testTaskId: 't1',
            taskCoef: 2,
            testCoef: 1,
        })
        expect(unitsRepository.saveUnit).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Module 2',
                normalizedName: 'module2',
                taskIds: ['t1'],
                testTaskId: 't1',
                taskCoef: 2,
            }),
        )
    })

    it('propagates unexpected errors from repository', async () => {
        ;(unitsRepository.findUnitByNormalizedName as any).mockResolvedValue(undefined)
        ;(unitsRepository.saveUnit as any).mockRejectedValue(new Error('DB failure'))
        await expect(saveUnit({ name: 'Module' })).rejects.toThrow('DB failure')
    })
})
