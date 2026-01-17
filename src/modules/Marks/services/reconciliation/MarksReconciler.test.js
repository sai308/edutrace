
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarksReconciler } from './MarksReconciler';
import { tasksRepository } from '../tasks.repository.js';
import { marksRepository } from '../marks.repository.js';
import { IdentityReconciler } from '@/shared/services/reconciliation/IdentityReconciler.js';

// Mock dependencies
vi.mock('../tasks.repository.js', () => ({
    tasksRepository: {
        getTasksByGroup: vi.fn(),
    }
}));

vi.mock('../marks.repository.js', () => ({
    marksRepository: {
        getAllMarks: vi.fn(),
    }
}));

// Mock IdentityReconciler module
vi.mock('@/shared/services/reconciliation/IdentityReconciler.js');

vi.mock('uuid', () => ({
    v4: () => 'new-uuid'
}));

describe('MarksReconciler', () => {
    let reconciler;

    beforeEach(() => {
        // Setup IdentityReconciler mock implementation
        IdentityReconciler.mockImplementation(function () {
            return {
                resolveIdentities: vi.fn().mockImplementation(async (students) => {
                    return students.map((s, i) => ({
                        ...s,
                        id: s.expectedId || `student-${i}`,
                        isNew: !s.expectedId
                    }));
                })
            };
        });

        reconciler = new MarksReconciler();
        vi.clearAllMocks();
    });

    it('should reconcile everything correctly', async () => {
        const groupName = 'Group A';

        // 1. Setup Data
        const parsedData = {
            groupName: groupName,
            tasks: [
                { name: 'Task 1', date: '2023-10-01', maxPoints: 10 }, // Existing
                { name: 'Task 2', date: '2023-10-02', maxPoints: 10 }  // New
            ],
            studentsData: [
                {
                    student: { name: 'Student 1', expectedId: 's1' },
                    marks: [
                        { taskIndex: 0, score: 5 }, // Update existing
                        { taskIndex: 1, score: 8 }  // Create new
                    ]
                }
            ]
        };

        // 2. Mock Repositories
        tasksRepository.getTasksByGroup.mockResolvedValue([
            { id: 't1', name: 'Task 1', date: '2023-10-01', groupName }
        ]);

        marksRepository.getAllMarks.mockResolvedValue([
            { id: 'm1', taskId: 't1', studentId: 's1', score: 4 }
        ]);

        // 3. Execute
        const result = await reconciler.reconcile(parsedData, groupName);

        // 4. Assertions

        // Students
        expect(result.students).toHaveLength(1);
        expect(result.students[0].id).toBe('s1');

        // Tasks
        expect(result.tasks).toHaveLength(2);
        // Task 1 (Existing)
        expect(result.tasks[0].id).toBe('t1');
        expect(result.tasks[0].name).toBe('Task 1');
        // Task 2 (New)
        expect(result.tasks[1].id).toBe('new-uuid');
        expect(result.tasks[1].name).toBe('Task 2');

        // Marks
        expect(result.marks).toHaveLength(2);

        // Mark 1: Existing (updated score from 4 to 5)
        const mark1 = result.marks.find(m => m.taskId === 't1');
        expect(mark1).toBeDefined();
        expect(mark1.id).toBe('m1');
        expect(mark1.studentId).toBe('s1');
        expect(mark1.score).toBe(5);

        // Mark 2: New
        const mark2 = result.marks.find(m => m.taskId === 'new-uuid');
        expect(mark2).toBeDefined();
        expect(mark2.studentId).toBe('s1');
        expect(mark2.score).toBe(8);
        expect(mark2.id).toBe('new-uuid');
    });
});
