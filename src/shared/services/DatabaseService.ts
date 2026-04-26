import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb'
import type { IDBCustomSchema } from '../types/Database'
import type { Workspace } from '../types/workspaces'
import { openDB } from 'idb'

import { logger } from '@/shared/lib/logger'
import { local as storage } from '@/shared/services/StorageService'

export const DB_VERSION = 17
export const DEFAULT_DB_NAME = 'meet-attendance-db'

class DatabaseService {
    private _dbPromise: Promise<IDBPDatabase<IDBCustomSchema>> | null = null
    private _currentDbName: string | null = null

    /**
     * Get database name for current workspace
     */
    getCurrentDbName(): string {
        if (this._currentDbName) return this._currentDbName

        try {
            const currentId = storage.get<string>('edutrace_current_workspace', 'default')

            if (!currentId || currentId === 'default') {
                this._currentDbName = DEFAULT_DB_NAME
                return DEFAULT_DB_NAME
            }

            const workspaces = storage.get<Workspace[]>('edutrace_workspaces', []) || []
            const workspace = Array.isArray(workspaces) ? workspaces.find((w) => w.id === currentId) : null

            if (workspace && workspace.dbName) {
                this._currentDbName = workspace.dbName
                return workspace.dbName
            }

            this._currentDbName = DEFAULT_DB_NAME
            return DEFAULT_DB_NAME
        } catch (e) {
            logger.error('Error determining workspace DB, falling back to default.', e)
            return DEFAULT_DB_NAME
        }
    }

    async resetConnection(): Promise<void> {
        if (this._dbPromise) {
            try {
                const db = await this._dbPromise
                db.close()
                await new Promise((resolve) => setTimeout(resolve, 10))
            } catch (e) {
                logger.warn('Error closing DB connection during reset:', e)
            }
        }
        this._dbPromise = null
        this._currentDbName = null
    }

    /**
     * Initialize database schema
     * Note: 'transaction' is specifically a VersionChange transaction during upgrade
     */
    async initSchema(
        db: IDBPDatabase<IDBCustomSchema>,
        oldVersion: number,
        _newVersion: number | null,
        transaction: IDBPTransaction<IDBCustomSchema, StoreNames<IDBCustomSchema>[], 'versionchange'>
    ): Promise<void> {
        // --- Meets Store ---
        if (!db.objectStoreNames.contains('meets')) {
            const meetStore = db.createObjectStore('meets', { keyPath: 'id' })
            meetStore.createIndex('meetId', 'meetId', { unique: false })
            meetStore.createIndex('date', 'date', { unique: false })
        }

        // --- Settings Store ---
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
        }

        // --- Groups Store ---
        if (!db.objectStoreNames.contains('groups')) {
            const store = db.createObjectStore('groups', { keyPath: 'id' })
            store.createIndex('meetId', 'meetId', { unique: true })
            store.createIndex('name', 'name', { unique: true })
        } else if (oldVersion < 9) {
            const store = transaction.objectStore('groups')

            if (oldVersion < 7 && store.indexNames.contains('meetId')) {
                store.deleteIndex('meetId')
                store.createIndex('meetId', 'meetId', { unique: true })
            }
            if (!store.indexNames.contains('name')) {
                store.createIndex('name', 'name', { unique: true })
            }

            if (oldVersion < 8) {
                let cursor = await store.openCursor()
                while (cursor) {
                    const group = cursor.value
                    let updated = false

                    if (!group.course && group.name) {
                        const match = group.name.match(/\d/)
                        if (match) {
                            const course = Number.parseInt(match[0], 10)
                            if (course >= 1 && course <= 4) {
                                group.course = course
                                updated = true
                            }
                        }
                    }
                    if (updated) await cursor.update(group)
                    cursor = await cursor.continue()
                }
            }
        }

        // --- Tasks Store ---
        if (!db.objectStoreNames.contains('tasks')) {
            const store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true })
            store.createIndex('name', 'name', { unique: true })
            store.createIndex('normalizedName', 'normalizedName', { unique: true })
        } else if (oldVersion < 14) {
            const store = transaction.objectStore('tasks')

            // v13 and below: clean up old group-coupled indexes
            if (store.indexNames.contains('name_date_group' as any)) {
                store.deleteIndex('name_date_group' as any)
            }
            if (store.indexNames.contains('groupId' as any)) {
                store.deleteIndex('groupId' as any)
            }
            if (store.indexNames.contains('groupName' as any)) {
                store.deleteIndex('groupName' as any)
            }

            // Ensure unique name index exists
            if (!store.indexNames.contains('name')) {
                store.createIndex('name', 'name', { unique: true })
            }

            // Populate normalizedName and strip group fields from all existing task records
            const normalizedNames = new Set<string>()
            let cursor = await store.openCursor()
            while (cursor) {
                const task = { ...cursor.value } as any
                const rawName: string = task.name || ''
                let normalized: string = rawName.toLowerCase().replace(/\s+/g, '')

                // Handle collisions (different names that normalize to the same key)
                if (normalizedNames.has(normalized)) {
                    normalized = `${normalized}_${task.id}`
                }
                normalizedNames.add(normalized)

                task.normalizedName = normalized
                delete task.groupName
                delete task.groupId
                await cursor.update(task)
                cursor = await cursor.continue()
            }

            // Create the new unique normalizedName index
            if (!store.indexNames.contains('normalizedName')) {
                store.createIndex('normalizedName', 'normalizedName', { unique: true })
            }
        }

        // --- Units Store ---
        if (!db.objectStoreNames.contains('units')) {
            const store = db.createObjectStore('units', { keyPath: 'id', autoIncrement: true })
            store.createIndex('name', 'name', { unique: true })
            store.createIndex('normalizedName', 'normalizedName', { unique: true })
        }

        // --- Marks Store ---
        if (!db.objectStoreNames.contains('marks')) {
            const store = db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true })
            store.createIndex('taskId', 'taskId', { unique: false })
            store.createIndex('studentId', 'studentId', { unique: false })
            store.createIndex('task_student', ['taskId', 'studentId'], { unique: true })
            store.createIndex('createdAt', 'createdAt', { unique: false })
            store.createIndex('groupName', 'groupName', { unique: false })
        } else if (oldVersion < 12) {
            const store = transaction.objectStore('marks')
            if (oldVersion < 9 && !store.indexNames.contains('createdAt')) {
                store.createIndex('createdAt', 'createdAt', { unique: false })
            }
            if (!store.indexNames.contains('groupName')) store.createIndex('groupName', 'groupName', { unique: false })
            if (!store.indexNames.contains('studentId')) store.createIndex('studentId', 'studentId', { unique: false })
            if (!store.indexNames.contains('taskId')) store.createIndex('taskId', 'taskId', { unique: false })
            if (!store.indexNames.contains('task_student')) {
                store.createIndex('task_student', ['taskId', 'studentId'], { unique: true })
            }
        }

        // --- Members Store ---
        if (!db.objectStoreNames.contains('members')) {
            const store = db.createObjectStore('members', { keyPath: 'id', autoIncrement: true })
            store.createIndex('name', 'name', { unique: true })
            store.createIndex('groupName', 'groupName', { unique: false })
            store.createIndex('role', 'role', { unique: false })
        }

        // --- Legacy Cleanup ---
        if (oldVersion < 9 && db.objectStoreNames.contains('students' as any)) {
            db.deleteObjectStore('students' as any)
        }

        // --- Modules Store ---
        if (!db.objectStoreNames.contains('modules')) {
            const store = db.createObjectStore('modules', { keyPath: 'id', autoIncrement: true })
            store.createIndex('groupId', 'groupId', { unique: false })
            store.createIndex('groupName', 'groupName', { unique: false })
        } else if (oldVersion < 10) {
            const store = transaction.objectStore('modules')
            if (!store.indexNames.contains('groupId')) store.createIndex('groupId', 'groupId', { unique: false })
            if (!store.indexNames.contains('groupName')) store.createIndex('groupName', 'groupName', { unique: false })
        }

        // --- FinalAssessments Store ---
        if (!db.objectStoreNames.contains('finalAssessments')) {
            const store = db.createObjectStore('finalAssessments', {
                keyPath: 'id',
                autoIncrement: true,
            })
            store.createIndex('studentId', 'studentId', { unique: false })
            store.createIndex('assessmentType', 'assessmentType', { unique: false })
            store.createIndex('student_type', ['studentId', 'assessmentType'], { unique: true })
        }

        // --- Sessions Store ---
        if (!db.objectStoreNames.contains('sessions')) {
            const store = db.createObjectStore('sessions', { keyPath: 'id' })
            store.createIndex('groupId', 'groupId', { unique: false })
            store.createIndex('sessionType', 'sessionType', { unique: false })
            store.createIndex('group_type', ['groupId', 'sessionType'], { unique: true })
        }

        // --- Plans Store ---
        if (!db.objectStoreNames.contains('plans')) {
            const store = db.createObjectStore('plans', { keyPath: 'id' })
            store.createIndex('studentId', 'studentId', { unique: false })
            store.createIndex('sessionType', 'sessionType', { unique: false })
        }
    }

    getDb(): Promise<IDBPDatabase<IDBCustomSchema>> {
        const dbName = this.getCurrentDbName()

        if (this._dbPromise && this._currentDbName === dbName) {
            return this._dbPromise
        }

        this._currentDbName = dbName
        this._dbPromise = openDB<IDBCustomSchema>(dbName, DB_VERSION, {
            upgrade: (db, oldVer, newVer, trans) => {
                // Call initSchema with correctly typed parameters
                return this.initSchema(db, oldVer, newVer, trans)
            },
        })

        return this._dbPromise
    }
}

export const databaseService = new DatabaseService()

export type { IDBCustomSchema }
