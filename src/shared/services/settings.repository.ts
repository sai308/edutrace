import type {
    ExamSettings,
    PrintSettings,
    SettingKey,
    SettingsMap,
    SummaryThresholds,
} from '@/shared/types/Settings'
import { logger } from '@/shared/lib/logger'
import { local as storage } from '@/shared/services/StorageService'

import { databaseService } from './DatabaseService'

class SettingsRepository {
    constructor() {}

    private async getDb() {
        return databaseService.getDb()
    }

    /**
     * Generates a workspace-specific key for LocalStorage
     */
    private _getWorkspaceKey(key: SettingKey): string {
        const wsId = storage.get<string>('edutrace_current_workspace', 'default')
        return wsId === 'default' ? key : `${key}_${wsId}`
    }

    /**
     * Internal getter with type-specific coercion logic
     */
    private _getSetting<K extends SettingKey>(
        key: K,
        defaultValue: SettingsMap[K],
    ): SettingsMap[K] {
        const wsKey = this._getWorkspaceKey(key)

        // We tell storage.get that it might return the expected type, or a string (legacy/storage behavior)
        const val = storage.get<SettingsMap[K] | string>(wsKey, defaultValue)

        // Case 1: Handle numeric coercion
        if (key === 'durationLimit' || key === 'sessionSquashThreshold') {
            const parsed = typeof val === 'string' ? Number.parseInt(val, 10) : (val as number)
            return (isNaN(parsed) ? defaultValue : parsed) as SettingsMap[K]
        }

        // Case 2: Handle boolean coercion
        if (key === 'sessionSquash') {
            if (val === 'true') return true as SettingsMap[K]
            if (val === 'false') return false as SettingsMap[K]
            return (typeof val === 'boolean' ? val : defaultValue) as SettingsMap[K]
        }

        // Case 2: Handle cases where storage might return null or undefined
        // fallback to the provided defaultValue
        if (val === null || val === undefined) {
            return defaultValue
        }

        // Final Cast: We've handled the specific numeric edge case and the null check.
        return val as SettingsMap[K]
    }

    private _saveSetting<K extends SettingKey>(key: K, value: SettingsMap[K]): void {
        storage.set(this._getWorkspaceKey(key), value)
    }

    // --- Public Accessors ---

    async getDurationLimit(): Promise<number> {
        return this._getSetting('durationLimit', 0)
    }

    async saveDurationLimit(limit: number): Promise<void> {
        this._saveSetting('durationLimit', limit)
    }

    async getDefaultTeacher(): Promise<string | null> {
        return this._getSetting('defaultTeacher', null)
    }

    async saveDefaultTeacher(teacher: string | null): Promise<void> {
        if (teacher) {
            this._saveSetting('defaultTeacher', teacher)
        } else {
            const wsKey = this._getWorkspaceKey('defaultTeacher')
            storage.remove(wsKey)
        }
    }

    async getIgnoredUsers(): Promise<string[]> {
        return this._getSetting('ignoredUsers', [])
    }

    async saveIgnoredUsers(users: string[]): Promise<void> {
        this._saveSetting('ignoredUsers', Array.isArray(users) ? users : [])
    }

    async getTeachers(): Promise<string[]> {
        return this._getSetting('teachers', [])
    }

    async saveTeachers(teachers: string[]): Promise<void> {
        const validatedTeachers = Array.isArray(teachers) ? teachers : []
        this._saveSetting('teachers', validatedTeachers)

        // Sync roles in IndexedDB
        try {
            const db = await this.getDb()
            const tx = db.transaction('members', 'readwrite')
            const store = tx.objectStore('members')
            const allMembers = await store.getAll()

            const teacherSet = new Set(validatedTeachers)

            for (const member of allMembers) {
                const isTeacher = teacherSet.has(member.name)
                const currentRole = member.role || 'student'

                let needsUpdate = false
                if (isTeacher && currentRole !== 'teacher') {
                    member.role = 'teacher'
                    needsUpdate = true
                } else if (!isTeacher && currentRole === 'teacher') {
                    member.role = 'student'
                    needsUpdate = true
                }

                if (needsUpdate) {
                    await store.put(member)
                }
            }
            await tx.done
        } catch (e) {
            logger.error('Error syncing member roles after saving teachers.', e)
        }
    }

    async getExamSettings(): Promise<ExamSettings> {
        return this._getSetting('examSettings', {})
    }

    async saveExamSettings(settings: ExamSettings): Promise<void> {
        this._saveSetting('examSettings', settings || {})
    }

    async getPrintSettings(): Promise<PrintSettings> {
        return this._getSetting('printSettings', {})
    }

    async savePrintSettings(settings: PrintSettings): Promise<void> {
        this._saveSetting('printSettings', settings || {})
    }

    async getSessionSquash(): Promise<boolean> {
        return this._getSetting('sessionSquash', false)
    }

    async saveSessionSquash(enabled: boolean): Promise<void> {
        this._saveSetting('sessionSquash', enabled)
    }

    async getSessionSquashThreshold(): Promise<number> {
        return this._getSetting('sessionSquashThreshold', 10)
    }

    async saveSessionSquashThreshold(minutes: number): Promise<void> {
        this._saveSetting('sessionSquashThreshold', minutes)
    }

    async getSummaryThresholds(groupId: string): Promise<SummaryThresholds | null> {
        const all = this._getSetting('summaryThresholds', {})
        return all[groupId] ?? null
    }

    async saveSummaryThresholds(groupId: string, thresholds: SummaryThresholds): Promise<void> {
        const all = this._getSetting('summaryThresholds', {})
        all[groupId] = thresholds
        this._saveSetting('summaryThresholds', all)
    }

    /**
     * Clear all workspace-related settings
     */
    clearSettings(): void {
        const settingsKeys: SettingKey[] = [
            'ignoredUsers',
            'durationLimit',
            'sessionSquash',
            'sessionSquashThreshold',
            'defaultTeacher',
            'teachers',
            'examSettings',
            'printSettings',
            'summaryThresholds',
        ]

        settingsKeys.forEach((key) => {
            const wsKey = this._getWorkspaceKey(key)
            storage.remove(wsKey)
        })
    }
}

export const settingsRepository = new SettingsRepository()
