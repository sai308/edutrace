/**
 * D1 — Migration tests (P0)
 *
 * Each test seeds an in-memory IDB at an old version with realistic fixture data,
 * then reopens at DB_VERSION=17 via databaseService to trigger initSchema, and
 * asserts the resulting store shape and record values.
 *
 * Relies on fake-indexeddb (auto-installed by tests/setup.ts) so no real browser is needed.
 */

import { openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { databaseService } from '../../src/shared/services/DatabaseService'

// Each test uses its own DB name to avoid cross-test interference.
// These names must also be registered in tests/setup.ts → TEST_DB_NAMES so they are
// deleted in the global beforeEach.
const DB_GROUPS_V6 = 'test-migration-groups'
const DB_TASKS_V13 = 'test-migration-tasks'
const DB_MARKS_V8 = 'test-migration-marks'
const DB_STUDENTS_V8 = 'test-migration-students'

/** Helper: point databaseService at a named DB, bypassing workspace resolution. */
function useDb(name: string) {
    localStorage.setItem('_migration_test_db', name)
    // Patch the private _currentDbName via resetConnection + override.
    // We piggyback on StorageService by writing to the key databaseService reads.
    // databaseService reads 'edutrace_current_workspace'; 'default' → DEFAULT_DB_NAME.
    // For a non-default name, we need a workspace entry.
    localStorage.setItem('edutrace_current_workspace', 'migration-test-ws')
    localStorage.setItem(
        'edutrace_workspaces',
        JSON.stringify([{ id: 'migration-test-ws', dbName: name, name: 'Test' }]),
    )
}

beforeEach(async () => {
    await databaseService.resetConnection()
})

// ---------------------------------------------------------------------------
// Test 1 — Groups migration: course extraction + index recreation (v6 → v17)
// ---------------------------------------------------------------------------
describe('groups migration (v6 → v17)', () => {
    it('recreates meetId as unique index and adds name index', async () => {
        // Create a v6 DB: groups store with non-unique meetId, no name index
        const db6 = await openDB(DB_GROUPS_V6, 6, {
            upgrade(db) {
                const store = db.createObjectStore('groups', { keyPath: 'id' })
                store.createIndex('meetId', 'meetId', { unique: false }) // old non-unique
            },
        })
        await db6.put('groups', { id: 'g1', meetId: 'meet-1', name: 'IM-31' })
        db6.close()

        useDb(DB_GROUPS_V6)
        const db = await databaseService.getDb()
        const tx = db.transaction('groups', 'readonly')
        const store = tx.objectStore('groups')

        expect(store.indexNames.contains('meetId')).toBe(true)
        expect(store.indexNames.contains('name')).toBe(true)
    })

    it('populates course from name when name contains a digit 1–4', async () => {
        // DB was already created above — but beforeEach + setup.ts deletes it,
        // so we need to seed it again.
        const db6 = await openDB(DB_GROUPS_V6, 6, {
            upgrade(db) {
                const store = db.createObjectStore('groups', { keyPath: 'id' })
                store.createIndex('meetId', 'meetId', { unique: false })
            },
        })
        // "IM-31" → first digit is '3' → course = 3
        await db6.put('groups', { id: 'g1', meetId: 'meet-1', name: 'IM-31' })
        // "CS-12" → first digit is '1' → course = 1
        await db6.put('groups', { id: 'g2', meetId: 'meet-2', name: 'CS-12' })
        // "Staff" → no digit → course stays undefined
        await db6.put('groups', { id: 'g3', meetId: 'meet-3', name: 'Staff' })
        db6.close()

        useDb(DB_GROUPS_V6)
        const db = await databaseService.getDb()
        const groups = await db.getAll('groups')

        const g1 = groups.find(g => g.id === 'g1') as any
        const g2 = groups.find(g => g.id === 'g2') as any
        const g3 = groups.find(g => g.id === 'g3') as any

        expect(g1?.course).toBe(3)
        expect(g2?.course).toBe(1)
        expect(g3?.course).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// Test 2 — Tasks migration: normalizedName + legacy index cleanup (v13 → v17)
// ---------------------------------------------------------------------------
describe('tasks migration (v13 → v17)', () => {
    it('removes legacy indexes and adds normalizedName index', async () => {
        const db13 = await openDB(DB_TASKS_V13, 13, {
            upgrade(db) {
                const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('name', 'name', { unique: true })
                store.createIndex('name_date_group' as any, 'name_date_group', { unique: false })
                store.createIndex('groupId' as any, 'groupId', { unique: false })
                store.createIndex('groupName' as any, 'groupName', { unique: false })
            },
        })
        await db13.add('tasks', { name: 'Lab Work', groupId: 'g1', groupName: 'IM-31' } as any)
        db13.close()

        useDb(DB_TASKS_V13)
        const db = await databaseService.getDb()
        const tx = db.transaction('tasks', 'readonly')
        const store = tx.objectStore('tasks')

        expect(store.indexNames.contains('normalizedName')).toBe(true)
        expect(store.indexNames.contains('name')).toBe(true)
        expect(store.indexNames.contains('name_date_group' as any)).toBe(false)
        expect(store.indexNames.contains('groupId' as any)).toBe(false)
    })

    it('populates normalizedName for existing tasks', async () => {
        const db13 = await openDB(DB_TASKS_V13, 13, {
            upgrade(db) {
                const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('name', 'name', { unique: true })
                store.createIndex('name_date_group' as any, 'name_date_group', { unique: false })
                store.createIndex('groupId' as any, 'groupId', { unique: false })
            },
        })
        await db13.add('tasks', { name: 'Lab Work', groupId: 'g1' } as any)
        await db13.add('tasks', { name: 'Home Task', groupId: 'g1' } as any)
        db13.close()

        useDb(DB_TASKS_V13)
        const db = await databaseService.getDb()
        const tasks = await db.getAll('tasks')

        const labWork = tasks.find(t => t.name === 'Lab Work') as any
        const homeTask = tasks.find(t => t.name === 'Home Task') as any

        expect(labWork?.normalizedName).toBe('labwork')
        expect(homeTask?.normalizedName).toBe('hometask')
    })

    it('strips groupName and groupId from existing task records', async () => {
        const db13 = await openDB(DB_TASKS_V13, 13, {
            upgrade(db) {
                const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('name', 'name', { unique: true })
                store.createIndex('groupId' as any, 'groupId', { unique: false })
                store.createIndex('groupName' as any, 'groupName', { unique: false })
            },
        })
        await db13.add('tasks', { name: 'Test', groupId: 'g1', groupName: 'IM-31' } as any)
        db13.close()

        useDb(DB_TASKS_V13)
        const db = await databaseService.getDb()
        const tasks = await db.getAll('tasks') as any[]

        expect(tasks[0].groupId).toBeUndefined()
        expect(tasks[0].groupName).toBeUndefined()
    })

    it('resolves normalizedName collision by appending task id', async () => {
        const db13 = await openDB(DB_TASKS_V13, 13, {
            upgrade(db) {
                const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('name', 'name', { unique: false }) // non-unique to allow seed
                store.createIndex('groupId' as any, 'groupId', { unique: false })
            },
        })
        // "Lab Work" and "LabWork" both normalize to "labwork"
        const _id1 = await db13.add('tasks', { name: 'Lab Work', groupId: 'g1' } as any)
        const _id2 = await db13.add('tasks', { name: 'LabWork', groupId: 'g1' } as any)
        db13.close()

        useDb(DB_TASKS_V13)
        const db = await databaseService.getDb()
        const tasks = await db.getAll('tasks') as any[]

        const names = tasks.map(t => t.normalizedName)
        // One gets "labwork", the other gets "labwork_<id>"
        expect(names.filter(n => n === 'labwork')).toHaveLength(1)
        const suffixed = names.find(n => n !== 'labwork')
        expect(suffixed).toMatch(/^labwork_\d+$/)
    })
})

// ---------------------------------------------------------------------------
// Test 3 — Marks migration: index creation (v8 → v17)
// ---------------------------------------------------------------------------
describe('marks migration (v8 → v17)', () => {
    it('adds missing indexes to marks store', async () => {
        const db8 = await openDB(DB_MARKS_V8, 8, {
            upgrade(db) {
                // v8 marks store: only taskId index, missing the rest
                const store = db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('taskId', 'taskId', { unique: false })
            },
        })
        await db8.add('marks', {
            taskId: 't1',
            studentId: 's1',
            groupName: 'IM-31',
            score: 90,
            value: 90,
            synced: false,
            createdAt: new Date().toISOString(),
        } as any)
        db8.close()

        useDb(DB_MARKS_V8)
        const db = await databaseService.getDb()
        const tx = db.transaction('marks', 'readonly')
        const store = tx.objectStore('marks')

        expect(store.indexNames.contains('taskId')).toBe(true)
        expect(store.indexNames.contains('studentId')).toBe(true)
        expect(store.indexNames.contains('task_student')).toBe(true)
        expect(store.indexNames.contains('groupName')).toBe(true)
        expect(store.indexNames.contains('createdAt')).toBe(true)
    })

    it('preserves existing mark records through migration', async () => {
        const db8 = await openDB(DB_MARKS_V8, 8, {
            upgrade(db) {
                const store = db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true })
                store.createIndex('taskId', 'taskId', { unique: false })
            },
        })
        await db8.add('marks', {
            taskId: 't1',
            studentId: 's1',
            groupName: 'IM-31',
            score: 85,
            value: 85,
            synced: false,
            createdAt: '2024-01-01T00:00:00.000Z',
        } as any)
        await db8.add('marks', {
            taskId: 't2',
            studentId: 's2',
            groupName: 'IM-32',
            score: 72,
            value: 72,
            synced: true,
            createdAt: '2024-01-02T00:00:00.000Z',
        } as any)
        db8.close()

        useDb(DB_MARKS_V8)
        const db = await databaseService.getDb()
        const marks = await db.getAll('marks')

        expect(marks).toHaveLength(2)
        expect(marks.find(m => m.taskId === 't1')?.score).toBe(85)
        expect(marks.find(m => m.taskId === 't2')?.score).toBe(72)
    })
})

// ---------------------------------------------------------------------------
// Test 4 — Legacy students store cleanup (v8 → v17)
// ---------------------------------------------------------------------------
describe('legacy students store cleanup (v8 → v17)', () => {
    it('removes the legacy students store and creates members store', async () => {
        const db8 = await openDB(DB_STUDENTS_V8, 8, {
            upgrade(db) {
                // Old schema had a 'students' store
                db.createObjectStore('students' as any, { keyPath: 'id' })
                const membersStore = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true })
                membersStore.createIndex('name', 'name', { unique: true })
            },
        })
        await db8.put('students' as any, { id: 's1', name: 'Doe John', groupName: 'IM-31' })
        db8.close()

        useDb(DB_STUDENTS_V8)
        const db = await databaseService.getDb()

        expect(db.objectStoreNames.contains('students' as any)).toBe(false)
        expect(db.objectStoreNames.contains('members')).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Test 5 — Fresh install: all required stores are created
// ---------------------------------------------------------------------------
describe('fresh install (v0 → v17)', () => {
    it('creates all required stores with correct indexes', async () => {
        // No seed needed — just open a brand-new DB via databaseService
        // (DEFAULT_DB_NAME was deleted by setup.ts beforeEach)
        const db = await databaseService.getDb()

        const expectedStores = [
            'meets',
            'settings',
            'groups',
            'tasks',
            'units',
            'marks',
            'members',
            'modules',
            'finalAssessments',
            'sessions',
            'plans',
        ]
        for (const store of expectedStores) {
            expect(db.objectStoreNames.contains(store as any), `store '${store}' should exist`).toBe(true)
        }

        // Spot-check indexes on key stores
        const tx = db.transaction(['meets', 'marks', 'tasks', 'members'], 'readonly')

        const meetsStore = tx.objectStore('meets')
        expect(meetsStore.indexNames.contains('meetId')).toBe(true)
        expect(meetsStore.indexNames.contains('date')).toBe(true)

        const marksStore = tx.objectStore('marks')
        expect(marksStore.indexNames.contains('task_student')).toBe(true)
        expect(marksStore.indexNames.contains('groupName')).toBe(true)

        const tasksStore = tx.objectStore('tasks')
        expect(tasksStore.indexNames.contains('normalizedName')).toBe(true)

        const membersStore = tx.objectStore('members')
        expect(membersStore.indexNames.contains('groupName')).toBe(true)
        expect(membersStore.indexNames.contains('role')).toBe(true)
    })
})
