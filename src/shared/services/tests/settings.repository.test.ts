import { describe, expect, it } from 'vitest'
import { databaseService } from '../DatabaseService'
import { settingsRepository } from '../settings.repository'

// ─── durationLimit ────────────────────────────────────────────────────────────

describe('durationLimit', () => {
    it('returns 0 when nothing is stored', async () => {
        expect(await settingsRepository.getDurationLimit()).toBe(0)
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveDurationLimit(75)
        expect(await settingsRepository.getDurationLimit()).toBe(75)
    })

    it('coerces a numeric string stored by legacy code to a number', async () => {
        localStorage.setItem('durationLimit', '45')
        expect(await settingsRepository.getDurationLimit()).toBe(45)
    })

    it('returns the default when the stored value is NaN', async () => {
        localStorage.setItem('durationLimit', 'not-a-number')
        expect(await settingsRepository.getDurationLimit()).toBe(0)
    })
})

// ─── ignoredUsers ─────────────────────────────────────────────────────────────

describe('ignoredUsers', () => {
    it('returns an empty array when nothing is stored', async () => {
        expect(await settingsRepository.getIgnoredUsers()).toEqual([])
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveIgnoredUsers(['BotA', 'BotB'])
        expect(await settingsRepository.getIgnoredUsers()).toEqual(['BotA', 'BotB'])
    })

    it('saves an empty array when the argument is not an array', async () => {
        await settingsRepository.saveIgnoredUsers(null as any)
        expect(await settingsRepository.getIgnoredUsers()).toEqual([])
    })
})

// ─── defaultTeacher ───────────────────────────────────────────────────────────

describe('defaultTeacher', () => {
    it('returns null when nothing is stored', async () => {
        expect(await settingsRepository.getDefaultTeacher()).toBeNull()
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveDefaultTeacher('Prof. Smith')
        expect(await settingsRepository.getDefaultTeacher()).toBe('Prof. Smith')
    })

    it('removes the storage key when saved as null', async () => {
        await settingsRepository.saveDefaultTeacher('Prof. Smith')
        await settingsRepository.saveDefaultTeacher(null)
        expect(await settingsRepository.getDefaultTeacher()).toBeNull()
        expect(localStorage.getItem('defaultTeacher')).toBeNull()
    })
})

// ─── sessionSquash ────────────────────────────────────────────────────────────

describe('sessionSquash', () => {
    it('returns false when nothing is stored', async () => {
        expect(await settingsRepository.getSessionSquash()).toBe(false)
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveSessionSquash(true)
        expect(await settingsRepository.getSessionSquash()).toBe(true)
    })

    it('coerces stored string "true" to boolean true', async () => {
        localStorage.setItem('sessionSquash', 'true')
        expect(await settingsRepository.getSessionSquash()).toBe(true)
    })

    it('coerces stored string "false" to boolean false', async () => {
        localStorage.setItem('sessionSquash', 'false')
        expect(await settingsRepository.getSessionSquash()).toBe(false)
    })
})

// ─── sessionSquashThreshold ───────────────────────────────────────────────────

describe('sessionSquashThreshold', () => {
    it('returns 10 as the default', async () => {
        expect(await settingsRepository.getSessionSquashThreshold()).toBe(10)
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveSessionSquashThreshold(20)
        expect(await settingsRepository.getSessionSquashThreshold()).toBe(20)
    })

    it('coerces a numeric string to number', async () => {
        localStorage.setItem('sessionSquashThreshold', '15')
        expect(await settingsRepository.getSessionSquashThreshold()).toBe(15)
    })
})

// ─── getTeachers / saveTeachers ───────────────────────────────────────────────

describe('getTeachers / saveTeachers', () => {
    it('returns an empty array when nothing is stored', async () => {
        expect(await settingsRepository.getTeachers()).toEqual([])
    })

    it('round-trips save and get', async () => {
        await settingsRepository.saveTeachers(['Prof. A', 'Prof. B'])
        expect(await settingsRepository.getTeachers()).toEqual(['Prof. A', 'Prof. B'])
    })

    it('saves an empty array when the argument is not an array', async () => {
        await settingsRepository.saveTeachers(null as any)
        expect(await settingsRepository.getTeachers()).toEqual([])
    })

    it('promotes a matching member to teacher role in IDB', async () => {
        const db = await databaseService.getDb()
        await db.put('members', { id: 'u1', name: 'Prof. Jones', role: 'student', groupName: null })

        await settingsRepository.saveTeachers(['Prof. Jones'])

        const updated = (await db.get('members', 'u1')) as any
        expect(updated!.role).toBe('teacher')
    })

    it('demotes a removed teacher back to student role in IDB', async () => {
        const db = await databaseService.getDb()
        await db.put('members', { id: 'u2', name: 'Prof. Lee', role: 'teacher', groupName: null })

        await settingsRepository.saveTeachers([]) // Prof. Lee removed from list

        const updated = (await db.get('members', 'u2')) as any
        expect(updated!.role).toBe('student')
    })

    it('does not change role when the member was already at the correct role', async () => {
        const db = await databaseService.getDb()
        await db.put('members', { id: 'u3', name: 'Prof. Kim', role: 'teacher', groupName: null })

        // Should not throw or corrupt the record
        await settingsRepository.saveTeachers(['Prof. Kim'])

        const updated = (await db.get('members', 'u3')) as any
        expect(updated!.role).toBe('teacher')
    })
})

// ─── Workspace-scoped storage ─────────────────────────────────────────────────

describe('workspace-scoped settings', () => {
    it('stores settings under a workspace-specific key when not in the default workspace', async () => {
        localStorage.setItem('edutrace_current_workspace', 'ws-test')

        await settingsRepository.saveDurationLimit(45)

        expect(localStorage.getItem('durationLimit_ws-test')).not.toBeNull()
        expect(localStorage.getItem('durationLimit')).toBeNull()
        expect(await settingsRepository.getDurationLimit()).toBe(45)
    })

    it('settings saved in one workspace are not visible in another', async () => {
        localStorage.setItem('edutrace_current_workspace', 'ws-a')
        await settingsRepository.saveDurationLimit(30)

        localStorage.setItem('edutrace_current_workspace', 'ws-b')
        expect(await settingsRepository.getDurationLimit()).toBe(0) // default, not ws-a's value
    })
})

// ─── clearSettings ────────────────────────────────────────────────────────────

describe('clearSettings', () => {
    it('removes all setting keys so getters return their defaults', async () => {
        await settingsRepository.saveDurationLimit(99)
        await settingsRepository.saveIgnoredUsers(['Ghost'])
        await settingsRepository.saveSessionSquash(true)
        await settingsRepository.saveDefaultTeacher('Dr. X')

        settingsRepository.clearSettings()

        expect(await settingsRepository.getDurationLimit()).toBe(0)
        expect(await settingsRepository.getIgnoredUsers()).toEqual([])
        expect(await settingsRepository.getSessionSquash()).toBe(false)
        expect(await settingsRepository.getDefaultTeacher()).toBeNull()
    })

    it('clears workspace-scoped keys for the current workspace', async () => {
        localStorage.setItem('edutrace_current_workspace', 'ws-clr')
        await settingsRepository.saveDurationLimit(50)
        expect(localStorage.getItem('durationLimit_ws-clr')).not.toBeNull()

        settingsRepository.clearSettings()

        expect(localStorage.getItem('durationLimit_ws-clr')).toBeNull()
    })
})
