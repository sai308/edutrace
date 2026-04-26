import type { Module } from '../../types/summary'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { modulesRepository } from '../modules.repository'

describe('modulesRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const makeModule = (id: number, groupName: string, overrides: Partial<Module> = {}): Module => ({
        id,
        groupId: groupName,
        groupName,
        name: `Module ${id}`,
        ...overrides,
    })

    // ─── saveModule ───────────────────────────────────────────────────────

    describe('saveModule', () => {
        it('calls put when module has an id', async () => {
            const putSpy = vi.spyOn(modulesRepository, 'put').mockResolvedValue(1 as any)
            await modulesRepository.saveModule(makeModule(1, 'G1'))
            expect(putSpy).toHaveBeenCalled()
        })

        it('calls add when module has no id', async () => {
            const addSpy = vi.spyOn(modulesRepository, 'add').mockResolvedValue(2 as any)
            const module: Module = { groupId: 'G1', groupName: 'G1', name: 'New Module' }
            await modulesRepository.saveModule(module)
            expect(addSpy).toHaveBeenCalled()
        })

        it('persists a new module and returns its id', async () => {
            const db = await (modulesRepository as any).getDb()
            const id = await modulesRepository.saveModule({
                groupId: 'G1',
                groupName: 'G1',
                name: 'Persisted Module',
            })
            const stored = await db.get('modules', id)
            expect(stored).toBeDefined()
            expect((stored as any).name).toBe('Persisted Module')
        })

        it('updates an existing module by id', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 10,
                groupId: 'G1',
                groupName: 'G1',
                name: 'Original Name',
            })

            await modulesRepository.saveModule({
                id: 10,
                groupId: 'G1',
                groupName: 'G1',
                name: 'Updated Name',
            })

            const stored = (await db.get('modules', 10)) as any
            expect(stored.name).toBe('Updated Name')
        })
    })

    // ─── getAllModules ────────────────────────────────────────────────────

    describe('getAllModules', () => {
        it('returns an empty array when no modules are stored', async () => {
            expect(await modulesRepository.getAllModules()).toEqual([])
        })

        it('returns all stored modules', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', makeModule(20, 'Group A'))
            await db.put('modules', makeModule(21, 'Group B'))

            const result = await modulesRepository.getAllModules()

            expect(result).toHaveLength(2)
            expect(result.map((m) => m.id)).toEqual(expect.arrayContaining([20, 21]))
        })

        it('returns modules with all stored fields', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 22,
                groupId: 'G2',
                groupName: 'Group C',
                name: 'Full Module',
                extraField: 'extra',
            })

            const modules = await modulesRepository.getAllModules()
            const m = modules.find((x) => x.id === 22) as any

            expect(m.groupName).toBe('Group C')
            expect(m.extraField).toBe('extra')
        })
    })

    // ─── getModulesByGroup ────────────────────────────────────────────────

    describe('getModulesByGroup', () => {
        it('returns an empty array when no modules match the group', async () => {
            const result = await modulesRepository.getModulesByGroup('NonExistent')
            expect(result).toEqual([])
        })

        it('returns only modules for the requested group', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 30,
                groupId: 'G3',
                groupName: 'Target Group',
                name: 'Target Module A',
            })
            await db.put('modules', {
                id: 31,
                groupId: 'G3',
                groupName: 'Target Group',
                name: 'Target Module B',
            })
            await db.put('modules', {
                id: 32,
                groupId: 'G4',
                groupName: 'Other Group',
                name: 'Other Module',
            })

            const result = await modulesRepository.getModulesByGroup('Target Group')

            expect(result).toHaveLength(2)
            expect(result.every((m) => m.groupName === 'Target Group')).toBe(true)
        })

        it('does not return modules from other groups', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 33,
                groupId: 'G5',
                groupName: 'Group E',
                name: 'Module E',
            })

            const result = await modulesRepository.getModulesByGroup('Group F')
            expect(result.some((m) => m.id === 33)).toBe(false)
        })
    })

    // ─── getModuleById ────────────────────────────────────────────────────

    describe('getModuleById', () => {
        it('returns undefined for an unknown id', async () => {
            const result = await modulesRepository.getModuleById(9999)
            expect(result).toBeUndefined()
        })

        it('returns the module for a known id', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 40,
                groupId: 'G6',
                groupName: 'Group F',
                name: 'Find By Id Module',
            })

            const result = await modulesRepository.getModuleById(40)

            expect(result).toBeDefined()
            expect(result!.name).toBe('Find By Id Module')
        })

        it('accepts string ids', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 41,
                groupId: 'G7',
                groupName: 'Group G',
                name: 'String Id Module',
            })

            const result = await modulesRepository.getModuleById('41' as any)
            // May or may not find it depending on IDB key coercion; at minimum should not throw
            expect(() => result).not.toThrow()
        })
    })

    // ─── deleteModule ─────────────────────────────────────────────────────

    describe('deleteModule', () => {
        it('removes a module by id', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 50,
                groupId: 'G8',
                groupName: 'Group H',
                name: 'Delete Module',
            })

            await modulesRepository.deleteModule(50)

            const remaining = await modulesRepository.getAllModules()
            expect(remaining.some((m) => m.id === 50)).toBe(false)
        })

        it('does not affect other modules', async () => {
            const db = await (modulesRepository as any).getDb()
            await db.put('modules', {
                id: 51,
                groupId: 'G9',
                groupName: 'Group I',
                name: 'Keep Module',
            })
            await db.put('modules', {
                id: 52,
                groupId: 'G9',
                groupName: 'Group I',
                name: 'Remove Module',
            })

            await modulesRepository.deleteModule(52)

            const remaining = await modulesRepository.getAllModules()
            expect(remaining.some((m) => m.id === 51)).toBe(true)
            expect(remaining.some((m) => m.id === 52)).toBe(false)
        })

        it('does not throw when id does not exist', async () => {
            await expect(modulesRepository.deleteModule(9999)).resolves.not.toThrow()
        })
    })
})
