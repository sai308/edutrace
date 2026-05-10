import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Mark, Task } from '@Marks/types/marks'
import type { Member } from '@Students/types/students'
import type { FinalAssessment, WorkerSummaryResult } from '../../types/summary'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { marksRepository } from '@Marks/services/marks.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unitsRepository } from '@/modules/Units/services/units.repository'
import { settingsRepository } from '@/shared/services/settings.repository'
import { finalAssessmentsRepository } from '../finalAssessments.repository'
import { summaryService } from '../summary.service'

// Mock Worker globally for JSDOM
if (typeof Worker === 'undefined') {
    ;(globalThis as any).Worker = class {
        constructor() {}
        postMessage() {}
        onmessage() {}
        terminate() {}
    }
}

// Mocks
vi.mock('../../../Students/services/students.repository')
vi.mock('../../../Tasks/services/tasks.repository')
vi.mock('../../../Marks/services/marks.repository')
vi.mock('../../../Analytics/services/meets.repository')
vi.mock('../../../Groups/services/groups.repository')
vi.mock('@/shared/services/settings.repository')
vi.mock('../finalAssessments.repository')

const { mockCalculateSummary } = vi.hoisted(() => ({
    mockCalculateSummary: vi.fn(),
}))

vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        setDebug: vi.fn().mockResolvedValue(undefined),
        calculateSummary: mockCalculateSummary,
    }),
    expose: vi.fn(),
}))

vi.mock('@/modules/Units/services/units.repository')

describe('summaryService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockGroup = { name: 'G1', meetId: 'm1' } as Group
    const mockOptions = {
        t: (key: string) => key,
        modules: [],
        completionThreshold: 70,
        attendanceThreshold: 60,
        attendanceEnabled: true,
        gradeFormat: '5-scale',
        requiredTasks: 0,
        assessmentType: 'examination',
    }

    it('should return empty arrays if no group provided', async () => {
        const result = await summaryService.loadExamData(null as any, mockOptions as any)
        expect(result.students).toEqual([])
    })

    it('should load data and delegate processing to worker', async () => {
        // Setup Mocks
        const mockStudents = [{ id: 's1', name: 'Alice', role: 'student', groupName: 'G1' }] as Member[]
        const mockTasks = [{ id: 't1', normalizedName: 'task1', name: 'Task1' }] as unknown as Task[]
        const mockMarks = [{ id: 'm1', studentId: 's1', taskId: 't1', score: 10 }] as Mark[]
        const mockMeets = [{ id: 'meet1', meetId: 'm1' }] as Meet[]
        const mockGroupsMap = { m1: mockGroup }
        const mockDurationLimit = 60
        const mockAssessments = [] as FinalAssessment[]

        const modules = [{ name: 'Mod1', id: 1, groupId: 'G1', groupName: 'G1' }]

        ;(studentsRepository.getMembersByGroup as any).mockResolvedValue(mockStudents)
        ;(tasksRepository.getAllTasks as any).mockResolvedValue(mockTasks)
        ;(marksRepository.getMarksByGroup as any).mockResolvedValue(mockMarks)
        ;(meetsRepository.getMeetsByMeetId as any).mockResolvedValue(mockMeets)
        ;(groupsRepository.getGroupMap as any).mockResolvedValue(mockGroupsMap)
        ;(settingsRepository as any).getDurationLimit = vi.fn().mockResolvedValue(mockDurationLimit)
        ;(finalAssessmentsRepository.getFinalAssessmentsByType as any).mockResolvedValue(mockAssessments)

        // Reset and configure the mock for this specific test
        mockCalculateSummary.mockClear()
        mockCalculateSummary.mockResolvedValueOnce([
            {
                id: 's1',
                stats: {
                    completionExact: 100,
                    completedRegularTasks: 1,
                    effectiveTotal: 1,
                    attendance: {
                        percentage: 100,
                        attendedMeets: 1,
                        totalMeets: 1,
                        attendedDuration: 3600,
                    },
                    modules: {
                        moduleGrades: { Mod1: 5 },
                        total: 5,
                        totalRaw: 5,
                        moduleDetailsData: {},
                        totalPartial: false,
                    },
                    averageMark: 5,
                },
            },
        ] as WorkerSummaryResult[])

        const { students } = await summaryService.loadExamData(mockGroup, {
            ...mockOptions,
            modules,
        })

        // Verify Delegation
        expect(mockCalculateSummary).toHaveBeenCalled()

        expect(students).toHaveLength(1)
        const alice = students[0]
        if (!alice)
            throw new Error('Alice not found')
        expect(alice.moduleGrades.Mod1).toBe(5)
        expect(alice.status).toBe('automatic')
    })

    // ─── getModulesByGroup ─────────────────────────────────────────────────

    describe('getModulesByGroup', () => {
        it('returns an empty array when no units are stored', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([])

            const result = await summaryService.getModulesByGroup('G1')

            expect(result).toEqual([])
        })

        it('converts each unit to a module shape', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([
                {
                    id: 1,
                    name: 'Module Alpha',
                    normalizedName: 'modulealpha',
                    taskIds: ['t1', 't2'],
                    testTaskId: 'tt1',
                    taskCoef: 2,
                    testCoef: 3,
                    ordinal: 1,
                },
            ])

            const result = await summaryService.getModulesByGroup('CS-2024')

            expect(result).toHaveLength(1)
            const mod = result[0]!
            expect(mod.name).toBe('Module Alpha')
            expect(mod.groupId).toBe('CS-2024')
            expect(mod.groupName).toBe('CS-2024')
            expect(mod.tasksCoefficient).toBe(2)
            expect(mod.testCoefficient).toBe(3)
        })

        it('maps taskIds to task stub objects with id', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([
                {
                    id: 2,
                    name: 'Mod B',
                    normalizedName: 'modb',
                    taskIds: ['t3', 't4'],
                    testTaskId: null,
                    taskCoef: 1,
                    testCoef: 1,
                },
            ])

            const result = await summaryService.getModulesByGroup('G2')
            const mod = result[0]!

            expect((mod as any).tasks).toHaveLength(2)
            expect((mod as any).tasks[0].id).toBe('t3')
            expect((mod as any).tasks[1].id).toBe('t4')
        })

        it('sets test to undefined when testTaskId is null', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([
                {
                    id: 3,
                    name: 'No Test Mod',
                    normalizedName: 'notestmod',
                    taskIds: [],
                    testTaskId: null,
                    taskCoef: 1,
                    testCoef: 1,
                },
            ])

            const result = await summaryService.getModulesByGroup('G3')
            expect((result[0] as any).test).toBeUndefined()
        })

        it('sets test to {id} when testTaskId is provided', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([
                {
                    id: 4,
                    name: 'With Test Mod',
                    normalizedName: 'withtestmod',
                    taskIds: [],
                    testTaskId: 'test-task-id',
                    taskCoef: 1,
                    testCoef: 1,
                },
            ])

            const result = await summaryService.getModulesByGroup('G4')
            expect((result[0] as any).test).toEqual({ id: 'test-task-id' })
        })

        it('defaults tasksCoefficient to 1 when taskCoef is falsy', async () => {
            ;(unitsRepository.getAllUnits as any).mockResolvedValue([
                {
                    id: 5,
                    name: 'Zero Coef Mod',
                    normalizedName: 'zerocoefmod',
                    taskIds: [],
                    testTaskId: null,
                    taskCoef: 0,
                    testCoef: 0,
                },
            ])

            const result = await summaryService.getModulesByGroup('G5')
            expect((result[0] as any).tasksCoefficient).toBe(1)
            expect((result[0] as any).testCoefficient).toBe(1)
        })
    })

    // ─── saveModule / deleteModule ─────────────────────────────────────────

    describe('saveModule', () => {
        it('throws "Not implemented. Define Units instead."', async () => {
            await expect(summaryService.saveModule({} as any)).rejects.toThrow('Not implemented. Define Units instead.')
        })
    })

    describe('deleteModule', () => {
        it('throws "Not implemented. Delete Units instead."', async () => {
            await expect(summaryService.deleteModule('any-id')).rejects.toThrow(
                'Not implemented. Delete Units instead.',
            )
        })
    })

    // ─── getTasksByGroup ───────────────────────────────────────────────────

    describe('getTasksByGroup', () => {
        it('returns all tasks regardless of the groupName argument', async () => {
            const mockTasks = [
                { id: 't1', name: 'Task 1', normalizedName: 'task1', maxPoints: 10 },
                { id: 't2', name: 'Task 2', normalizedName: 'task2', maxPoints: 20 },
            ] as unknown as Task[]
            ;(tasksRepository.getAllTasks as any).mockResolvedValue(mockTasks)

            const result = await summaryService.getTasksByGroup('irrelevant-group')

            expect(result).toEqual(mockTasks)
            expect(tasksRepository.getAllTasks).toHaveBeenCalled()
        })
    })

    // ─── Delegation methods ────────────────────────────────────────────────

    describe('getGroups', () => {
        it('delegates to groupsRepository.getAll', async () => {
            const mockGroups = [{ id: 'g1', name: 'G1', meetId: 'm1' }] as Group[]
            ;(groupsRepository.getAll as any).mockResolvedValue(mockGroups)

            const result = await summaryService.getGroups()

            expect(groupsRepository.getAll).toHaveBeenCalled()
            expect(result).toEqual(mockGroups)
        })
    })

    describe('getExamSettings', () => {
        it('delegates to settingsRepository.getExamSettings', async () => {
            const mockSettings = { subject: 'Math' }
            ;(settingsRepository.getExamSettings as any).mockResolvedValue(mockSettings)

            const result = await summaryService.getExamSettings()

            expect(settingsRepository.getExamSettings).toHaveBeenCalled()
            expect(result).toEqual(mockSettings)
        })
    })

    describe('saveExamSettings', () => {
        it('delegates to settingsRepository.saveExamSettings', async () => {
            ;(settingsRepository.saveExamSettings as any).mockResolvedValue(undefined)

            await summaryService.saveExamSettings({ subject: 'Physics' })

            expect(settingsRepository.saveExamSettings).toHaveBeenCalledWith({ subject: 'Physics' })
        })
    })

    describe('getMembersByGroup', () => {
        it('delegates to studentsRepository.getMembersByGroup', async () => {
            const mockMembers = [{ id: 's1', name: 'Alice', role: 'student', groupName: 'G1' }] as Member[]
            ;(studentsRepository.getMembersByGroup as any).mockResolvedValue(mockMembers)

            const result = await summaryService.getMembersByGroup('G1')

            expect(studentsRepository.getMembersByGroup).toHaveBeenCalledWith('G1')
            expect(result).toEqual(mockMembers)
        })
    })

    describe('getAllFinalAssessments', () => {
        it('delegates to finalAssessmentsRepository.getAllFinalAssessments', async () => {
            const mockAssessments: FinalAssessment[] = [{ id: 1, studentId: 's1', assessmentType: 'exam', value: 90 }]
            ;(finalAssessmentsRepository.getAllFinalAssessments as any).mockResolvedValue(mockAssessments)

            const result = await summaryService.getAllFinalAssessments()

            expect(finalAssessmentsRepository.getAllFinalAssessments).toHaveBeenCalled()
            expect(result).toEqual(mockAssessments)
        })
    })

    describe('saveFinalAssessment', () => {
        it('delegates to finalAssessmentsRepository.saveFinalAssessment', async () => {
            const assessment = { studentId: 's1', assessmentType: 'exam', value: 85 }
            ;(finalAssessmentsRepository.saveFinalAssessment as any).mockResolvedValue({
                id: 1,
                isNew: true,
                updated: false,
            })

            await summaryService.saveFinalAssessment(assessment as any)

            expect(finalAssessmentsRepository.saveFinalAssessment).toHaveBeenCalledWith(assessment)
        })
    })

    describe('getFinalAssessmentByStudent', () => {
        it('delegates to finalAssessmentsRepository.getFinalAssessmentByStudent', async () => {
            ;(finalAssessmentsRepository.getFinalAssessmentByStudent as any).mockResolvedValue(undefined)

            await summaryService.getFinalAssessmentByStudent('s1', 'exam')

            expect(finalAssessmentsRepository.getFinalAssessmentByStudent).toHaveBeenCalledWith('s1', 'exam')
        })
    })

    describe('deleteFinalAssessment', () => {
        it('delegates to finalAssessmentsRepository.deleteFinalAssessment', async () => {
            ;(finalAssessmentsRepository.deleteFinalAssessment as any).mockResolvedValue(undefined)

            await summaryService.deleteFinalAssessment(42)

            expect(finalAssessmentsRepository.deleteFinalAssessment).toHaveBeenCalledWith(42)
        })
    })
})
