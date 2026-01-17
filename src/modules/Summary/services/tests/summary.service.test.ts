import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summaryService } from '../summary.service';
import type { WorkerSummaryResult } from '../../types/summary';
import { studentsRepository } from '@Students/services/students.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import { finalAssessmentsRepository } from '../finalAssessments.repository';
import type { Group } from '@Groups/types/groups';
import type { Member } from '@Students/types/students';
import type { Task, Mark } from '@Marks/types/marks';
import type { Meet } from '@Analytics/types/analytics';
import type { FinalAssessment } from '../../types/summary';

// Mock Worker globally for JSDOM
if (typeof Worker === 'undefined') {
    (globalThis as any).Worker = class {
        constructor() { }
        postMessage() { }
        onmessage() { }
        terminate() { }
    };
}

// Mocks
vi.mock('../../../Students/services/students.repository');
vi.mock('../../../Marks/services/tasks.repository');
vi.mock('../../../Marks/services/marks.repository');
vi.mock('../../../Analytics/services/meets.repository');
vi.mock('../../../Groups/services/groups.repository');
vi.mock('@/shared/services/settings.repository');
vi.mock('../finalAssessments.repository');

const { mockCalculateSummary } = vi.hoisted(() => ({
    mockCalculateSummary: vi.fn()
}));

vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        calculateSummary: mockCalculateSummary
    }),
    expose: vi.fn()
}));

describe('SummaryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockGroup = { name: 'G1', meetId: 'm1' } as Group;
    const mockOptions = {
        t: (key: string) => key,
        modules: [],
        completionThreshold: 70,
        attendanceThreshold: 60,
        attendanceEnabled: true,
        gradeFormat: '5-scale',
        requiredTasks: 0,
        assessmentType: 'examination'
    };

    it('should return empty arrays if no group provided', async () => {
        const result = await summaryService.loadExamData(null as any, mockOptions as any);
        expect(result.students).toEqual([]);
    });

    it('should load data and delegate processing to worker', async () => {
        // Setup Mocks
        const mockStudents = [{ id: 's1', name: 'Alice', role: 'student', groupName: 'G1' }] as Member[];
        const mockTasks = [{ id: 't1', groupName: 'G1', name: 'Task1' }] as Task[];
        const mockMarks = [{ id: 'm1', studentId: 's1', taskId: 't1', score: 10 }] as Mark[];
        const mockMeets = [{ id: 'meet1', meetId: 'm1' }] as Meet[];
        const mockGroupsMap = { 'm1': mockGroup };
        const mockDurationLimit = 60;
        const mockAssessments = [] as FinalAssessment[];

        const modules = [{ name: 'Mod1', id: 1, groupId: 'G1', groupName: 'G1' }];

        (studentsRepository.getMembersByGroup as any).mockResolvedValue(mockStudents);
        (tasksRepository.getTasksByGroup as any).mockResolvedValue(mockTasks);
        (marksRepository.getMarksByGroup as any).mockResolvedValue(mockMarks);
        (meetsRepository.getMeetsByMeetId as any).mockResolvedValue(mockMeets);
        (groupsRepository.getGroupMap as any).mockResolvedValue(mockGroupsMap);
        (settingsRepository as any).getDurationLimit = vi.fn().mockResolvedValue(mockDurationLimit);
        (finalAssessmentsRepository.getAllFinalAssessments as any).mockResolvedValue(mockAssessments);

        // Reset and configure the mock for this specific test
        mockCalculateSummary.mockClear();
        mockCalculateSummary.mockResolvedValueOnce([
            {
                id: 's1',
                stats: {
                    completionExact: 100,
                    completedRegularTasks: 1,
                    effectiveTotal: 1,
                    attendance: { percentage: 100, attendedMeets: 1, totalMeets: 1, attendedDuration: 3600 },
                    modules: { moduleGrades: { 'Mod1': 5 }, total: 5, moduleDetailsData: {}, isAutomaticCandidate: true },
                    averageMark: 5
                }
            }
        ] as WorkerSummaryResult[]);

        const { students } = await summaryService.loadExamData(mockGroup, { ...mockOptions, modules });

        // Verify Delegation
        expect(mockCalculateSummary).toHaveBeenCalled();

        expect(students).toHaveLength(1);
        const alice = students[0];
        if (!alice) throw new Error('Alice not found');
        expect(alice.moduleGrades['Mod1']).toBe(5);
        expect(alice.status).toBe('automatic');
    });
});
