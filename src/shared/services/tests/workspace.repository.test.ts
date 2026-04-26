import type { WorkspaceExportData } from '@/shared/types/workspaces'
import { beforeEach, describe, expect, it } from 'vitest'
import { databaseService } from '../DatabaseService'
import { workspaceRepository } from '../workspace.repository'

// Fixed DB names used by these tests — registered in tests/setup.ts for cleanup
const DB_WS_A = 'test-ws-a'
const DB_WS_B = 'test-ws-b'
const DB_WS_C = 'test-ws-c'

// Full set of stores that export/import operate on
const MAINTENANCE_STORES = [
    'meets',
    'groups',
    'tasks',
    'units',
    'marks',
    'members',
    'finalAssessments',
    'modules',
] as const

// Empty data payload keyed by MAINTENANCE_STORES
const EMPTY_DATA: Record<string, any[]> = Object.fromEntries(MAINTENANCE_STORES.map((s) => [s, []]))

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface WorkspaceSeed {
    id: string
    name: string
    dbName: string
    icon?: string
}

function seedWorkspaces(entries: WorkspaceSeed[]) {
    localStorage.setItem('edutrace_current_workspace', entries[0]!.id)
    localStorage.setItem(
        'edutrace_workspaces',
        JSON.stringify(entries.map((e) => ({ ...e, createdAt: new Date().toISOString() })))
    )
}

/** Initialize an IDB at the given dbName using the full current schema. */
async function initDb(id: string, name: string, dbName: string, extra: WorkspaceSeed = { id, name, dbName }) {
    seedWorkspaces([{ ...extra, id, name, dbName }])
    await databaseService.resetConnection()
    const db = await databaseService.getDb()
    return db
}

/** Build a minimal export envelope ready for importWorkspaces. */
function buildPayload(ws: {
    id: string
    name: string
    dbName: string
    icon?: string
    data?: Record<string, any[]>
}): WorkspaceExportData {
    return {
        type: 'multi-workspace-backup',
        version: 1,
        timestamp: new Date().toISOString(),
        workspaces: [
            {
                ...ws,
                data: ws.data ?? EMPTY_DATA,
            },
        ],
    }
}

// ─── getWorkspaces ─────────────────────────────────────────────────────────

describe('getWorkspaces', () => {
    it('returns a single default workspace when localStorage is empty', () => {
        const result = workspaceRepository.getWorkspaces()
        expect(result).toHaveLength(1)
        expect(result[0]!.id).toBe('default')
        expect(result[0]!.name).toBe('Default')
    })

    it('returns all workspaces persisted in localStorage', () => {
        seedWorkspaces([
            { id: 'ws-1', name: 'First', dbName: DB_WS_A },
            { id: 'ws-2', name: 'Second', dbName: DB_WS_B },
        ])
        const result = workspaceRepository.getWorkspaces()
        expect(result).toHaveLength(2)
        expect(result.map((w) => w.id)).toEqual(['ws-1', 'ws-2'])
    })
})

// ─── getCurrentWorkspaceId ─────────────────────────────────────────────────

describe('getCurrentWorkspaceId', () => {
    it('returns "default" when nothing is stored', () => {
        expect(workspaceRepository.getCurrentWorkspaceId()).toBe('default')
    })

    it('returns the stored current workspace ID', () => {
        localStorage.setItem('edutrace_current_workspace', 'ws-x')
        expect(workspaceRepository.getCurrentWorkspaceId()).toBe('ws-x')
    })
})

// ─── createWorkspace ───────────────────────────────────────────────────────

describe('createWorkspace', () => {
    it('adds a new workspace entry with a generated UUID', async () => {
        const id = await workspaceRepository.createWorkspace('Spring 2025')
        const list = workspaceRepository.getWorkspaces()
        const created = list.find((w) => w.id === id)
        expect(created).toBeDefined()
        expect(created!.name).toBe('Spring 2025')
        expect(created!.dbName).toMatch(/meet-attendance-db-/)
    })

    it('assigns the provided icon', async () => {
        const id = await workspaceRepository.createWorkspace('Autumn', { icon: 'BookOpen' })
        const created = workspaceRepository.getWorkspaces().find((w) => w.id === id)
        expect(created!.icon).toBe('BookOpen')
    })

    it('does not change the active workspace', async () => {
        localStorage.setItem('edutrace_current_workspace', 'default')
        await workspaceRepository.createWorkspace('Another')
        expect(workspaceRepository.getCurrentWorkspaceId()).toBe('default')
    })
})

// ─── switchWorkspace ──────────────────────────────────────────────────────

describe('switchWorkspace', () => {
    beforeEach(() => {
        seedWorkspaces([
            { id: 'default', name: 'Default', dbName: 'meet-attendance-db' },
            { id: 'ws-other', name: 'Other', dbName: DB_WS_A },
        ])
    })

    it('updates the current workspace ID', async () => {
        await workspaceRepository.switchWorkspace('ws-other')
        expect(workspaceRepository.getCurrentWorkspaceId()).toBe('ws-other')
    })

    it('throws when the target workspace does not exist', async () => {
        await expect(workspaceRepository.switchWorkspace('nonexistent')).rejects.toThrow()
    })
})

// ─── updateWorkspace ──────────────────────────────────────────────────────

describe('updateWorkspace', () => {
    it('renames a workspace without changing its ID or dbName', async () => {
        seedWorkspaces([{ id: 'ws-1', name: 'Old Name', dbName: DB_WS_A }])
        await workspaceRepository.updateWorkspace('ws-1', { name: 'New Name' })
        const updated = workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-1')
        expect(updated!.name).toBe('New Name')
        expect(updated!.dbName).toBe(DB_WS_A)
    })

    it('throws when the workspace does not exist', async () => {
        await expect(workspaceRepository.updateWorkspace('ghost', { name: 'X' })).rejects.toThrow('Workspace not found')
    })

    it('preserves ID and dbName even when those fields are passed', async () => {
        seedWorkspaces([{ id: 'ws-1', name: 'Original', dbName: DB_WS_A }])
        await workspaceRepository.updateWorkspace('ws-1', {
            id: 'injected-id',
            dbName: 'injected-db',
            name: 'Renamed',
        })
        const ws = workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-1')
        expect(ws!.id).toBe('ws-1')
        expect(ws!.dbName).toBe(DB_WS_A)
    })
})

// ─── deleteWorkspace ──────────────────────────────────────────────────────

describe('deleteWorkspace', () => {
    it('refuses to delete the default workspace', async () => {
        await expect(workspaceRepository.deleteWorkspace('default')).rejects.toThrow('Cannot delete default workspace')
    })

    it('removes the workspace from the list', async () => {
        seedWorkspaces([
            { id: 'default', name: 'Default', dbName: 'meet-attendance-db' },
            { id: 'ws-del', name: 'ToDelete', dbName: DB_WS_C },
        ])
        await workspaceRepository.deleteWorkspace('ws-del')
        const list = workspaceRepository.getWorkspaces()
        expect(list.find((w) => w.id === 'ws-del')).toBeUndefined()
    })

    it('falls back to default workspace when the active workspace is deleted', async () => {
        seedWorkspaces([
            { id: 'default', name: 'Default', dbName: 'meet-attendance-db' },
            { id: 'ws-active', name: 'Active', dbName: DB_WS_C },
        ])
        localStorage.setItem('edutrace_current_workspace', 'ws-active')
        await workspaceRepository.deleteWorkspace('ws-active')
        expect(workspaceRepository.getCurrentWorkspaceId()).toBe('default')
    })

    it('does not affect other workspaces', async () => {
        seedWorkspaces([
            { id: 'default', name: 'Default', dbName: 'meet-attendance-db' },
            { id: 'ws-keep', name: 'Keep', dbName: DB_WS_A },
            { id: 'ws-del', name: 'Delete', dbName: DB_WS_C },
        ])
        await workspaceRepository.deleteWorkspace('ws-del')
        expect(workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-keep')).toBeDefined()
    })
})

// ─── exportWorkspaces ─────────────────────────────────────────────────────

describe('exportWorkspaces', () => {
    it('returns a multi-workspace-backup envelope with workspace metadata', async () => {
        await initDb('ws-exp', 'Export WS', DB_WS_A)
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-exp'])
        expect(result.type).toBe('multi-workspace-backup')
        expect(result.workspaces).toHaveLength(1)
        expect(result.workspaces[0]!.id).toBe('ws-exp')
        expect(result.workspaces[0]!.name).toBe('Export WS')
    })

    it('sets version to 1', async () => {
        await initDb('ws-ver', 'Ver WS', DB_WS_A)
        await databaseService.resetConnection()
        const result = await workspaceRepository.exportWorkspaces(['ws-ver'])
        expect(result.version).toBe(1)
    })

    it('includes a valid ISO timestamp', async () => {
        await initDb('ws-ts', 'TS WS', DB_WS_A)
        await databaseService.resetConnection()
        const before = Date.now()
        const result = await workspaceRepository.exportWorkspaces(['ws-ts'])
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all maintenance stores in the export payload', async () => {
        await initDb('ws-stores', 'Stores WS', DB_WS_A)
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-stores'])
        const storeKeys = Object.keys(result.workspaces[0]!.data)
        expect(storeKeys).toEqual(expect.arrayContaining([...MAINTENANCE_STORES]))
    })

    it('returns empty arrays per store when the workspace has no data', async () => {
        await initDb('ws-empty', 'Empty WS', DB_WS_A)
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-empty'])
        for (const store of MAINTENANCE_STORES) {
            expect(result.workspaces[0]!.data[store]).toEqual([])
        }
    })

    it('preserves the workspace icon in the export payload', async () => {
        await initDb('ws-icon', 'Icon WS', DB_WS_A, {
            id: 'ws-icon',
            name: 'Icon WS',
            dbName: DB_WS_A,
            icon: 'BookOpen',
        })
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-icon'])
        expect(result.workspaces[0]!.icon).toBe('BookOpen')
    })

    it('includes data written to the workspace before export', async () => {
        const db = await initDb('ws-data', 'Data WS', DB_WS_A)
        await db.put('groups', { id: 'g1', name: 'CS-101', meetId: 'abc', createdAt: '' })
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-data'])
        const groups = result.workspaces[0]!.data.groups as any[]
        expect(groups).toHaveLength(1)
        expect(groups[0].id).toBe('g1')
    })

    it('exports data from multiple stores', async () => {
        const db = await initDb('ws-ms', 'Multi Store', DB_WS_A)
        await db.put('groups', { id: 'g1', name: 'G1', meetId: 'x', createdAt: '' })
        await db.put('meets', { id: 'm1', name: 'M1', createdAt: '', groupId: 'g1' })
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-ms'])
        const data = result.workspaces[0]!.data
        expect((data.groups as any[]).find((g) => g.id === 'g1')).toBeDefined()
        expect((data.meets as any[]).find((m) => m.id === 'm1')).toBeDefined()
    })

    it('exports multiple workspaces in one call', async () => {
        const db1 = await initDb('ws-m1', 'Multi 1', DB_WS_A)
        await db1.put('groups', { id: 'g-m1', name: 'M1', meetId: 'x', createdAt: '' })

        const db2 = await initDb('ws-m2', 'Multi 2', DB_WS_B)
        await db2.put('groups', { id: 'g-m2', name: 'M2', meetId: 'y', createdAt: '' })

        // Both workspaces must be registered for exportWorkspaces to find them
        seedWorkspaces([
            { id: 'ws-m1', name: 'Multi 1', dbName: DB_WS_A },
            { id: 'ws-m2', name: 'Multi 2', dbName: DB_WS_B },
        ])
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-m1', 'ws-m2'])
        expect(result.workspaces).toHaveLength(2)
        expect(result.workspaces.map((w) => w.id)).toEqual(expect.arrayContaining(['ws-m1', 'ws-m2']))

        const ws1Groups = result.workspaces.find((w) => w.id === 'ws-m1')!.data.groups as any[]
        const ws2Groups = result.workspaces.find((w) => w.id === 'ws-m2')!.data.groups as any[]
        expect(ws1Groups[0]!.id).toBe('g-m1')
        expect(ws2Groups[0]!.id).toBe('g-m2')
    })

    it('returns empty workspaces array when called with empty workspaceIds', async () => {
        const result = await workspaceRepository.exportWorkspaces([])
        expect(result.workspaces).toHaveLength(0)
    })

    it('silently skips workspace IDs not present in the list', async () => {
        await initDb('ws-present', 'Present', DB_WS_A)
        await databaseService.resetConnection()

        const result = await workspaceRepository.exportWorkspaces(['ws-present', 'ws-ghost'])
        expect(result.workspaces).toHaveLength(1)
        expect(result.workspaces[0]!.id).toBe('ws-present')
    })
})

// ─── importWorkspaces ─────────────────────────────────────────────────────

describe('importWorkspaces', () => {
    it('registers a new workspace entry in localStorage', async () => {
        const payload = buildPayload({ id: 'ws-imported', name: 'Imported', dbName: DB_WS_B })
        await workspaceRepository.importWorkspaces(payload, ['ws-imported'])
        const found = workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-imported')
        expect(found).toBeDefined()
        expect(found!.name).toBe('Imported')
    })

    it('restores records into the target IDB store', async () => {
        const payload = buildPayload({
            id: 'ws-restore',
            name: 'Restore',
            dbName: DB_WS_B,
            data: {
                ...EMPTY_DATA,
                groups: [{ id: 'g-restore', name: 'KN-41', meetId: 'xyz', createdAt: '' }],
            },
        })
        await workspaceRepository.importWorkspaces(payload, ['ws-restore'])

        seedWorkspaces([{ id: 'ws-restore', name: 'Restore', dbName: DB_WS_B }])
        await databaseService.resetConnection()
        const db = await databaseService.getDb()
        const groups = await db.getAll('groups')
        expect(groups).toHaveLength(1)
        expect(groups[0]!.id).toBe('g-restore')
    })

    it('restores data across multiple stores', async () => {
        const payload = buildPayload({
            id: 'ws-multi-s',
            name: 'Multi S',
            dbName: DB_WS_A,
            data: {
                ...EMPTY_DATA,
                groups: [{ id: 'g1', name: 'G1', meetId: 'x', createdAt: '' }],
                meets: [{ id: 'm1', name: 'M1', createdAt: '', groupId: 'g1' }],
                marks: [{ id: 'mk1', value: 90, createdAt: '' }],
            },
        })
        await workspaceRepository.importWorkspaces(payload, ['ws-multi-s'])

        seedWorkspaces([{ id: 'ws-multi-s', name: 'Multi S', dbName: DB_WS_A }])
        await databaseService.resetConnection()
        const db = await databaseService.getDb()

        expect(await db.getAll('groups')).toHaveLength(1)
        expect(await db.getAll('meets')).toHaveLength(1)
        expect(await db.getAll('marks')).toHaveLength(1)
    })

    it('clears pre-existing data before restoring imported records', async () => {
        // Seed the workspace with old data
        const db = await initDb('ws-owt', 'Overwrite', DB_WS_A)
        await db.put('groups', { id: 'old-g', name: 'Old', meetId: 'old', createdAt: '' })
        await databaseService.resetConnection()

        // Import new data for the same workspace / DB
        const payload = buildPayload({
            id: 'ws-owt',
            name: 'Overwrite',
            dbName: DB_WS_A,
            data: {
                ...EMPTY_DATA,
                groups: [{ id: 'new-g', name: 'New', meetId: 'new', createdAt: '' }],
            },
        })
        await workspaceRepository.importWorkspaces(payload, ['ws-owt'])

        seedWorkspaces([{ id: 'ws-owt', name: 'Overwrite', dbName: DB_WS_A }])
        await databaseService.resetConnection()
        const db2 = await databaseService.getDb()
        const groups = await db2.getAll('groups')

        expect(groups).toHaveLength(1)
        expect(groups[0]!.id).toBe('new-g')
    })

    it('does not add a duplicate entry when the workspace is already registered', async () => {
        seedWorkspaces([
            { id: 'default', name: 'Default', dbName: 'meet-attendance-db' },
            { id: 'ws-dup', name: 'Dup', dbName: DB_WS_A },
        ])

        const payload = buildPayload({ id: 'ws-dup', name: 'Dup', dbName: DB_WS_A })
        await workspaceRepository.importWorkspaces(payload, ['ws-dup'])

        const dupEntries = workspaceRepository.getWorkspaces().filter((w) => w.id === 'ws-dup')
        expect(dupEntries).toHaveLength(1)
    })

    it('imports multiple selected workspaces in one call', async () => {
        const payload: WorkspaceExportData = {
            type: 'multi-workspace-backup',
            version: 1,
            timestamp: new Date().toISOString(),
            workspaces: [
                { id: 'ws-ia', name: 'Import A', dbName: DB_WS_A, data: EMPTY_DATA },
                { id: 'ws-ib', name: 'Import B', dbName: DB_WS_B, data: EMPTY_DATA },
            ],
        }
        await workspaceRepository.importWorkspaces(payload, ['ws-ia', 'ws-ib'])

        const list = workspaceRepository.getWorkspaces()
        expect(list.find((w) => w.id === 'ws-ia')).toBeDefined()
        expect(list.find((w) => w.id === 'ws-ib')).toBeDefined()
    })

    it('falls back to "Database" icon when icon is absent in the payload', async () => {
        const payload = buildPayload({ id: 'ws-noicon', name: 'No Icon', dbName: DB_WS_A })
        // payload.workspaces[0].icon is undefined
        await workspaceRepository.importWorkspaces(payload, ['ws-noicon'])

        const ws = workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-noicon')
        expect(ws!.icon).toBe('Database')
    })

    it('skips workspace IDs not included in selectedIds', async () => {
        const payload: WorkspaceExportData = {
            type: 'multi-workspace-backup',
            version: 1,
            timestamp: new Date().toISOString(),
            workspaces: [
                { id: 'ws-yes', name: 'Yes', dbName: DB_WS_A, data: EMPTY_DATA },
                { id: 'ws-no', name: 'No', dbName: DB_WS_B, data: EMPTY_DATA },
            ],
        }
        await workspaceRepository.importWorkspaces(payload, ['ws-yes'])
        expect(workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-no')).toBeUndefined()
    })

    it('full round-trip: exported data is faithfully restored after wipe', async () => {
        const db = await initDb('ws-rt', 'Round Trip', DB_WS_B)
        await db.put('groups', { id: 'rt-g1', name: 'RT Group', meetId: 'rt-x', createdAt: '' })
        await db.put('meets', { id: 'rt-m1', name: 'RT Meet', createdAt: '', groupId: 'rt-g1' })
        await databaseService.resetConnection()

        const exported = await workspaceRepository.exportWorkspaces(['ws-rt'])

        // Wipe all data then re-import
        await workspaceRepository.deleteWorkspacesData(['ws-rt'])
        await workspaceRepository.importWorkspaces(exported, ['ws-rt'])

        seedWorkspaces([{ id: 'ws-rt', name: 'Round Trip', dbName: DB_WS_B }])
        await databaseService.resetConnection()
        const db2 = await databaseService.getDb()

        const groups = await db2.getAll('groups')
        const meets = await db2.getAll('meets')
        expect(groups).toHaveLength(1)
        expect(groups[0]!.id).toBe('rt-g1')
        expect(meets).toHaveLength(1)
        expect(meets[0]!.id).toBe('rt-m1')
    })
})

// ─── deleteWorkspacesData ─────────────────────────────────────────────────

describe('deleteWorkspacesData', () => {
    it('clears all data from every maintenance store', async () => {
        const db = await initDb('ws-clr', 'Clear', DB_WS_A)
        await db.put('groups', { id: 'g1', name: 'G1', meetId: 'x', createdAt: '' })
        await db.put('meets', { id: 'm1', name: 'M1', createdAt: '', groupId: 'g1' })
        await db.put('marks', { id: 'mk1', value: 85, createdAt: '' })
        await databaseService.resetConnection()

        await workspaceRepository.deleteWorkspacesData(['ws-clr'])

        seedWorkspaces([{ id: 'ws-clr', name: 'Clear', dbName: DB_WS_A }])
        await databaseService.resetConnection()
        const db2 = await databaseService.getDb()

        for (const store of MAINTENANCE_STORES) {
            expect(await db2.getAll(store as any)).toHaveLength(0)
        }
    })

    it('preserves the workspace entry in localStorage', async () => {
        await initDb('ws-entry', 'Entry', DB_WS_A)
        await databaseService.resetConnection()

        await workspaceRepository.deleteWorkspacesData(['ws-entry'])

        const ws = workspaceRepository.getWorkspaces().find((w) => w.id === 'ws-entry')
        expect(ws).toBeDefined()
        expect(ws!.name).toBe('Entry')
    })

    it('clears data for multiple workspaces in one call', async () => {
        const db1 = await initDb('ws-clr1', 'Clear 1', DB_WS_A)
        await db1.put('groups', { id: 'g1', name: 'G1', meetId: 'x', createdAt: '' })

        const db2 = await initDb('ws-clr2', 'Clear 2', DB_WS_B)
        await db2.put('groups', { id: 'g2', name: 'G2', meetId: 'y', createdAt: '' })

        seedWorkspaces([
            { id: 'ws-clr1', name: 'Clear 1', dbName: DB_WS_A },
            { id: 'ws-clr2', name: 'Clear 2', dbName: DB_WS_B },
        ])
        await databaseService.resetConnection()

        await workspaceRepository.deleteWorkspacesData(['ws-clr1', 'ws-clr2'])

        for (const [id, name, dbName] of [
            ['ws-clr1', 'Clear 1', DB_WS_A],
            ['ws-clr2', 'Clear 2', DB_WS_B],
        ] as const) {
            seedWorkspaces([{ id, name, dbName }])
            await databaseService.resetConnection()
            const db = await databaseService.getDb()
            expect(await db.getAll('groups')).toHaveLength(0)
        }
    })

    it('silently skips workspace IDs not in the list', async () => {
        await expect(workspaceRepository.deleteWorkspacesData(['nonexistent-ws-id'])).resolves.not.toThrow()
    })
})
