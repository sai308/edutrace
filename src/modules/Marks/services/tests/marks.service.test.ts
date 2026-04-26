import type { Group } from '@Groups/types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/services/settings.repository'
import { marksRepository } from '../marks.repository'
import { marksService } from '../marks.service'

// Mock repositories
vi.mock('../marks.repository')
vi.mock('@Tasks/services/tasks.repository')
vi.mock('@Groups/services/groups.repository')
vi.mock('@Students/services/students.repository')
vi.mock('@Analytics/services/meets.repository')
vi.mock('@/shared/services/settings.repository')

// Mock Worker import
vi.mock('@/workers/parser.worker?worker', () => ({
    default: class {
        constructor() {}
        postMessage = vi.fn()
        terminate = vi.fn()
    },
}))

const { mockParseMarksCSV } = vi.hoisted(() => ({
    mockParseMarksCSV: vi.fn(),
}))

// Mock Comlink to return the parser method
vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        parseMarksCSV: mockParseMarksCSV,
    }),
    expose: vi.fn(),
}))

describe('marksService', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Polyfill File if needed
        if (typeof File === 'undefined') {
            ;(globalThis as any).File = class File {
                name: string
                parts: any[]
                options: any
                constructor(parts: any[], filename: string, options: any) {
                    this.parts = parts
                    this.name = filename
                    this.options = options
                }

                text() {
                    return Promise.resolve(this.parts[0] || '')
                }
            }
        }
    })

    describe('processFile', () => {
        it('should orchestrate file processing correctly', async () => {
            // Mock Parser Output
            mockParseMarksCSV.mockResolvedValue({
                tasks: [{ name: 'Task1' }],
                studentsData: [
                    {
                        student: { name: 'S1' },
                        marks: [{ taskIndex: 0, score: 90 }],
                    },
                ],
            })

            // Mock Repositories
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([])
            ;(tasksRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(tasksRepository as any).saveTask = vi.fn().mockResolvedValue({ id: 't1' })
            ;(studentsRepository as any).saveMember = vi.fn().mockResolvedValue('s1')
            ;(marksRepository.getAllMarks as any).mockResolvedValue([])
            ;(marksRepository.bulkSaveSafe as any).mockResolvedValue({
                added: 1,
                updated: 0,
                skipped: 0,
            })
            ;(marksRepository as any).saveMark = vi.fn().mockResolvedValue({ isNew: true })

            // Execute - mock file object directly
            const mockFile = {
                name: 'test.csv',
                text: vi.fn().mockResolvedValue('csv content'),
            }
            const result = await marksService.processFile(mockFile as any, 'Group1')

            // Verify
            expect(mockParseMarksCSV).toHaveBeenCalled()
            expect(studentsRepository.bulkPut).toHaveBeenCalled()
            expect(tasksRepository.bulkPut).toHaveBeenCalled()
            expect(marksRepository.bulkSaveSafe).toHaveBeenCalled()

            expect(result.newMarksCount).toBe(1)
            expect(result.skippedMarksCount).toBe(0)
            expect(result.updatedMarksCount).toBe(0)
        })
    })

    describe('deleteMarks', () => {
        it('should call repository deleteMarks', async () => {
            await marksService.deleteMarks(['m1', 'm2'])
            expect(marksRepository.deleteMarks).toHaveBeenCalledWith(['m1', 'm2'])
        })
    })

    describe('createGroup', () => {
        it('should generate an ID if missing and call repository.add', async () => {
            const groupData: Partial<Group> = { name: 'New Group' }
            const result = await marksService.createGroup(groupData)

            expect(result.id).toBeDefined()
            expect(result.name).toBe('New Group')
            expect(groupsRepository.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Group',
                    id: result.id,
                }),
            )
        })

        it('should use existing ID if provided', async () => {
            const groupData: Partial<Group> = { id: 'existing-id', name: 'Existing Group' }
            const result = await marksService.createGroup(groupData as Group)

            expect(result.id).toBe('existing-id')
            expect(groupsRepository.add).toHaveBeenCalledWith(groupData)
        })
    })

    describe('loadGroups', () => {
        it('should return groups sorted naturally', async () => {
            const unsortedGroups = [
                { name: 'Group 10' },
                { name: 'Group 2' },
                { name: 'Group 1' },
            ] as Group[]
            ;(groupsRepository.getAll as any).mockResolvedValue(unsortedGroups)

            const result = await marksService.loadGroups()

            expect(result).toHaveLength(3)
            expect(result[0]?.name).toBe('Group 1')
            expect(result[1]?.name).toBe('Group 2')
            expect(result[2]?.name).toBe('Group 10')
        })
    })

    // ─── saveManualMark ────────────────────────────────────────────────────

    describe('saveManualMark', () => {
        it('calls marksRepository.saveMark with the correct fields', async () => {
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([])
            ;(marksRepository.saveMark as any).mockResolvedValue({
                id: 'new',
                isNew: true,
                updated: false,
            })

            await marksService.saveManualMark({
                groupName: 'G1',
                studentId: 's1',
                taskId: 't1',
                score: 85,
            })

            expect(marksRepository.saveMark).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: 't1',
                    studentId: 's1',
                    groupName: 'G1',
                    score: 85,
                    value: 85,
                    synced: false,
                }),
            )
        })

        it('includes maxPoints from the matching task when found', async () => {
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([
                { id: 't2', name: 'Task 2', normalizedName: 't2', maxPoints: 100 },
            ])
            ;(marksRepository.saveMark as any).mockResolvedValue({
                id: 'new',
                isNew: true,
                updated: false,
            })

            await marksService.saveManualMark({
                groupName: 'G1',
                studentId: 's1',
                taskId: 't2',
                score: 70,
            })

            expect(marksRepository.saveMark).toHaveBeenCalledWith(
                expect.objectContaining({ maxPoints: 100 }),
            )
        })

        it('sets maxPoints to undefined when task is not found', async () => {
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([])
            ;(marksRepository.saveMark as any).mockResolvedValue({
                id: 'new',
                isNew: true,
                updated: false,
            })

            await marksService.saveManualMark({
                groupName: 'G1',
                studentId: 's1',
                taskId: 'unknown',
                score: 50,
            })

            expect(marksRepository.saveMark).toHaveBeenCalledWith(
                expect.objectContaining({ maxPoints: undefined }),
            )
        })

        it('returns the result from marksRepository.saveMark', async () => {
            ;(tasksRepository.getAllTasks as any).mockResolvedValue([])
            const mockResult = { id: 'mk1', isNew: true, updated: false }
            ;(marksRepository.saveMark as any).mockResolvedValue(mockResult)

            const result = await marksService.saveManualMark({
                groupName: 'G1',
                studentId: 's1',
                taskId: 't1',
                score: 60,
            })

            expect(result).toEqual(mockResult)
        })
    })

    // ─── toggleSynced ──────────────────────────────────────────────────────

    describe('toggleSynced', () => {
        it('flips synced from true to false', async () => {
            ;(marksRepository.updateMarkSynced as any).mockResolvedValue(undefined)

            const result = await marksService.toggleSynced({ id: 'm1', synced: true })

            expect(marksRepository.updateMarkSynced).toHaveBeenCalledWith('m1', false)
            expect(result).toBe(false)
        })

        it('flips synced from false to true', async () => {
            ;(marksRepository.updateMarkSynced as any).mockResolvedValue(undefined)

            const result = await marksService.toggleSynced({ id: 'm2', synced: false })

            expect(marksRepository.updateMarkSynced).toHaveBeenCalledWith('m2', true)
            expect(result).toBe(true)
        })

        it('flips undefined synced (falsy) to true', async () => {
            ;(marksRepository.updateMarkSynced as any).mockResolvedValue(undefined)

            const result = await marksService.toggleSynced({ id: 'm3', synced: undefined })

            expect(result).toBe(true)
        })

        it('returns undefined and does not call repository when id is missing', async () => {
            const result = await marksService.toggleSynced({ id: undefined as any, synced: true })

            expect(marksRepository.updateMarkSynced).not.toHaveBeenCalled()
            expect(result).toBeUndefined()
        })
    })

    // ─── loadMarksData ─────────────────────────────────────────────────────

    describe('loadMarksData', () => {
        it('calls getAllMarksWithRelations when groupName is null', async () => {
            ;(marksRepository.getAllMarksWithRelations as any).mockResolvedValue([])

            await marksService.loadMarksData(null)

            expect(marksRepository.getAllMarksWithRelations).toHaveBeenCalled()
            expect(marksRepository.getMarksByGroupWithRelations).not.toHaveBeenCalled()
        })

        it('calls getAllMarksWithRelations when called with no argument', async () => {
            ;(marksRepository.getAllMarksWithRelations as any).mockResolvedValue([])

            await marksService.loadMarksData()

            expect(marksRepository.getAllMarksWithRelations).toHaveBeenCalled()
        })

        it('calls getMarksByGroupWithRelations with the group name when provided', async () => {
            ;(marksRepository.getMarksByGroupWithRelations as any).mockResolvedValue([])

            await marksService.loadMarksData('CS-2024')

            expect(marksRepository.getMarksByGroupWithRelations).toHaveBeenCalledWith('CS-2024')
            expect(marksRepository.getAllMarksWithRelations).not.toHaveBeenCalled()
        })

        it('returns the flat marks from the repository', async () => {
            const mockMarks = [
                {
                    id: 'm1',
                    studentName: 'Alice',
                    groupName: 'G1',
                    taskName: 'T1',
                    taskDate: '',
                    createdAt: '',
                },
            ]
            ;(marksRepository.getAllMarksWithRelations as any).mockResolvedValue(mockMarks)

            const result = await marksService.loadMarksData()

            expect(result).toEqual(mockMarks)
        })
    })

    // ─── loadSuggestions ───────────────────────────────────────────────────

    describe('loadSuggestions', () => {
        it('returns unique meetIds from stored meets', async () => {
            ;(meetsRepository.getAllMeets as any).mockResolvedValue([
                { id: 'm1', meetId: 'abc-001', participants: [] },
                { id: 'm2', meetId: 'abc-001', participants: [] }, // duplicate
                { id: 'm3', meetId: 'abc-002', participants: [] },
            ])
            ;(settingsRepository.getTeachers as any).mockResolvedValue([])

            const { allMeetIds } = await marksService.loadSuggestions()

            expect(allMeetIds).toHaveLength(2)
            expect(allMeetIds).toEqual(expect.arrayContaining(['abc-001', 'abc-002']))
        })

        it('returns unique teachers from settings', async () => {
            ;(meetsRepository.getAllMeets as any).mockResolvedValue([])
            ;(settingsRepository.getTeachers as any).mockResolvedValue([
                'Prof. A',
                'Prof. B',
                'Prof. A',
            ])

            const { allTeachers } = await marksService.loadSuggestions()

            expect(allTeachers).toHaveLength(2)
            expect(allTeachers).toEqual(expect.arrayContaining(['Prof. A', 'Prof. B']))
        })

        it('filters out falsy meetIds', async () => {
            ;(meetsRepository.getAllMeets as any).mockResolvedValue([
                { id: 'm1', meetId: '', participants: [] },
                { id: 'm2', meetId: null, participants: [] },
                { id: 'm3', meetId: 'valid-001', participants: [] },
            ])
            ;(settingsRepository.getTeachers as any).mockResolvedValue([])

            const { allMeetIds } = await marksService.loadSuggestions()

            expect(allMeetIds).toEqual(['valid-001'])
        })

        it('returns empty arrays when no meets or teachers exist', async () => {
            ;(meetsRepository.getAllMeets as any).mockResolvedValue([])
            ;(settingsRepository.getTeachers as any).mockResolvedValue([])

            const result = await marksService.loadSuggestions()

            expect(result.allMeetIds).toEqual([])
            expect(result.allTeachers).toEqual([])
        })
    })
})
