import type { IDBPDatabase } from 'idb'
import type { CreateWorkspaceOptions, Workspace, WorkspaceExportData } from '../types/workspaces'
import type { IDBCustomSchema } from './DatabaseService'
import { openDB } from 'idb'
import { logger } from '@/shared/lib/logger'
import { databaseService, DB_VERSION, DEFAULT_DB_NAME } from './DatabaseService'
import { local as storage } from './StorageService'

const WORKSPACE_KEY = 'edutrace_workspaces'
const CURRENT_WORKSPACE_KEY = 'edutrace_current_workspace'

// Shared list of stores for maintenance operations
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

export class WorkspaceRepository {
    getWorkspaces(): Workspace[] {
        const data = storage.get<Workspace[]>(WORKSPACE_KEY, [])

        // Ensure we always return an array, even if storage returns something else
        return Array.isArray(data) && data.length > 0
            ? data
            : [
                  {
                      id: 'default',
                      name: 'Default',
                      dbName: DEFAULT_DB_NAME,
                      createdAt: new Date().toISOString(),
                  },
              ]
    }

    saveWorkspaces(workspaces: Workspace[]): void {
        storage.set(WORKSPACE_KEY, workspaces)
    }

    getCurrentWorkspaceId(): string {
        return storage.get<string>(CURRENT_WORKSPACE_KEY, 'default') || 'default'
    }

    setCurrentWorkspaceId(id: string): void {
        storage.set(CURRENT_WORKSPACE_KEY, id)
    }

    async createWorkspace(name: string, options: CreateWorkspaceOptions = {}): Promise<string> {
        const workspaces = this.getWorkspaces()
        const id = crypto.randomUUID()

        const newWorkspace: Workspace = {
            id,
            name,
            icon: options.icon || 'Database',
            color: (options as any).color, // Cast to any to access custom option
            dbName: `meet-attendance-db-${id}`,
            createdAt: new Date().toISOString(),
        }

        workspaces.push(newWorkspace)
        this.saveWorkspaces(workspaces)

        // Logic for cloning settings into the new workspace
        if (options.exportSettings && options.getSettings && options.saveSettings) {
            const settings = await options.getSettings()
            const originalWorkspaceId = this.getCurrentWorkspaceId()

            this.setCurrentWorkspaceId(id)
            await databaseService.resetConnection()

            await options.saveSettings(settings)

            // Restore original connection
            this.setCurrentWorkspaceId(originalWorkspaceId)
            await databaseService.resetConnection()
        }

        return id
    }

    async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
        const workspaces = this.getWorkspaces()
        const index = workspaces.findIndex((w) => w.id === id)

        if (index === -1) throw new Error('Workspace not found')

        // Prevent overwriting internal identifiers
        const { id: _, dbName: __, ...allowedUpdates } = updates

        workspaces[index] = {
            ...workspaces[index],
            ...allowedUpdates,
            id: workspaces[index]!.id, // Force preservation of the original ID
            updatedAt: new Date().toISOString(),
        } as Workspace // Cast to final type

        this.saveWorkspaces(workspaces)
        return workspaces[index]
    }

    async switchWorkspace(id: string, onLoading: () => void = () => {}): Promise<void> {
        const workspaces = this.getWorkspaces()
        if (!workspaces.some((w) => w.id === id)) {
            throw new Error('Workspace not found')
        }
        this.setCurrentWorkspaceId(id)
        await databaseService.resetConnection()
        onLoading()
    }

    async deleteWorkspace(id: string): Promise<void> {
        if (id === 'default') throw new Error('Cannot delete default workspace')

        const workspaces = this.getWorkspaces()
        const workspace = workspaces.find((w) => w.id === id)
        if (!workspace) return

        // Native indexedDB deleteDatabase (not the wrapper)
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(workspace.dbName)
            req.onsuccess = () => resolve()
            req.onerror = (e) => reject(e)
            req.onblocked = () => {
                logger.warn(`Deletion of ${workspace.dbName} blocked.`)
                resolve()
            }
        })

        const newWorkspaces = workspaces.filter((w) => w.id !== id)
        this.saveWorkspaces(newWorkspaces)

        if (this.getCurrentWorkspaceId() === id) {
            await this.switchWorkspace('default')
        }
    }

    async deleteWorkspacesData(workspaceIds: string[]): Promise<void> {
        const workspaces = this.getWorkspaces()

        for (const id of workspaceIds) {
            const workspace = workspaces.find((w) => w.id === id)
            if (!workspace) continue

            let db: IDBPDatabase<IDBCustomSchema> | null = null
            try {
                db = await openDB<IDBCustomSchema>(workspace.dbName, DB_VERSION, {
                    upgrade: (db, oldVer, newVer, trans) =>
                        databaseService.initSchema(db, oldVer, newVer, trans as any),
                })

                const tx = db.transaction(MAINTENANCE_STORES, 'readwrite')
                await Promise.all(MAINTENANCE_STORES.map((name) => tx.objectStore(name).clear()))
                await tx.done
            } catch (e) {
                logger.error(`Error clearing data for workspace ${workspace.name}:`, e)
            } finally {
                if (db) db.close()
            }
        }
    }

    async exportWorkspaces(workspaceIds: string[]): Promise<WorkspaceExportData> {
        const allWorkspaces = this.getWorkspaces()
        const workspacesToExport = allWorkspaces.filter((w) => workspaceIds.includes(w.id))

        const exportData: WorkspaceExportData = {
            type: 'multi-workspace-backup',
            version: 1,
            timestamp: new Date().toISOString(),
            workspaces: [],
        }

        for (const ws of workspacesToExport) {
            let db: IDBPDatabase<IDBCustomSchema> | null = null
            try {
                db = await openDB<IDBCustomSchema>(ws.dbName, DB_VERSION)
                const storeEntries = await Promise.all(
                    MAINTENANCE_STORES.map(async (name) => [name, await db!.getAll(name)]),
                )

                exportData.workspaces.push({
                    id: ws.id,
                    name: ws.name,
                    icon: ws.icon,
                    dbName: ws.dbName,
                    data: Object.fromEntries(storeEntries),
                })
            } catch (e) {
                logger.error(`Error exporting data for workspace ${ws.name}:`, e)
            } finally {
                if (db) db.close()
            }
        }
        return exportData
    }

    async importWorkspaces(data: WorkspaceExportData, selectedIds: string[]): Promise<void> {
        const workspacesToImport = data.workspaces.filter((w) => selectedIds.includes(w.id))
        const currentWorkspaces = this.getWorkspaces()

        for (const wsData of workspacesToImport) {
            let targetWs = currentWorkspaces.find((w) => w.id === wsData.id)

            if (!targetWs) {
                targetWs = {
                    id: wsData.id,
                    name: wsData.name,
                    icon: wsData.icon || 'Database',
                    dbName: wsData.dbName || `meet-attendance-db-${wsData.id}`,
                    createdAt: new Date().toISOString(),
                }
                currentWorkspaces.push(targetWs)
                this.saveWorkspaces(currentWorkspaces)
            }

            let db: IDBPDatabase<IDBCustomSchema> | null = null
            try {
                db = await openDB<IDBCustomSchema>(targetWs.dbName, DB_VERSION, {
                    upgrade: (db, oldVer, newVer, trans) =>
                        databaseService.initSchema(db, oldVer, newVer, trans as any),
                })

                const tx = db.transaction(MAINTENANCE_STORES, 'readwrite')
                // Clear existing
                await Promise.all(MAINTENANCE_STORES.map((name) => tx.objectStore(name).clear()))

                // Import new
                const importPromises: Promise<any>[] = []
                for (const storeName of MAINTENANCE_STORES) {
                    const items = wsData.data[storeName]
                    if (items && Array.isArray(items)) {
                        items.forEach((item) =>
                            importPromises.push(tx.objectStore(storeName).put(item)),
                        )
                    }
                }

                await Promise.all(importPromises)
                await tx.done
            } catch (e) {
                logger.error(`Error importing data into workspace ${targetWs?.name}:`, e)
            } finally {
                if (db) db.close()
            }
        }
    }

    async getAllWorkspacesSizes(): Promise<Record<string, number>> {
        const workspaces = this.getWorkspaces()
        const results: Record<string, number> = {}

        for (const ws of workspaces) {
            let size = 0
            let db: IDBPDatabase<IDBCustomSchema> | null = null
            try {
                // Approximate size by counting records if we don't have a better way,
                // but usually size means byte size.
                // Since it's for stats, let's try to get estimate.
                db = await openDB<IDBCustomSchema>(ws.dbName, DB_VERSION)
                const storeEntries = await Promise.all(
                    MAINTENANCE_STORES.map(async (name) => await db!.getAll(name)),
                )

                size = storeEntries.reduce((acc, items) => {
                    try {
                        return acc + new Blob([JSON.stringify(items)]).size
                    } catch {
                        return acc
                    }
                }, 0)
            } catch (e) {
                logger.error(`Error calculating size for workspace ${ws.name}:`, e)
            } finally {
                if (db) db.close()
            }
            results[ws.id] = size
        }
        return results
    }
}

export const workspaceRepository = new WorkspaceRepository()
