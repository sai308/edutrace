import { meetsRepository } from '@Analytics/services/meets.repository'
import { describe, expect, it } from 'vitest'
import * as backupService from '../backup.service'
import { databaseService } from '../DatabaseService'
import { settingsRepository } from '../settings.repository'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMeet(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        meetId: 'abc-defg-hij',
        date: '2024-01-01',
        filename: `${id}.csv`,
        participants: [{ name: 'Alice', duration: 3600 }],
        ...overrides,
    }
}

// ─── clearReports ─────────────────────────────────────────────────────────────

describe('clearReports', () => {
    it('removes all meets from the store', async () => {
        await meetsRepository.saveMeet(makeMeet('m1') as any)
        await meetsRepository.saveMeet(makeMeet('m2', { date: '2024-01-08' }) as any)

        await backupService.clearReports()

        expect(await meetsRepository.getAllMeets()).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await meetsRepository.saveMeet(makeMeet('m1') as any)
        await db.put('groups', { id: 'g1', meetId: 'abc-defg-hij', name: 'G1' })

        await backupService.clearReports()

        expect(await db.getAll('groups')).toHaveLength(1)
    })
})

// ─── exportReports ────────────────────────────────────────────────────────────

describe('exportReports', () => {
    it('returns envelope with type "reports" and version 1', async () => {
        const result = await backupService.exportReports()
        expect(result.type).toBe('reports')
        expect(result.version).toBe(1)
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportReports()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('returns an empty meets array when no records are stored', async () => {
        const result = await backupService.exportReports()
        expect(result.meets).toEqual([])
    })

    it('includes all stored meet records', async () => {
        await meetsRepository.saveMeet(makeMeet('e1') as any)
        await meetsRepository.saveMeet(makeMeet('e2', { date: '2024-01-08' }) as any)

        const result = await backupService.exportReports()

        expect(result.meets).toHaveLength(2)
        expect(result.meets.map((m: any) => m.id)).toEqual(expect.arrayContaining(['e1', 'e2']))
    })

    it('preserves participant data in the exported meets', async () => {
        await meetsRepository.saveMeet(makeMeet('e3') as any)

        const result = await backupService.exportReports()
        const participants = result.meets[0].participants as any[]

        expect(participants).toHaveLength(1)
        expect(participants[0].name).toBe('Alice')
        expect(participants[0].duration).toBe(3600)
    })
})

// ─── importReports ────────────────────────────────────────────────────────────

describe('importReports', () => {
    it('throws on null input', async () => {
        await expect(backupService.importReports(null)).rejects.toThrow('Invalid reports data')
    })

    it('throws when the meets key is missing', async () => {
        await expect(backupService.importReports({ type: 'reports' })).rejects.toThrow('Invalid reports data')
    })

    it('clears existing meets before restoring the payload', async () => {
        await meetsRepository.saveMeet(makeMeet('old') as any)

        await backupService.importReports({ meets: [] })

        expect(await meetsRepository.getAllMeets()).toHaveLength(0)
    })

    it('restores all meets from the payload', async () => {
        const meets = [makeMeet('r1'), makeMeet('r2', { date: '2024-02-01' })]

        await backupService.importReports({ meets })

        const stored = await meetsRepository.getAllMeets()
        expect(stored).toHaveLength(2)
        expect(stored.map(m => m.id)).toEqual(expect.arrayContaining(['r1', 'r2']))
    })

    it('syncs new members from imported participants', async () => {
        const db = await databaseService.getDb()
        await backupService.importReports({
            meets: [makeMeet('sync-m', { participants: [{ name: 'NewStudent', duration: 1200 }] })],
        })

        const members = await db.getAll('members')
        expect(members.some((m: any) => m.name === 'NewStudent')).toBe(true)
    })

    it('full round-trip: exported meets are faithfully restored after import', async () => {
        await meetsRepository.saveMeet(makeMeet('rt') as any)

        const exported = await backupService.exportReports()
        await backupService.clearReports()
        await backupService.importReports(exported)

        const stored = await meetsRepository.getAllMeets()
        expect(stored).toHaveLength(1)
        expect(stored[0]!.id).toBe('rt')
        expect(stored[0]!.meetId).toBe('abc-defg-hij')
        expect(stored[0]!.participants[0]!.name).toBe('Alice')
    })
})

// ─── exportData ──────────────────────────────────────────────────────────────

describe('exportData', () => {
    it('returns version 5', async () => {
        const result = await backupService.exportData()
        expect(result.version).toBe(5)
    })

    it('includes all top-level data keys', async () => {
        const result = await backupService.exportData()
        for (const key of ['meets', 'groups', 'tasks', 'marks', 'members', 'settings', 'timestamp']) {
            expect(result).toHaveProperty(key)
        }
    })

    it('settings envelope contains all attendance-related fields', async () => {
        const result = await backupService.exportData()
        const s = result.settings
        for (const key of [
            'ignoredUsers',
            'durationLimit',
            'defaultTeacher',
            'teachers',
            'examSettings',
            'printSettings',
        ]) {
            expect(s).toHaveProperty(key)
        }
    })

    it('exports stored meets with their participants', async () => {
        await meetsRepository.saveMeet(makeMeet('exp-m') as any)

        const result = await backupService.exportData()

        const meet = result.meets.find((m: any) => m.id === 'exp-m')
        expect(meet).toBeDefined()
        expect(meet.participants[0].name).toBe('Alice')
    })

    it('exports stored groups', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'exp-g', meetId: 'abc-defg-hij', name: 'ExpGroup' })

        const result = await backupService.exportData()

        expect(result.groups.map((g: any) => g.id)).toContain('exp-g')
    })

    it('exports configured attendance settings', async () => {
        await settingsRepository.saveDurationLimit(75)
        await settingsRepository.saveIgnoredUsers(['BotUser'])
        await settingsRepository.saveDefaultTeacher('Prof. Smith')

        const result = await backupService.exportData()

        expect(result.settings.durationLimit).toBe(75)
        expect(result.settings.ignoredUsers).toEqual(['BotUser'])
        expect(result.settings.defaultTeacher).toBe('Prof. Smith')
    })
})

// ─── importData ──────────────────────────────────────────────────────────────

describe('importData', () => {
    it('throws when the input is null', async () => {
        await expect(backupService.importData(null)).rejects.toThrow()
    })

    it('throws when meets is missing', async () => {
        await expect(backupService.importData({ groups: [] })).rejects.toThrow()
    })

    it('throws when groups is missing', async () => {
        await expect(backupService.importData({ meets: [] })).rejects.toThrow()
    })

    it('restores meet records from the payload', async () => {
        await backupService.importData({ meets: [makeMeet('imp-m')], groups: [] })

        const stored = await meetsRepository.getAllMeets()
        expect(stored.map(m => m.id)).toContain('imp-m')
    })

    it('restores group records from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importData({
            meets: [],
            groups: [{ id: 'imp-g', meetId: 'abc', name: 'ImpGroup' }],
        })

        const groups = await db.getAll('groups')
        expect(groups.map((g: any) => g.id)).toContain('imp-g')
    })

    it('infers course number from group name when course is absent', async () => {
        const db = await databaseService.getDb()
        await backupService.importData({
            meets: [],
            groups: [{ id: 'cg1', meetId: 'abc', name: 'CS-201' }],
        })

        const groups = await db.getAll('groups')
        const g = groups.find((g: any) => g.id === 'cg1') as any
        expect(g!.course).toBe(2)
    })

    it('does not overwrite existing course value', async () => {
        const db = await databaseService.getDb()
        await backupService.importData({
            meets: [],
            groups: [{ id: 'cg2', meetId: 'abc', name: 'CS-201', course: 4 }],
        })

        const groups = await db.getAll('groups')
        const g = groups.find((g: any) => g.id === 'cg2') as any
        expect(g!.course).toBe(4)
    })

    it('restores settings from the payload', async () => {
        await backupService.importData({
            meets: [],
            groups: [],
            settings: {
                durationLimit: 90,
                ignoredUsers: ['IgnoredBot'],
                defaultTeacher: 'Dr. Y',
                teachers: [],
                examSettings: {},
            },
        })

        expect(await settingsRepository.getDurationLimit()).toBe(90)
        expect(await settingsRepository.getIgnoredUsers()).toEqual(['IgnoredBot'])
        expect(await settingsRepository.getDefaultTeacher()).toBe('Dr. Y')
    })

    it('clears all prior data before restoring', async () => {
        await meetsRepository.saveMeet(makeMeet('old-m') as any)
        await settingsRepository.saveDurationLimit(999)

        await backupService.importData({ meets: [], groups: [] })

        expect(await meetsRepository.getAllMeets()).toHaveLength(0)
        expect(await settingsRepository.getDurationLimit()).toBe(0) // cleared → default
    })

    it('full round-trip: exportData → importData is faithful for meets, groups, and settings', async () => {
        const db = await databaseService.getDb()
        await meetsRepository.saveMeet(makeMeet('rd-m') as any)
        await db.put('groups', { id: 'rd-g', meetId: 'abc-defg-hij', name: 'RD-Group' })
        await settingsRepository.saveDurationLimit(60)
        await settingsRepository.saveIgnoredUsers(['RdBot'])

        const exported = await backupService.exportData()
        await backupService.clearAll()
        await backupService.importData(exported)

        const meets = await meetsRepository.getAllMeets()
        expect(meets.map(m => m.id)).toContain('rd-m')

        const groups = await db.getAll('groups')
        expect(groups.map((g: any) => g.id)).toContain('rd-g')

        expect(await settingsRepository.getDurationLimit()).toBe(60)
        expect(await settingsRepository.getIgnoredUsers()).toEqual(['RdBot'])
    })
})

// ─── clearGroups ──────────────────────────────────────────────────────────────

describe('clearGroups', () => {
    it('removes all groups from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'cg1', meetId: 'clrg-001', name: 'Clear Group A' })
        await db.put('groups', { id: 'cg2', meetId: 'clrg-002', name: 'Clear Group B' })

        await backupService.clearGroups()

        expect(await db.getAll('groups')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'cg3', meetId: 'clrg-003', name: 'Clear Group C' })
        await meetsRepository.saveMeet(makeMeet('clrg-m') as any)

        await backupService.clearGroups()

        expect(await meetsRepository.getAllMeets()).toHaveLength(1)
    })
})

// ─── exportGroups ─────────────────────────────────────────────────────────────

describe('exportGroups', () => {
    it('returns envelope with type "groups" and version 1', async () => {
        const result = await backupService.exportGroups()
        expect(result.type).toBe('groups')
        expect(result.version).toBe(1)
    })

    it('returns an empty groups array when no records are stored', async () => {
        const result = await backupService.exportGroups()
        expect(result.groups).toEqual([])
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportGroups()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all stored groups', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'eg1', meetId: 'expg-001', name: 'Export Group A' })
        await db.put('groups', { id: 'eg2', meetId: 'expg-002', name: 'Export Group B' })

        const result = await backupService.exportGroups()

        expect(result.groups).toHaveLength(2)
        expect(result.groups.map((g: any) => g.id)).toEqual(expect.arrayContaining(['eg1', 'eg2']))
    })
})

// ─── importGroups ─────────────────────────────────────────────────────────────

describe('importGroups', () => {
    it('throws on null input', async () => {
        await expect(backupService.importGroups(null)).rejects.toThrow('Invalid groups data')
    })

    it('throws when the groups key is missing', async () => {
        await expect(backupService.importGroups({ type: 'groups' })).rejects.toThrow('Invalid groups data')
    })

    it('clears existing groups before restoring', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'old-g', meetId: 'impg-old', name: 'Old Group' })

        await backupService.importGroups({ groups: [] })

        expect(await db.getAll('groups')).toHaveLength(0)
    })

    it('restores groups from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importGroups({
            groups: [
                { id: 'impg-1', meetId: 'impg-001', name: 'Imported Group A' },
                { id: 'impg-2', meetId: 'impg-002', name: 'Imported Group B' },
            ],
        })

        const stored = await db.getAll('groups')
        expect(stored).toHaveLength(2)
        expect(stored.map((g: any) => g.id)).toEqual(expect.arrayContaining(['impg-1', 'impg-2']))
    })

    it('enriches course from group name when course is absent', async () => {
        const db = await databaseService.getDb()
        await backupService.importGroups({
            groups: [{ id: 'crsg', meetId: 'impg-crs', name: 'CS-3-Alpha' }],
        })

        const groups = await db.getAll('groups')
        const g = groups.find((x: any) => x.id === 'crsg') as any
        expect(g!.course).toBe(3)
    })

    it('does not overwrite an existing course value', async () => {
        const db = await databaseService.getDb()
        await backupService.importGroups({
            groups: [{ id: 'crsg2', meetId: 'impg-crs2', name: 'CS-201', course: 4 }],
        })

        const groups = await db.getAll('groups')
        const g = groups.find((x: any) => x.id === 'crsg2') as any
        expect(g!.course).toBe(4)
    })

    it('full round-trip: exported groups are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        await db.put('groups', { id: 'rtg', meetId: 'impg-rt', name: 'RT Group', course: 2 })

        const exported = await backupService.exportGroups()
        await backupService.clearGroups()
        await backupService.importGroups(exported)

        const stored = await db.getAll('groups')
        expect(stored).toHaveLength(1)
        expect((stored[0] as any).id).toBe('rtg')
        expect((stored[0] as any).name).toBe('RT Group')
        expect((stored[0] as any).course).toBe(2)
    })
})

// ─── clearMembers ─────────────────────────────────────────────────────────────

describe('clearMembers', () => {
    it('removes all members from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'cm1',
            name: 'Clear Member A',
            role: 'student',
            groupName: 'G1',
        })
        await db.put('members', {
            id: 'cm2',
            name: 'Clear Member B',
            role: 'student',
            groupName: 'G1',
        })

        await backupService.clearMembers()

        expect(await db.getAll('members')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'cm3',
            name: 'Clear Member C',
            role: 'student',
            groupName: 'G1',
        })
        await db.put('groups', { id: 'cmg', meetId: 'clrm-001', name: 'Unaffected Group' })

        await backupService.clearMembers()

        expect(await db.getAll('groups')).toHaveLength(1)
    })
})

// ─── exportMembers ────────────────────────────────────────────────────────────

describe('exportMembers', () => {
    it('returns envelope with type "members" and version 1', async () => {
        const result = await backupService.exportMembers()
        expect(result.type).toBe('members')
        expect(result.version).toBe(1)
    })

    it('returns an empty members array when no records are stored', async () => {
        const result = await backupService.exportMembers()
        expect(result.members).toEqual([])
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportMembers()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all visible stored members', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'em1',
            name: 'Export Member A',
            role: 'student',
            groupName: 'G1',
        })
        await db.put('members', {
            id: 'em2',
            name: 'Export Member B',
            role: 'teacher',
            groupName: null,
        })

        const result = await backupService.exportMembers()

        expect(result.members).toHaveLength(2)
        expect(result.members.map((m: any) => m.id)).toEqual(expect.arrayContaining(['em1', 'em2']))
    })

    it('excludes hidden members from the export', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'vis',
            name: 'Visible Member',
            role: 'student',
            groupName: 'G1',
        })
        await db.put('members', {
            id: 'hid',
            name: 'Hidden Member',
            role: 'student',
            groupName: 'G1',
            hidden: true,
        })

        const result = await backupService.exportMembers()

        expect(result.members.map((m: any) => m.id)).toContain('vis')
        expect(result.members.map((m: any) => m.id)).not.toContain('hid')
    })
})

// ─── importMembers ────────────────────────────────────────────────────────────

describe('importMembers', () => {
    it('throws on null input', async () => {
        await expect(backupService.importMembers(null)).rejects.toThrow('Invalid members data')
    })

    it('throws when the members key is missing', async () => {
        await expect(backupService.importMembers({ type: 'members' })).rejects.toThrow('Invalid members data')
    })

    it('clears existing members before restoring', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'old-m',
            name: 'Old Member',
            role: 'student',
            groupName: 'G1',
        })

        await backupService.importMembers({ members: [] })

        expect(await db.getAll('members')).toHaveLength(0)
    })

    it('restores members from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importMembers({
            members: [
                { id: 'impm1', name: 'Imported Member A', role: 'student', groupName: 'G1' },
                { id: 'impm2', name: 'Imported Member B', role: 'teacher', groupName: null },
            ],
        })

        const stored = await db.getAll('members')
        expect(stored).toHaveLength(2)
        expect(stored.map((m: any) => m.id)).toEqual(expect.arrayContaining(['impm1', 'impm2']))
    })

    it('preserves all member fields during restore', async () => {
        const db = await databaseService.getDb()
        await backupService.importMembers({
            members: [
                {
                    id: 'mfld',
                    name: 'Field Member',
                    role: 'student',
                    groupName: 'Gamma',
                    iep: 'IEP-999',
                    aliases: ['Old Name'],
                },
            ],
        })

        const stored = await db.getAll('members')
        const member = stored[0] as any
        expect(member.iep).toBe('IEP-999')
        expect(member.aliases).toEqual(['Old Name'])
    })

    it('full round-trip: exported members are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'rtm',
            name: 'RT Member',
            role: 'student',
            groupName: 'RT Group',
        })

        const exported = await backupService.exportMembers()
        await backupService.clearMembers()
        await backupService.importMembers(exported)

        const stored = await db.getAll('members')
        expect(stored).toHaveLength(1)
        expect((stored[0] as any).id).toBe('rtm')
        expect((stored[0] as any).name).toBe('RT Member')
    })
})

// ─── clearMarks ───────────────────────────────────────────────────────────────

describe('clearMarks', () => {
    it('removes all marks from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 1,
            taskId: 10,
            studentId: 'cm-s1',
            score: 80,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })

        await backupService.clearMarks()

        expect(await db.getAll('marks')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 2,
            taskId: 10,
            studentId: 'cm-s2',
            score: 90,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })
        await db.put('groups', { id: 'mk-g', meetId: 'clrk-001', name: 'Mark Test Group' })

        await backupService.clearMarks()

        expect(await db.getAll('groups')).toHaveLength(1)
    })
})

// ─── exportMarks ──────────────────────────────────────────────────────────────

describe('exportMarks', () => {
    it('returns envelope with type "marks" and version 3', async () => {
        const result = await backupService.exportMarks()
        expect(result.type).toBe('marks')
        expect(result.version).toBe(3)
    })

    it('returns empty arrays when no records exist', async () => {
        const result = await backupService.exportMarks()
        expect(result.marks).toEqual([])
        expect(result.members).toEqual([])
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportMarks()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all stored marks and visible members', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 3,
            taskId: 10,
            studentId: 'em-s3',
            score: 75,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })
        await db.put('members', {
            id: 'em-s3',
            name: 'Export Mark Student',
            role: 'student',
            groupName: 'G1',
        })

        const result = await backupService.exportMarks()

        expect(result.marks.some((m: any) => m.id === 3)).toBe(true)
        expect(result.members.some((m: any) => m.id === 'em-s3')).toBe(true)
    })
})

// ─── importMarks ──────────────────────────────────────────────────────────────

describe('importMarks', () => {
    it('throws on null input', async () => {
        await expect(backupService.importMarks(null)).rejects.toThrow('Invalid marks data')
    })

    it('throws when marks key is missing', async () => {
        await expect(backupService.importMarks({ members: [] })).rejects.toThrow('Invalid marks data')
    })

    it('clears existing marks before restoring', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 4,
            taskId: 20,
            studentId: 'im-s4',
            score: 70,
            groupName: 'G1',
            createdAt: '2024-01-01',
        })

        await backupService.importMarks({ marks: [] })

        expect(await db.getAll('marks')).toHaveLength(0)
    })

    it('restores marks from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importMarks({
            marks: [
                {
                    id: 5,
                    taskId: 30,
                    studentId: 'im-s5',
                    score: 88,
                    groupName: 'G2',
                    createdAt: '2024-01-01',
                },
            ],
        })

        const stored = await db.getAll('marks')
        expect(stored.some((m: any) => m.id === 5)).toBe(true)
    })

    it('clears and restores members when members are included in the payload', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'old-ms',
            name: 'Old Mark Student',
            role: 'student',
            groupName: 'G1',
        })

        await backupService.importMarks({
            marks: [],
            members: [{ id: 'new-ms', name: 'New Mark Student', role: 'student', groupName: 'G2' }],
        })

        const members = await db.getAll('members')
        expect(members).toHaveLength(1)
        expect((members[0] as any).id).toBe('new-ms')
    })

    it('does not clear members when members field is absent', async () => {
        const db = await databaseService.getDb()
        await db.put('members', {
            id: 'keep-ms',
            name: 'Kept Student',
            role: 'student',
            groupName: 'G1',
        })

        await backupService.importMarks({ marks: [] })

        const members = await db.getAll('members')
        expect(members.some((m: any) => m.id === 'keep-ms')).toBe(true)
    })

    it('full round-trip: exported marks are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        await db.put('marks', {
            id: 6,
            taskId: 40,
            studentId: 'rt-s6',
            score: 92,
            groupName: 'G3',
            createdAt: '2024-01-02',
        })

        const exported = await backupService.exportMarks()
        await backupService.clearMarks()
        await backupService.importMarks(exported)

        const stored = await db.getAll('marks')
        expect(stored).toHaveLength(1)
        expect((stored[0] as any).score).toBe(92)
    })
})

// ─── clearTasks ───────────────────────────────────────────────────────────────

describe('clearTasks', () => {
    it('removes all tasks from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', { name: 'Clear Task A', normalizedName: 'clr-task-a' })

        await backupService.clearTasks()

        expect(await db.getAll('tasks')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', { name: 'Clear Task B', normalizedName: 'clr-task-b' })
        await db.put('groups', { id: 'tsk-g', meetId: 'clrt-001', name: 'Task Test Group' })

        await backupService.clearTasks()

        expect(await db.getAll('groups')).toHaveLength(1)
    })
})

// ─── exportTasks ──────────────────────────────────────────────────────────────

describe('exportTasks', () => {
    it('returns envelope with type "tasks" and version 1', async () => {
        const result = await backupService.exportTasks()
        expect(result.type).toBe('tasks')
        expect(result.version).toBe(1)
    })

    it('returns an empty tasks array when no records exist', async () => {
        const result = await backupService.exportTasks()
        expect(result.tasks).toEqual([])
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportTasks()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all stored tasks', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', { name: 'Export Task A', normalizedName: 'exp-task-a' })
        await db.put('tasks', { name: 'Export Task B', normalizedName: 'exp-task-b' })

        const result = await backupService.exportTasks()

        expect(result.tasks).toHaveLength(2)
        expect(result.tasks.map((t: any) => t.normalizedName)).toEqual(
            expect.arrayContaining(['exp-task-a', 'exp-task-b']),
        )
    })
})

// ─── importTasks ──────────────────────────────────────────────────────────────

describe('importTasks', () => {
    it('throws on null input', async () => {
        await expect(backupService.importTasks(null)).rejects.toThrow('Invalid tasks data')
    })

    it('throws when the tasks key is missing', async () => {
        await expect(backupService.importTasks({ type: 'tasks' })).rejects.toThrow('Invalid tasks data')
    })

    it('clears existing tasks before restoring', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', { name: 'Old Task', normalizedName: 'old-task' })

        await backupService.importTasks({ tasks: [] })

        expect(await db.getAll('tasks')).toHaveLength(0)
    })

    it('restores tasks from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importTasks({
            tasks: [
                { id: 1, name: 'Imported Task A', normalizedName: 'imp-task-a' },
                { id: 2, name: 'Imported Task B', normalizedName: 'imp-task-b' },
            ],
        })

        const stored = await db.getAll('tasks')
        expect(stored).toHaveLength(2)
        expect(stored.map((t: any) => t.normalizedName)).toEqual(expect.arrayContaining(['imp-task-a', 'imp-task-b']))
    })

    it('full round-trip: exported tasks are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        await db.put('tasks', { name: 'RT Task', normalizedName: 'rt-task' })

        const exported = await backupService.exportTasks()
        await backupService.clearTasks()
        await backupService.importTasks(exported)

        const stored = await db.getAll('tasks')
        expect(stored).toHaveLength(1)
        expect((stored[0] as any).name).toBe('RT Task')
    })
})

// ─── clearSummary ─────────────────────────────────────────────────────────────

describe('clearSummary', () => {
    it('clears modules, units, and finalAssessments stores', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 1, groupId: 'sg1', groupName: 'G1', name: 'Module A' })
        await db.put('units', {
            id: 1,
            name: 'Unit A',
            normalizedName: 'unit-a',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 1,
        })
        await db.put('finalAssessments', { id: 1, studentId: 'clrs-s1', assessmentType: 'exam' })

        await backupService.clearSummary()

        expect(await db.getAll('modules')).toHaveLength(0)
        expect(await db.getAll('units')).toHaveLength(0)
        expect(await db.getAll('finalAssessments')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 2, groupId: 'sg2', groupName: 'G2', name: 'Module B' })
        await db.put('groups', { id: 'sum-g', meetId: 'clrs-001', name: 'Summary Test Group' })

        await backupService.clearSummary()

        expect(await db.getAll('groups')).toHaveLength(1)
    })
})

// ─── exportSummary ────────────────────────────────────────────────────────────

describe('exportSummary', () => {
    it('returns envelope with type "summary" and version 1', async () => {
        const result = await backupService.exportSummary()
        expect(result.type).toBe('summary')
        expect(result.version).toBe(1)
    })

    it('includes modules, units, finalAssessments, and settings keys', async () => {
        const result = await backupService.exportSummary()
        expect(result).toHaveProperty('modules')
        expect(result).toHaveProperty('units')
        expect(result).toHaveProperty('finalAssessments')
        expect(result.settings).toHaveProperty('examSettings')
    })

    it('returns empty arrays when no records exist', async () => {
        const result = await backupService.exportSummary()
        expect(result.modules).toEqual([])
        expect(result.units).toEqual([])
        expect(result.finalAssessments).toEqual([])
    })

    it('includes a valid ISO timestamp', async () => {
        const before = Date.now()
        const result = await backupService.exportSummary()
        const after = Date.now()
        const ts = new Date(result.timestamp).getTime()
        expect(ts).toBeGreaterThanOrEqual(before)
        expect(ts).toBeLessThanOrEqual(after)
    })

    it('includes all stored modules and units', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 3, groupId: 'sg3', groupName: 'G3', name: 'Export Module' })
        await db.put('units', {
            id: 2,
            name: 'Export Unit',
            normalizedName: 'exp-unit',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 1,
        })

        const result = await backupService.exportSummary()

        expect(result.modules.some((m: any) => m.id === 3)).toBe(true)
        expect(result.units.some((u: any) => u.id === 2)).toBe(true)
    })

    it('includes the current examSettings in the envelope', async () => {
        await settingsRepository.saveExamSettings({ subject: 'Biology' })

        const result = await backupService.exportSummary()

        expect(result.settings.examSettings).toMatchObject({ subject: 'Biology' })
    })
})

// ─── importSummary ────────────────────────────────────────────────────────────

describe('importSummary', () => {
    it('throws on null input', async () => {
        await expect(backupService.importSummary(null)).rejects.toThrow('Invalid summary data format')
    })

    it('clears all three summary stores before restoring', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 4, groupId: 'sg4', groupName: 'G4', name: 'Old Module' })
        await db.put('units', {
            id: 3,
            name: 'Old Unit',
            normalizedName: 'old-unit-x',
            taskIds: [],
            testTaskId: null,
            taskCoef: 1,
            testCoef: 1,
            ordinal: 1,
        })
        await db.put('finalAssessments', { id: 4, studentId: 'iss-s4', assessmentType: 'quiz' })

        await backupService.importSummary({ modules: [], finalAssessments: [], units: [] })

        expect(await db.getAll('modules')).toHaveLength(0)
        expect(await db.getAll('units')).toHaveLength(0)
        expect(await db.getAll('finalAssessments')).toHaveLength(0)
    })

    it('restores modules from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importSummary({
            modules: [{ id: 5, groupId: 'sg5', groupName: 'G5', name: 'Imported Module' }],
        })

        const modules = await db.getAll('modules')
        expect(modules.some((m: any) => m.id === 5)).toBe(true)
    })

    it('restores finalAssessments from the payload', async () => {
        const db = await databaseService.getDb()
        await backupService.importSummary({
            finalAssessments: [{ id: 6, studentId: 'iss-s6', assessmentType: 'exam' }],
        })

        const assessments = await db.getAll('finalAssessments')
        expect(assessments.some((a: any) => a.id === 6)).toBe(true)
    })

    it('restores examSettings when provided in the payload', async () => {
        await backupService.importSummary({
            settings: { examSettings: { subject: 'Mathematics', semester: '1' } },
        })

        const examSettings = await settingsRepository.getExamSettings()
        expect(examSettings).toMatchObject({ subject: 'Mathematics', semester: '1' })
    })

    it('does not throw when settings or examSettings is absent', async () => {
        await expect(backupService.importSummary({})).resolves.not.toThrow()
    })

    it('full round-trip: exported summary is faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        await db.put('modules', { id: 7, groupId: 'sg7', groupName: 'G7', name: 'RT Module' })
        await db.put('finalAssessments', { id: 7, studentId: 'rt-s7', assessmentType: 'test' })
        await settingsRepository.saveExamSettings({ subject: 'Physics' })

        const exported = await backupService.exportSummary()
        await backupService.clearSummary()
        await backupService.importSummary(exported)

        const modules = await db.getAll('modules')
        expect(modules.some((m: any) => m.id === 7)).toBe(true)

        const examSettings = await settingsRepository.getExamSettings()
        expect(examSettings).toMatchObject({ subject: 'Physics' })
    })
})

// ─── clearSessions ────────────────────────────────────────────────────────────

describe('clearSessions', () => {
    it('removes all sessions from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('sessions', {
            id: 'sess-1',
            sessionType: 'MAIN',
            status: 'OPEN',
            groupId: 'g1',
            openedAt: '2024-01-01T00:00:00.000Z',
            closedAt: null,
            entries: [],
        })
        await db.put('sessions', {
            id: 'sess-2',
            sessionType: 'FIRST_RETAKE',
            status: 'CLOSED',
            groupId: 'g1',
            openedAt: '2024-02-01T00:00:00.000Z',
            closedAt: '2024-02-10T00:00:00.000Z',
            entries: [],
        })

        await backupService.clearSessions()

        expect(await db.getAll('sessions')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('sessions', {
            id: 'sess-clr',
            sessionType: 'MAIN',
            status: 'OPEN',
            groupId: 'g1',
            openedAt: '2024-01-01T00:00:00.000Z',
            closedAt: null,
            entries: [],
        })
        await db.put('plans', {
            id: 'plan-keep',
            studentId: 's1',
            iep: 'E1',
            grade: null,
            dateApplied: '2024-01-01T00:00:00.000Z',
            sessionType: 'MAIN',
            isSynced: false,
            syncedAt: null,
        })

        await backupService.clearSessions()

        expect(await db.getAll('plans')).toHaveLength(1)
    })
})

// ─── exportDocumentSessions ───────────────────────────────────────────────────

describe('exportDocumentSessions', () => {
    it('returns envelope with type "documentSessions" and version 1', async () => {
        const result = await backupService.exportDocumentSessions()
        expect(result.type).toBe('documentSessions')
        expect(result.version).toBe(1)
    })

    it('includes a timestamp', async () => {
        const result = await backupService.exportDocumentSessions()
        expect(result.timestamp).toBeTruthy()
    })

    it('returns empty sessions array when store is empty', async () => {
        const result = await backupService.exportDocumentSessions()
        expect(result.sessions).toEqual([])
    })

    it('exports all sessions from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('sessions', {
            id: 'exp-s1',
            sessionType: 'MAIN',
            status: 'OPEN',
            groupId: 'g1',
            openedAt: '2024-01-01T00:00:00.000Z',
            closedAt: null,
            entries: [],
        })
        await db.put('sessions', {
            id: 'exp-s2',
            sessionType: 'FIRST_RETAKE',
            status: 'CLOSED',
            groupId: 'g1',
            openedAt: '2024-02-01T00:00:00.000Z',
            closedAt: '2024-02-10T00:00:00.000Z',
            entries: [],
        })

        const result = await backupService.exportDocumentSessions()

        expect(result.sessions).toHaveLength(2)
        expect(result.sessions.some((s: any) => s.id === 'exp-s1')).toBe(true)
        expect(result.sessions.some((s: any) => s.id === 'exp-s2')).toBe(true)
    })

    it('preserves session entries in export', async () => {
        const db = await databaseService.getDb()
        const entries = [
            {
                studentId: 's1',
                studentSnapshot: { id: 's1', fullName: 'Alice' },
                grade: 88,
                gradeType: 'MANUAL' as const,
                updatedAt: '2024-06-01T00:00:00.000Z',
            },
        ]
        await db.put('sessions', {
            id: 'exp-entries',
            sessionType: 'MAIN' as const,
            status: 'CLOSED' as const,
            groupId: 'g1',
            openedAt: '2024-06-01T00:00:00.000Z',
            closedAt: '2024-06-10T00:00:00.000Z',
            entries,
        })

        const result = await backupService.exportDocumentSessions()

        const exported = result.sessions.find((s: any) => s.id === 'exp-entries')
        expect(exported.entries).toHaveLength(1)
        expect(exported.entries[0].grade).toBe(88)
    })
})

// ─── importDocumentSessions ───────────────────────────────────────────────────

describe('importDocumentSessions', () => {
    it('throws when payload is null', async () => {
        await expect(backupService.importDocumentSessions(null)).rejects.toThrow('Invalid sessions data')
    })

    it('throws when sessions key is missing', async () => {
        await expect(backupService.importDocumentSessions({ version: 1 })).rejects.toThrow('Invalid sessions data')
    })

    it('restores sessions from the payload', async () => {
        const db = await databaseService.getDb()
        const payload = {
            sessions: [
                {
                    id: 'imp-s1',
                    sessionType: 'MAIN',
                    status: 'OPEN',
                    groupId: 'g1',
                    openedAt: '2024-01-01T00:00:00.000Z',
                    closedAt: null,
                    entries: [],
                },
                {
                    id: 'imp-s2',
                    sessionType: 'SECOND_RETAKE',
                    status: 'CLOSED',
                    groupId: 'g2',
                    openedAt: '2024-03-01T00:00:00.000Z',
                    closedAt: '2024-03-10T00:00:00.000Z',
                    entries: [],
                },
            ],
        }

        await backupService.importDocumentSessions(payload)

        const stored = await db.getAll('sessions')
        expect(stored.some((s: any) => s.id === 'imp-s1')).toBe(true)
        expect(stored.some((s: any) => s.id === 'imp-s2')).toBe(true)
    })

    it('clears existing sessions before importing', async () => {
        const db = await databaseService.getDb()
        await db.put('sessions', {
            id: 'old-s',
            sessionType: 'MAIN',
            status: 'OPEN',
            groupId: 'g1',
            openedAt: '2024-01-01T00:00:00.000Z',
            closedAt: null,
            entries: [],
        })

        await backupService.importDocumentSessions({ sessions: [] })

        expect(await db.getAll('sessions')).toHaveLength(0)
    })

    it('full round-trip: exported sessions are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        const entries = [
            {
                studentId: 's1',
                studentSnapshot: { id: 's1', fullName: 'Alice' },
                grade: 92,
                gradeType: 'AUTO' as const,
                updatedAt: '2024-06-10T00:00:00.000Z',
            },
        ]
        await db.put('sessions', {
            id: 'rt-sess-1',
            sessionType: 'MAIN' as const,
            status: 'CLOSED' as const,
            groupId: 'rt-g1',
            openedAt: '2024-06-01T00:00:00.000Z',
            closedAt: '2024-06-10T00:00:00.000Z',
            entries,
        })

        const exported = await backupService.exportDocumentSessions()
        await backupService.clearSessions()
        await backupService.importDocumentSessions(exported)

        const all = await db.getAll('sessions')
        const restored = all.find((s: any) => s.id === 'rt-sess-1')!
        expect(restored).toBeDefined()
        expect(restored.entries[0]!.grade).toBe(92)
        expect(restored.groupId).toBe('rt-g1')
    })
})

// ─── clearPlans ───────────────────────────────────────────────────────────────

describe('clearPlans', () => {
    it('removes all plans from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('plans', {
            id: 'clr-p1',
            studentId: 's1',
            iep: 'E1',
            grade: null,
            dateApplied: '2024-01-01T00:00:00.000Z',
            sessionType: 'MAIN',
            isSynced: false,
            syncedAt: null,
        })
        await db.put('plans', {
            id: 'clr-p2',
            studentId: 's2',
            iep: 'E2',
            grade: 80,
            dateApplied: '2024-02-01T00:00:00.000Z',
            sessionType: 'FIRST_RETAKE',
            isSynced: true,
            syncedAt: '2024-02-15T00:00:00.000Z',
        })

        await backupService.clearPlans()

        expect(await db.getAll('plans')).toHaveLength(0)
    })

    it('does not affect other stores', async () => {
        const db = await databaseService.getDb()
        await db.put('plans', {
            id: 'clr-p3',
            studentId: 's3',
            iep: 'E3',
            grade: null,
            dateApplied: '2024-01-01T00:00:00.000Z',
            sessionType: 'MAIN',
            isSynced: false,
            syncedAt: null,
        })
        await db.put('sessions', {
            id: 'sess-keep',
            sessionType: 'MAIN',
            status: 'OPEN',
            groupId: 'g1',
            openedAt: '2024-01-01T00:00:00.000Z',
            closedAt: null,
            entries: [],
        })

        await backupService.clearPlans()

        expect(await db.getAll('sessions')).toHaveLength(1)
    })
})

// ─── exportPlans ──────────────────────────────────────────────────────────────

describe('exportPlans', () => {
    it('returns envelope with type "plans" and version 1', async () => {
        const result = await backupService.exportPlans()
        expect(result.type).toBe('plans')
        expect(result.version).toBe(1)
    })

    it('includes a timestamp', async () => {
        const result = await backupService.exportPlans()
        expect(result.timestamp).toBeTruthy()
    })

    it('returns empty plans array when store is empty', async () => {
        const result = await backupService.exportPlans()
        expect(result.plans).toEqual([])
    })

    it('exports all plans from the store', async () => {
        const db = await databaseService.getDb()
        await db.put('plans', {
            id: 'exp-p1',
            studentId: 'sa',
            iep: 'IA',
            grade: 85,
            dateApplied: '2024-06-01T00:00:00.000Z',
            sessionType: 'MAIN',
            isSynced: false,
            syncedAt: null,
        })
        await db.put('plans', {
            id: 'exp-p2',
            studentId: 'sb',
            iep: 'IB',
            grade: null,
            dateApplied: '2024-06-02T00:00:00.000Z',
            sessionType: 'FIRST_RETAKE',
            isSynced: true,
            syncedAt: '2024-06-05T00:00:00.000Z',
        })

        const result = await backupService.exportPlans()

        expect(result.plans).toHaveLength(2)
        expect(result.plans.some((p: any) => p.id === 'exp-p1')).toBe(true)
        expect(result.plans.some((p: any) => p.id === 'exp-p2')).toBe(true)
    })

    it('preserves all plan fields in export', async () => {
        const db = await databaseService.getDb()
        const plan = {
            id: 'exp-full',
            studentId: 'sf',
            iep: 'IF',
            grade: 72,
            dateApplied: '2025-01-01T00:00:00.000Z',
            sessionType: 'SECOND_RETAKE' as const,
            isSynced: true,
            syncedAt: '2025-01-10T00:00:00.000Z',
        }
        await db.put('plans', plan)

        const result = await backupService.exportPlans()

        const exported = result.plans.find((p: any) => p.id === 'exp-full')
        expect(exported).toEqual(plan)
    })
})

// ─── importPlans ──────────────────────────────────────────────────────────────

describe('importPlans', () => {
    it('throws when payload is null', async () => {
        await expect(backupService.importPlans(null)).rejects.toThrow('Invalid plans data')
    })

    it('throws when plans key is missing', async () => {
        await expect(backupService.importPlans({ version: 1 })).rejects.toThrow('Invalid plans data')
    })

    it('restores plans from the payload', async () => {
        const db = await databaseService.getDb()
        const payload = {
            plans: [
                {
                    id: 'imp-p1',
                    studentId: 'sa',
                    iep: 'IA',
                    grade: 90,
                    dateApplied: '2024-06-01T00:00:00.000Z',
                    sessionType: 'MAIN',
                    isSynced: false,
                    syncedAt: null,
                },
                {
                    id: 'imp-p2',
                    studentId: 'sb',
                    iep: 'IB',
                    grade: null,
                    dateApplied: '2024-06-05T00:00:00.000Z',
                    sessionType: 'FIRST_RETAKE',
                    isSynced: false,
                    syncedAt: null,
                },
            ],
        }

        await backupService.importPlans(payload)

        const stored = await db.getAll('plans')
        expect(stored.some((p: any) => p.id === 'imp-p1')).toBe(true)
        expect(stored.some((p: any) => p.id === 'imp-p2')).toBe(true)
    })

    it('clears existing plans before importing', async () => {
        const db = await databaseService.getDb()
        await db.put('plans', {
            id: 'old-p',
            studentId: 'so',
            iep: 'IO',
            grade: null,
            dateApplied: '2024-01-01T00:00:00.000Z',
            sessionType: 'MAIN',
            isSynced: false,
            syncedAt: null,
        })

        await backupService.importPlans({ plans: [] })

        expect(await db.getAll('plans')).toHaveLength(0)
    })

    it('full round-trip: exported plans are faithfully restored after import', async () => {
        const db = await databaseService.getDb()
        const plan = {
            id: 'rt-plan-1',
            studentId: 'rt-s1',
            iep: 'RT-IEP',
            grade: 78,
            dateApplied: '2024-06-01T00:00:00.000Z',
            sessionType: 'MAIN' as const,
            isSynced: true,
            syncedAt: '2024-06-15T00:00:00.000Z',
        }
        await db.put('plans', plan)

        const exported = await backupService.exportPlans()
        await backupService.clearPlans()
        await backupService.importPlans(exported)

        const all = await db.getAll('plans')
        const restored = all.find((p: any) => p.id === 'rt-plan-1')
        expect(restored).toEqual(plan)
    })
})
