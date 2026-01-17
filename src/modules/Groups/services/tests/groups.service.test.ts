import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupsService } from '../groups.service';
import { groupsRepository } from '../groups.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import type { Group } from '../../types/groups';
import type { Member } from '@Students/types/students';
import type { Task, Mark } from '@Marks/types/marks';
import type { Meet } from '@Analytics/types/analytics';

// Mock Worker globally for JSDOM
if (typeof Worker === 'undefined') {
    (globalThis as any).Worker = class {
        constructor() { }
        postMessage() { }
        onmessage() { }
        terminate() { }
    };
}

// Mock repositories
vi.mock('../groups.repository');
vi.mock('../../../Analytics/services/meets.repository');
vi.mock('../../../Students/services/students.repository');
vi.mock('../../../Marks/services/tasks.repository');
vi.mock('../../../Marks/services/marks.repository');
vi.mock('@/shared/services/settings.repository');
vi.mock('@/workers/groups.worker?worker', () => ({
    default: class MockWorker { }
}));

const { mockProcessGroupsData } = vi.hoisted(() => ({
    mockProcessGroupsData: vi.fn()
}));

vi.mock('comlink', () => ({
    wrap: vi.fn(() => ({
        processGroupsData: mockProcessGroupsData
    })),
    expose: vi.fn()
}));

describe('GroupsService', () => {
    let service: GroupsService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new GroupsService();
    });

    describe('loadGroupsData', () => {
        it('should fetch data and delegate processing to worker', async () => {
            // Setup Mocks for Repositories
            const mockGroups = [{ id: 'g1', name: 'Group1' }] as Group[];
            const mockMeets = [{ meetId: 'm1' }] as Meet[];
            const mockMembers = [{ name: 'Alice' }] as Member[];
            const mockTeacherList = ['Teacher1'];
            const mockTasks = [{ id: 't1' }] as Task[];
            const mockMarks = [{ score: 90 }] as Mark[];

            (groupsRepository.getGroups as any).mockResolvedValue(mockGroups);
            (meetsRepository.getAllMeets as any).mockResolvedValue(mockMeets);
            (studentsRepository.getAllMembers as any).mockResolvedValue(mockMembers);
            (settingsRepository.getTeachers as any).mockResolvedValue(mockTeacherList);
            (tasksRepository.getAllTasks as any).mockResolvedValue(mockTasks);
            (marksRepository.getAllMarks as any).mockResolvedValue(mockMarks);

            // Mock Worker Response
            const mockWorkerResult = {
                groups: [{ name: 'Group1', avgMark: 5 }] as any[],
                memberCounts: { 'Group1': 1 },
                allMeetIds: ['m1'],
                allTeachers: ['Teacher1'],
                teacherSet: new Set(['Teacher1'])
            };
            mockProcessGroupsData.mockResolvedValue(mockWorkerResult);

            // Execute
            const result = await service.loadGroupsData();

            // Verify Repository Calls
            expect(groupsRepository.getGroups).toHaveBeenCalled();
            expect(meetsRepository.getAllMeets).toHaveBeenCalled();

            // Verify Worker Call
            expect(mockProcessGroupsData).toHaveBeenCalledWith(
                mockGroups,
                mockMeets,
                mockMembers,
                mockTeacherList,
                mockTasks,
                mockMarks
            );

            // Verify Result passed through
            expect(result).toEqual(mockWorkerResult);
        });
    });

    describe('saveGroup', () => {
        it('should validate and save', async () => {
            await service.saveGroup({ meetId: 'm_new', name: 'New Group', color: '#000' });
            expect(groupsRepository.saveGroup).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Group',
                meetId: 'm_new'
            }));
        });

        it('should throw on validation error', async () => {
            await expect(service.saveGroup({ name: 'NoMeetId', color: '#000' } as any))
                .rejects.toThrow('Name and Meet ID are required');
        });
    });
});
