import { tasksRepository } from '@Tasks/services/tasks.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler.js'
import { marksRepository } from '../marks.repository'
import { MarksReconciler } from './MarksReconciler'

// Mock dependencies
vi.mock('@Tasks/services/tasks.repository', () => ({
    tasksRepository: {
        getAllTasks: vi.fn(),
    },
}))

vi.mock('../marks.repository', () => ({
    marksRepository: {
        getAllMarks: vi.fn(),
    },
}))

// Mock IdentityReconciler module
vi.mock('@/shared/services/reconciliation/IdentityReconciler.js')

vi.mock('uuid', () => ({
    v4: () => 'new-uuid',
}))

describe('marksReconciler', () => {
    let reconciler

    beforeEach(() => {
        // Setup IdentityReconciler mock implementation
        // eslint-disable-next-line prefer-arrow-callback
        IdentityReconciler.mockImplementation(function () {
            return {
                resolveIdentities: vi.fn().mockImplementation(async (students) => {
                    return students.map((s, i) => ({
                        ...s,
                        id: s.expectedId || `student-${i}`,
                        isNew: !s.expectedId,
                    }))
                }),
            }
        })

        reconciler = new MarksReconciler()
        vi.clearAllMocks()
    })

    it('should reconcile everything correctly', async () => {
        const groupName = 'Group A'

        // 1. Setup Data
        const parsedData = {
            groupName,
            tasks: [
                { name: 'Task 1', date: '2023-10-01', maxPoints: 10 }, // Existing
                { name: 'Task 2', date: '2023-10-02', maxPoints: 10 }, // New
            ],
            studentsData: [
                {
                    student: { name: 'Student 1', expectedId: 's1' },
                    marks: [
                        { taskIndex: 0, score: 5 }, // Update existing
                        { taskIndex: 1, score: 8 }, // Create new
                    ],
                },
            ],
        }

        // 2. Mock Repositories — Tasks are now global (no groupName)
        tasksRepository.getAllTasks.mockResolvedValue([
            { id: 't1', name: 'Task 1', normalizedName: 'task1', date: '2023-10-01', maxPoints: 10 },
        ])

        marksRepository.getAllMarks.mockResolvedValue([
            { id: 'm1', taskId: 't1', studentId: 's1', score: 4, groupName: 'Group A' },
        ])

        // 3. Execute
        const result = await reconciler.reconcile(parsedData, groupName)

        // 4. Assertions

        // Students
        expect(result.students).toHaveLength(1)
        expect(result.students[0].id).toBe('s1')

        // Tasks — no groupName on task objects
        expect(result.tasks).toHaveLength(2)
        // Task 1 (Existing)
        expect(result.tasks[0].id).toBe('t1')
        expect(result.tasks[0].name).toBe('Task 1')
        expect(result.tasks[0].groupName).toBeUndefined()
        // Task 2 (New)
        expect(result.tasks[1].id).toBe('new-uuid')
        expect(result.tasks[1].name).toBe('Task 2')
        expect(result.tasks[1].normalizedName).toBe('task2')
        expect(result.tasks[1].groupName).toBeUndefined()

        // Marks — groupName on the mark, not the task
        expect(result.marks).toHaveLength(2)

        // Mark 1: Existing (updated score from 4 to 5)
        const mark1 = result.marks.find(m => m.taskId === 't1')
        expect(mark1).toBeDefined()
        expect(mark1.id).toBe('m1')
        expect(mark1.studentId).toBe('s1')
        expect(mark1.score).toBe(5)
        expect(mark1.groupName).toBe('Group A')

        // Mark 2: New
        const mark2 = result.marks.find(m => m.taskId === 'new-uuid')
        expect(mark2).toBeDefined()
        expect(mark2.studentId).toBe('s1')
        expect(mark2.score).toBe(8)
        expect(mark2.id).toBe('new-uuid')
        expect(mark2.groupName).toBe('Group A')
    })

    it('should de-duplicate tasks across groups by normalizedName', async () => {
        const groupName = 'Group B'

        const parsedData = {
            groupName,
            tasks: [
                { name: 'Task 1', date: '2023-10-01', maxPoints: 10 }, // Already exists from Group A
            ],
            studentsData: [
                {
                    student: { name: 'Student 2', expectedId: 's2' },
                    marks: [{ taskIndex: 0, score: 7 }],
                },
            ],
        }

        // Task 1 was created by Group A import — no groupName on it
        tasksRepository.getAllTasks.mockResolvedValue([
            { id: 't1', name: 'Task 1', normalizedName: 'task1', date: '2023-10-01', maxPoints: 10 },
        ])

        marksRepository.getAllMarks.mockResolvedValue([])

        const result = await reconciler.reconcile(parsedData, groupName)

        // Task should be reused, not duplicated
        expect(result.tasks).toHaveLength(1)
        expect(result.tasks[0].id).toBe('t1')

        // New mark for Group B referencing the shared task
        expect(result.marks).toHaveLength(1)
        expect(result.marks[0].groupName).toBe('Group B')
        expect(result.marks[0].taskId).toBe('t1')
    })
})
