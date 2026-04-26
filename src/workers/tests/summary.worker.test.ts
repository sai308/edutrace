import { describe, it, expect } from 'vitest'
import { workerForTesting } from '../summary.worker.js'

describe('summary.worker.js', () => {
    describe('calculateSummary', () => {
        const mockMembers = [{ id: 's1', name: 'Alice', groupName: 'G1' }]

        it('should calculate complete module grade with tasks + test', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 10 },
                { id: 'm2', studentId: 's1', taskId: 't2', score: 5 }, // test
            ]
            const mockMeets = [
                {
                    id: 'meet1',
                    participants: [
                        { name: 'Alice', duration: 1800 },
                        { name: 'Bob', duration: 3600 },
                    ],
                },
            ]
            const mockTasks = [
                { id: 't1', maxPoints: 10 },
                { id: 't2', maxPoints: 10 },
            ]
            const mockModules = [
                {
                    id: 1,
                    name: 'Module A',
                    test: { id: 't2' },
                    tasks: [{ id: 't1' }],
                    minTasksRequired: 1,
                },
            ]
            const mockOptions = {
                durationLimitSeconds: 3600,
                gradeFormat: '5-scale',
                requiredTasks: 1,
            }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            expect(result).toHaveLength(1)
            const stats = result[0].stats

            // Attendance
            expect(stats.attendance.percentage).toBe(50)
            expect(stats.attendance.attendedMeets).toBe(1)

            // Completion
            expect(stats.completionExact).toBe(100)

            // Grades: task=100%, test=50% -> (100+50)/2 = 75% -> 4 in 5-scale
            expect(stats.modules.moduleGrades['Module A']).toBe(4)
            expect(stats.modules.total).toBe(4)
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('complete')
        })

        it('should return partial grade (~) when test is missing', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 10 }, // Only task, no test
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 10 },
                { id: 't2', maxPoints: 10 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: '5-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // Task only: 100% -> 5 in 5-scale, but partial because missing test
            expect(stats.modules.moduleGrades['Module A']).toBe('~5')
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('partial')
            expect(stats.modules.moduleDetailsData['Module A'].missingTest).toBe(true)
            // Total is also partial
            expect(typeof stats.modules.total).toBe('string')
            expect((stats.modules.total as string).startsWith('~')).toBe(true)
        })

        it('should return partial grade (~) when some tasks are missing', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 80 },
                // t2 missing
                { id: 'm3', studentId: 's1', taskId: 't3', score: 70 }, // test
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', name: 'Lab 1', maxPoints: 100 },
                { id: 't2', name: 'Lab 2', maxPoints: 100 },
                { id: 't3', name: 'Test', maxPoints: 100 },
            ]
            const mockModules = [
                {
                    id: 1,
                    name: 'Module A',
                    test: { id: 't3' },
                    tasks: [{ id: 't1' }, { id: 't2' }],
                },
            ]
            const mockOptions = { gradeFormat: '100-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // partial: missing t2 (Lab 2), avg of completed tasks: 80%
            // (80 * 1 + 70 * 1) / 2 = 75% -> 75 in 100-scale
            expect(stats.modules.moduleGrades['Module A']).toBe('~75')
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('partial')
            expect(stats.modules.moduleDetailsData['Module A'].missingTasks).toEqual(['Lab 2'])
        })

        it('should return empty (null) when no tasks or test completed', () => {
            const mockMarks: any[] = [] // no marks at all
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: '5-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            expect(stats.modules.moduleGrades['Module A']).toBeNull()
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('empty')
            expect(stats.modules.total).toBeNull()
        })

        it('should return partial grade when only test is done (no tasks)', () => {
            const mockMarks = [
                { id: 'm2', studentId: 's1', taskId: 't2', score: 10 }, // Only test
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 10 },
                { id: 't2', maxPoints: 10 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: '5-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // test=100% -> 5 in 5-scale, partial because no tasks
            expect(stats.modules.moduleGrades['Module A']).toBe('~5')
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('partial')
            expect(stats.modules.moduleDetailsData['Module A'].missingTasks.length).toBe(1)
        })

        it('should mark total as partial when any module is partial', () => {
            const mockMarks = [
                // Module A: complete (task + test)
                { id: 'm1', studentId: 's1', taskId: 't1', score: 80 },
                { id: 'm2', studentId: 's1', taskId: 't2', score: 70 },
                // Module B: partial (task only, no test)
                { id: 'm3', studentId: 's1', taskId: 't3', score: 90 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
                { id: 't3', maxPoints: 100 },
                { id: 't4', maxPoints: 100 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
                { id: 2, name: 'Module B', test: { id: 't4' }, tasks: [{ id: 't3' }] },
            ]
            const mockOptions = { gradeFormat: '100-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // Module A: complete -> 75
            expect(stats.modules.moduleGrades['Module A']).toBe(75)
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('complete')
            // Module B: partial (missing test)
            expect(typeof stats.modules.moduleGrades['Module B']).toBe('string')
            expect((stats.modules.moduleGrades['Module B'] as string).startsWith('~')).toBe(true)
            // Total should be partial
            expect(typeof stats.modules.total).toBe('string')
            expect((stats.modules.total as string).startsWith('~')).toBe(true)
            expect(stats.modules.totalPartial).toBe(true)
        })

        it('should correctly format ECTS grades', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 90 },
                { id: 'm2', studentId: 's1', taskId: 't2', score: 90 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: 'ects', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            expect(stats.modules.total).toBe('A') // 90% ECTS = A
        })

        it('should use mark.value when mark.score is undefined', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', value: 80 },
                { id: 'm2', studentId: 's1', taskId: 't2', value: 90 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: '5-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            expect(stats.modules.moduleGrades['Module A']).toBe(4) // 85% -> 4
            expect(stats.modules.total).toBe(4)
        })

        it('should handle mixed ID types (number vs string)', () => {
            const numericMembers = [{ id: 42, name: 'Bob', groupName: 'G1' }]
            const mockMarks = [
                { id: 'm1', studentId: '42', taskId: 't1', score: 10 },
                { id: 'm2', studentId: '42', taskId: 't2', score: 5 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 10 },
                { id: 't2', maxPoints: 10 },
            ]
            const mockModules = [
                { id: 1, name: 'Module A', test: { id: 't2' }, tasks: [{ id: 't1' }] },
            ]
            const mockOptions = { gradeFormat: '5-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                numericMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            expect(result).toHaveLength(1)
            const stats = result[0].stats
            expect(stats.completionExact).toBe(100)
            expect(stats.modules.moduleGrades['Module A']).toBeDefined()
        })

        it('should handle testTaskId also present in taskIds array', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 80 },
                { id: 'm2', studentId: 's1', taskId: 't2', score: 90 },
                { id: 'm3', studentId: 's1', taskId: 't3', score: 74 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
                { id: 't3', maxPoints: 100 },
            ]
            // test id 't3' is ALSO in the tasks array
            const mockModules = [
                {
                    id: 1,
                    name: 'Module A',
                    test: { id: 't3' },
                    tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
                },
            ]
            const mockOptions = { gradeFormat: '100-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // t3 treated as test (74%), t1 and t2 as tasks
            // avg tasks: (80+90)/2=85, grade: (85+74)/2=79.5 -> 80
            expect(stats.modules.moduleGrades['Module A']).toBe(80)
            expect(stats.modules.total).toBe(80)
        })

        it('should handle module without test configured', () => {
            const mockMarks = [
                { id: 'm1', studentId: 's1', taskId: 't1', score: 80 },
                { id: 'm2', studentId: 's1', taskId: 't2', score: 90 },
            ]
            const mockMeets: any[] = []
            const mockTasks = [
                { id: 't1', maxPoints: 100 },
                { id: 't2', maxPoints: 100 },
            ]
            // No test configured
            const mockModules = [
                { id: 1, name: 'Module A', test: null, tasks: [{ id: 't1' }, { id: 't2' }] },
            ]
            const mockOptions = { gradeFormat: '100-scale', requiredTasks: 0 }

            const result = workerForTesting.calculateSummary(
                mockMembers,
                mockMarks,
                mockMeets,
                mockTasks,
                mockModules,
                mockOptions,
            )

            const stats = result[0].stats
            // No test -> tasks-only avg: (80+90)/2=85
            expect(stats.modules.moduleGrades['Module A']).toBe(85)
            expect(stats.modules.moduleDetailsData['Module A'].type).toBe('complete')
        })
    })
})
