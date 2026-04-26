import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unitsRepository } from '../units.repository'

describe('unitsRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveUnit', () => {
        it('throws when name is empty', async () => {
            await expect(
                unitsRepository.saveUnit({
                    name: '',
                    normalizedName: 'test',
                    taskIds: [],
                    testTaskId: null,
                    taskCoef: 1,
                    testCoef: 1,
                }),
            ).rejects.toThrow('Unit name is required')
        })

        it('throws when name is whitespace only', async () => {
            await expect(
                unitsRepository.saveUnit({
                    name: '   ',
                    normalizedName: 'test',
                    taskIds: [],
                    testTaskId: null,
                    taskCoef: 1,
                    testCoef: 1,
                }),
            ).rejects.toThrow('Unit name is required')
        })

        it('throws when normalizedName is empty', async () => {
            await expect(
                unitsRepository.saveUnit({
                    name: 'Module 1',
                    normalizedName: '',
                    taskIds: [],
                    testTaskId: null,
                    taskCoef: 1,
                    testCoef: 1,
                }),
            ).rejects.toThrow('Unit normalizedName is required')
        })

        it('calls put when unit has an id', async () => {
            const putSpy = vi.spyOn(unitsRepository, 'put').mockResolvedValue(1 as any)
            await unitsRepository.saveUnit({
                id: 1,
                name: 'Module 1',
                normalizedName: 'module1',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 1,
            })
            expect(putSpy).toHaveBeenCalled()
        })

        it('calls add and assigns ordinal when unit has no id', async () => {
            const getNextOrdinalSpy = vi.spyOn(unitsRepository, 'getNextOrdinal').mockResolvedValue(3)
            const addSpy = vi.spyOn(unitsRepository, 'add').mockResolvedValue(3 as any)
            const unit = {
                name: 'New Module',
                normalizedName: 'newmodule',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
            }
            await unitsRepository.saveUnit(unit)
            expect(getNextOrdinalSpy).toHaveBeenCalled()
            expect(unit).toMatchObject({ ordinal: 3 })
            expect(addSpy).toHaveBeenCalled()
        })

        it('does not call getNextOrdinal when ordinal is already set', async () => {
            const getNextOrdinalSpy = vi.spyOn(unitsRepository, 'getNextOrdinal')
            vi.spyOn(unitsRepository, 'add').mockResolvedValue(5 as any)
            await unitsRepository.saveUnit({
                name: 'Module',
                normalizedName: 'module',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 2,
            })
            expect(getNextOrdinalSpy).not.toHaveBeenCalled()
        })
    })

    // ─── getAllUnits ───────────────────────────────────────────────────────

    describe('getAllUnits', () => {
        it('returns an empty array when no units are stored', async () => {
            expect(await unitsRepository.getAllUnits()).toEqual([])
        })

        it('returns all stored units', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 1,
                name: 'Unit Alpha',
                normalizedName: 'unitalpha',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 1,
            })
            await db.put('units', {
                id: 2,
                name: 'Unit Beta',
                normalizedName: 'unitbeta',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 2,
            })

            const result = await unitsRepository.getAllUnits()

            expect(result).toHaveLength(2)
            expect(result.map(u => u.name)).toEqual(expect.arrayContaining(['Unit Alpha', 'Unit Beta']))
        })

        it('includes all unit fields in the result', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 3,
                name: 'Full Unit',
                normalizedName: 'fullunit',
                taskIds: ['t1', 't2'],
                testTaskId: 't3',
                taskCoef: 2,
                testCoef: 3,
                ordinal: 1,
                description: 'Desc',
            })

            const units = await unitsRepository.getAllUnits()
            const unit = units.find(u => u.id === 3) as any

            expect(unit.taskIds).toEqual(['t1', 't2'])
            expect(unit.testTaskId).toBe('t3')
            expect(unit.taskCoef).toBe(2)
            expect(unit.testCoef).toBe(3)
        })
    })

    // ─── findUnitByNormalizedName ──────────────────────────────────────────

    describe('findUnitByNormalizedName', () => {
        it('returns undefined when no unit matches', async () => {
            const result = await unitsRepository.findUnitByNormalizedName('nonexistent')
            expect(result).toBeUndefined()
        })

        it('returns the matching unit', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 4,
                name: 'Find Unit',
                normalizedName: 'findunit',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 1,
            })

            const result = await unitsRepository.findUnitByNormalizedName('findunit')

            expect(result).toBeDefined()
            expect(result!.name).toBe('Find Unit')
        })

        it('does not return a unit with a different normalizedName', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 5,
                name: 'Other Unit',
                normalizedName: 'otherunit',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 2,
            })

            const result = await unitsRepository.findUnitByNormalizedName('findunit')
            expect(result).toBeUndefined()
        })
    })

    // ─── getNextOrdinal ───────────────────────────────────────────────────

    describe('getNextOrdinal', () => {
        it('returns 1 when no units are stored', async () => {
            const result = await unitsRepository.getNextOrdinal()
            expect(result).toBe(1)
        })

        it('returns max ordinal + 1', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 6,
                name: 'Ord Unit A',
                normalizedName: 'ordunita',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 3,
            })
            await db.put('units', {
                id: 7,
                name: 'Ord Unit B',
                normalizedName: 'ordunitb',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 7,
            })

            const result = await unitsRepository.getNextOrdinal()

            expect(result).toBe(8)
        })

        it('treats units with undefined ordinal as ordinal 0', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 8,
                name: 'No Ord Unit',
                normalizedName: 'noordunit',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
            })

            const result = await unitsRepository.getNextOrdinal()

            expect(result).toBe(1) // max(0) + 1
        })
    })

    // ─── updateOrdinals ───────────────────────────────────────────────────

    describe('updateOrdinals', () => {
        it('updates ordinals for the specified units', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 9,
                name: 'Upd Unit A',
                normalizedName: 'updunita',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 1,
            })
            await db.put('units', {
                id: 10,
                name: 'Upd Unit B',
                normalizedName: 'updunitb',
                taskIds: [],
                testTaskId: null,
                taskCoef: 1,
                testCoef: 1,
                ordinal: 2,
            })

            await unitsRepository.updateOrdinals([
                { id: 9, ordinal: 5 },
                { id: 10, ordinal: 3 },
            ])

            const units = await unitsRepository.getAllUnits()
            const a = units.find(u => u.id === 9)!
            const b = units.find(u => u.id === 10)!
            expect(a.ordinal).toBe(5)
            expect(b.ordinal).toBe(3)
        })

        it('does not throw when given ids that do not exist', async () => {
            await expect(unitsRepository.updateOrdinals([{ id: 9999, ordinal: 1 }])).resolves.not.toThrow()
        })

        it('preserves other fields when updating ordinal', async () => {
            const db = await (unitsRepository as any).getDb()
            await db.put('units', {
                id: 11,
                name: 'Preserved Unit',
                normalizedName: 'preservedunit',
                taskIds: ['t1'],
                testTaskId: 't2',
                taskCoef: 2,
                testCoef: 3,
                ordinal: 1,
            })

            await unitsRepository.updateOrdinals([{ id: 11, ordinal: 99 }])

            const units = await unitsRepository.getAllUnits()
            const u = units.find(x => x.id === 11)!
            expect(u.ordinal).toBe(99)
            expect(u.taskIds).toEqual(['t1'])
            expect(u.taskCoef).toBe(2)
        })
    })
})
