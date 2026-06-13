import type { Meet } from '@Analytics/types/analytics'
import type { Mark, Task } from '@Marks/types/marks'
import type { Member } from '@Students/types/students'
import type { Group } from '../../types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { marksRepository } from '@Marks/services/marks.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/services/settings.repository'
import { groupsRepository } from '../groups.repository'
import { GroupsService, suggestCourseFromName } from '../groups.service'

// Mock Worker globally for JSDOM
if (typeof Worker === 'undefined') {
    ;(globalThis as any).Worker = class {
        constructor() {}
        postMessage() {}
        onmessage() {}
        terminate() {}
    }
}

vi.mock('../groups.repository')
vi.mock('@Analytics/services/meets.repository')
vi.mock('@Students/services/students.repository')
vi.mock('@Tasks/services/tasks.repository')
vi.mock('@Marks/services/marks.repository')
vi.mock('@/shared/services/settings.repository')
vi.mock('@/workers/groups.worker?worker', () => ({
    default: class MockWorker {},
}))

const { mockProcessGroupsData } = vi.hoisted(() => ({
    mockProcessGroupsData: vi.fn(),
}))

vi.mock('comlink', () => ({
    wrap: vi.fn(() => ({
        setDebug: vi.fn().mockResolvedValue(undefined),
        processGroupsData: mockProcessGroupsData,
    })),
    expose: vi.fn(),
}))

describe('groupsService', () => {
    let service: GroupsService

    beforeEach(() => {
        vi.clearAllMocks()
        service = new GroupsService()
    })

    // ─── loadGroupsData ────────────────────────────────────────────────────

    describe('loadGroupsData', () => {
        it('fetches all data sources and delegates to the worker', async () => {
            const mockGroups = [{ id: 'g1', name: 'Group1', meetId: 'm1' }] as Group[]
            const mockMeets = [{ meetId: 'm1' }] as Meet[]
            const mockMembers = [{ name: 'Alice' }] as Member[]
            const mockTeacherList = ['Teacher1']
            const mockTasks = [{ id: 't1' }] as Task[]
            const mockMarks = [{ score: 90 }] as Mark[]

            ;(groupsRepository.getGroups as any).mockResolvedValue(mockGroups)
            ;(meetsRepository.getAllMeets as any).mockResolvedValue(mockMeets)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue(mockMembers)
            ;(settingsRepository.getTeachers as any).mockResolvedValue(mockTeacherList)
            ;(tasksRepository.getAllTasks as any).mockResolvedValue(mockTasks)
            ;(marksRepository.getAllMarks as any).mockResolvedValue(mockMarks)

            const mockWorkerResult = {
                groups: [
                    {
                        name: 'Group1',
                        avgMark: 5,
                        avgTaskCompletion: 80,
                        modeMark: 5,
                        medianMark: 5,
                    },
                ],
                memberCounts: { Group1: 1 },
                allMeetIds: ['m1'],
            }
            mockProcessGroupsData.mockResolvedValue(mockWorkerResult)

            const result = await service.loadGroupsData()

            expect(groupsRepository.getGroups).toHaveBeenCalled()
            expect(meetsRepository.getAllMeets).toHaveBeenCalled()
            expect(mockProcessGroupsData).toHaveBeenCalledWith(
                mockGroups,
                mockMeets,
                mockMembers,
                mockTeacherList,
                mockTasks,
                mockMarks,
            )
            expect(result.groups).toEqual(mockWorkerResult.groups)
            expect(result.memberCounts).toEqual({ Group1: 1 })
            expect(result.allMeetIds).toEqual(['m1'])
            expect(result.allTeachers).toEqual(['Teacher1'])
        })

        it('does not expose teacherSet in the returned data shape', async () => {
            ;(groupsRepository.getGroups as any).mockResolvedValue([])
            ;(meetsRepository.getAllMeets as any).mockResolvedValue([])
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(settingsRepository.getTeachers as any).mockResolvedValue([])
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([])
            ;(marksRepository.getAllMarks as any).mockResolvedValue([])

            mockProcessGroupsData.mockResolvedValue({
                groups: [],
                memberCounts: {},
                allMeetIds: [],
            })

            const result = await service.loadGroupsData()
            expect(result).not.toHaveProperty('teacherSet')
        })
    })

    // ─── saveGroup ─────────────────────────────────────────────────────────

    describe('saveGroup', () => {
        it('persists a valid group and returns the saved object', async () => {
            await service.saveGroup({ meetId: 'm_new', name: 'New Group' })
            expect(groupsRepository.saveGroup).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Group',
                    meetId: 'm_new',
                }),
            )
        })

        it('assigns a uuid when no id is provided', async () => {
            await service.saveGroup({ meetId: 'm1', name: 'Alpha' })
            const saved = (groupsRepository.saveGroup as any).mock.calls[0][0] as Group
            expect(typeof saved.id).toBe('string')
            expect(saved.id).toBeTruthy()
        })

        it('preserves an existing id', async () => {
            await service.saveGroup({ id: 'existing-id', meetId: 'm1', name: 'Beta' })
            const saved = (groupsRepository.saveGroup as any).mock.calls[0][0] as Group
            expect(saved.id).toBe('existing-id')
        })

        it('throws when name is missing', async () => {
            await expect(service.saveGroup({ name: '', meetId: 'm1' })).rejects.toThrow(
                'Name and Meet ID are required',
            )
        })

        it('throws when meetId is missing', async () => {
            await expect(service.saveGroup({ name: 'Group A', meetId: '' })).rejects.toThrow(
                'Name and Meet ID are required',
            )
        })

        it('throws when name is whitespace only', async () => {
            await expect(service.saveGroup({ name: '   ', meetId: 'm1' })).rejects.toThrow(
                'Name and Meet ID are required',
            )
        })

        it('throws when meetId is whitespace only', async () => {
            await expect(service.saveGroup({ name: 'Group A', meetId: '   ' })).rejects.toThrow(
                'Name and Meet ID are required',
            )
        })

        it('trims name and meetId before saving', async () => {
            await service.saveGroup({ name: '  Group B  ', meetId: '  abc-defg-hij  ' })
            const saved = (groupsRepository.saveGroup as any).mock.calls[0][0] as Group
            expect(saved.name).toBe('Group B')
            expect(saved.meetId).toBe('abc-defg-hij')
        })

        it('syncs members from meets after saving', async () => {
            ;(meetsRepository.getMeetsByMeetId as any).mockResolvedValue([])
            ;(studentsRepository.syncParticipants as any).mockResolvedValue(undefined)
            await service.saveGroup({ meetId: 'm1', name: 'Sync Group' })
            expect(meetsRepository.getMeetsByMeetId).toHaveBeenCalledWith('m1')
            expect(studentsRepository.syncParticipants).toHaveBeenCalled()
        })
    })

    // ─── deleteGroup ───────────────────────────────────────────────────────

    describe('deleteGroup', () => {
        it('delegates deletion to the repository', async () => {
            await service.deleteGroup('g1')
            expect(groupsRepository.deleteGroup).toHaveBeenCalledWith('g1')
        })

        it('accepts numeric ids', async () => {
            await service.deleteGroup(42)
            expect(groupsRepository.deleteGroup).toHaveBeenCalledWith(42)
        })

        it('propagates repository errors', async () => {
            ;(groupsRepository.deleteGroup as any).mockRejectedValue(new Error('DB error'))
            await expect(service.deleteGroup('g1')).rejects.toThrow('DB error')
        })
    })
})

// ─── suggestCourseFromName (pure utility) ─────────────────────────────────

describe('suggestCourseFromName', () => {
    it('extracts course number from a group name with a digit', () => {
        expect(suggestCourseFromName('CS-2-A')).toBe(2)
        expect(suggestCourseFromName('Group 3')).toBe(3)
    })

    it('returns undefined when no digit is found', () => {
        expect(suggestCourseFromName('Alpha')).toBeUndefined()
        expect(suggestCourseFromName('')).toBeUndefined()
    })

    it('returns undefined when digit is outside course bounds (1–4)', () => {
        expect(suggestCourseFromName('Year 5')).toBeUndefined()
        expect(suggestCourseFromName('Group 0')).toBeUndefined()
    })

    it('uses the first digit in the name', () => {
        expect(suggestCourseFromName('1st Year 2024')).toBe(1)
    })
})
