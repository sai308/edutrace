import { describe, expect, it } from 'vitest'
import { databaseService } from '@/shared/services/DatabaseService'
import { groupsRepository } from '../groups.repository'

describe('groupsRepository', () => {
    // ─── getGroups ─────────────────────────────────────────────────────────

    describe('getGroups', () => {
        it('returns an empty array when no groups are stored', async () => {
            expect(await groupsRepository.getGroups()).toEqual([])
        })

        it('returns all stored groups', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'g1', meetId: 'rg-001', name: 'Repository Group A' })
            await db.put('groups', { id: 'g2', meetId: 'rg-002', name: 'Repository Group B' })

            const result = await groupsRepository.getGroups()

            expect(result).toHaveLength(2)
            expect(result.map(g => g.id)).toEqual(expect.arrayContaining(['g1', 'g2']))
        })

        it('returns the full group shape including all fields', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', {
                id: 'g3',
                meetId: 'rg-003',
                name: 'Full Shape Group',
                teacher: 'Prof. X',
                course: 2,
            })

            const groups = await groupsRepository.getGroups()
            const group = groups[0]!

            expect(group.id).toBe('g3')
            expect(group.meetId).toBe('rg-003')
            expect(group.name).toBe('Full Shape Group')
            expect(group.teacher).toBe('Prof. X')
            expect(group.course).toBe(2)
        })
    })

    // ─── saveGroup ─────────────────────────────────────────────────────────

    describe('saveGroup', () => {
        it('throws when name is missing', async () => {
            await expect(groupsRepository.saveGroup({ name: '', meetId: 'sg-001' } as any)).rejects.toThrow(
                'saveGroup: group must have a name and meetId',
            )
        })

        it('throws when meetId is missing', async () => {
            await expect(groupsRepository.saveGroup({ name: 'Group X', meetId: '' } as any)).rejects.toThrow(
                'saveGroup: group must have a name and meetId',
            )
        })

        it('saves a new group with a service-assigned id and returns that id', async () => {
            const id = await groupsRepository.saveGroup({
                id: 'uuid-new',
                name: 'New Repo Group',
                meetId: 'sg-new',
            })

            expect(id).toBe('uuid-new')
            const groups = await groupsRepository.getGroups()
            expect(groups.some(g => g.name === 'New Repo Group')).toBe(true)
        })

        it('persists the id onto the stored record', async () => {
            const db = await databaseService.getDb()
            const group: any = { id: 'uuid-assigned', name: 'Id Assigned Group', meetId: 'sg-id' }

            await groupsRepository.saveGroup(group)

            const stored = await db.get('groups', 'uuid-assigned')
            expect(stored).toBeDefined()
            expect((stored as any).id).toBe('uuid-assigned')
        })

        it('updates an existing group when id is provided and preserves it', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'existing-g', meetId: 'sg-upd', name: 'Original Name' })

            await groupsRepository.saveGroup({
                id: 'existing-g',
                meetId: 'sg-upd',
                name: 'Updated Name',
            })

            const groups = await groupsRepository.getGroups()
            const updated = groups.find(g => g.id === 'existing-g')
            expect(updated!.name).toBe('Updated Name')
        })

        it('returns the existing id when updating', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'ret-id-g', meetId: 'sg-ret', name: 'Return Id Group' })

            const returned = await groupsRepository.saveGroup({
                id: 'ret-id-g',
                meetId: 'sg-ret',
                name: 'Return Id Group Updated',
            })

            expect(returned).toBe('ret-id-g')
        })
    })

    // ─── deleteGroup ───────────────────────────────────────────────────────

    describe('deleteGroup', () => {
        it('removes a group by string id', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'del-g1', meetId: 'dg-001', name: 'Delete Group A' })

            await groupsRepository.deleteGroup('del-g1')

            const groups = await groupsRepository.getGroups()
            expect(groups.find(g => g.id === 'del-g1')).toBeUndefined()
        })

        it('accepts a numeric id', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 42, meetId: 'dg-num', name: 'Numeric Id Group' })

            await expect(groupsRepository.deleteGroup(42)).resolves.not.toThrow()
        })

        it('throws when id is null', async () => {
            await expect(groupsRepository.deleteGroup(null as any)).rejects.toThrow()
        })

        it('throws when id is empty string', async () => {
            await expect(groupsRepository.deleteGroup('')).rejects.toThrow()
        })

        it('throws when id is undefined', async () => {
            await expect(groupsRepository.deleteGroup(undefined as any)).rejects.toThrow()
        })

        it('does not throw for numeric id 0', async () => {
            // 0 is a valid id per the guard: `if (!id && id !== 0)`
            await expect(groupsRepository.deleteGroup(0)).resolves.not.toThrow()
        })
    })

    // ─── getGroupMap ───────────────────────────────────────────────────────

    describe('getGroupMap', () => {
        it('returns an empty object when no groups are stored', async () => {
            expect(await groupsRepository.getGroupMap()).toEqual({})
        })

        it('returns a record keyed by meetId', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'gm1', meetId: 'map-001', name: 'Map Group A' })
            await db.put('groups', { id: 'gm2', meetId: 'map-002', name: 'Map Group B' })

            const map = await groupsRepository.getGroupMap()

            expect(map['map-001']).toBeDefined()
            expect(map['map-002']).toBeDefined()
        })

        it('each entry in the map holds the full group object', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', {
                id: 'gm3',
                meetId: 'map-003',
                name: 'Map Full Group',
                course: 3,
            })

            const map = await groupsRepository.getGroupMap()

            expect(map['map-003']!.name).toBe('Map Full Group')
            expect(map['map-003']!.course).toBe(3)
            expect(map['map-003']!.id).toBe('gm3')
        })

        it('map size matches the number of stored groups', async () => {
            const db = await databaseService.getDb()
            await db.put('groups', { id: 'gm4', meetId: 'map-004', name: 'Map Size Group A' })
            await db.put('groups', { id: 'gm5', meetId: 'map-005', name: 'Map Size Group B' })
            await db.put('groups', { id: 'gm6', meetId: 'map-006', name: 'Map Size Group C' })

            const map = await groupsRepository.getGroupMap()

            expect(Object.keys(map)).toHaveLength(3)
        })
    })
})
