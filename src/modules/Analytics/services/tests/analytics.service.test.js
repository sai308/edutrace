import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../analytics.service';
import { meetsRepository } from '../meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { settingsRepository } from '@/shared/services/settings.repository';

vi.mock('../meets.repository');
vi.mock('../../../Groups/services/groups.repository');
vi.mock('../../../Students/services/students.repository');
vi.mock('@/shared/services/settings.repository');

describe('AnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getGlobalStats', () => {
        it('should aggregate stats correctly', async () => {
            // Mock Data
            const meets = [
                {
                    meetId: 'm1',
                    date: '2023-01-01',
                    participants: [
                        { name: 'S1', duration: 10 },
                        { name: 'S2', duration: 20 }
                    ]
                }
            ];
            const groupsMap = {};
            const allStudents = [];
            const ignored = [];
            const teachers = [];

            // Mock Implementations
            meetsRepository.getAllMeets.mockResolvedValue(meets);
            groupsRepository.getGroupMap.mockResolvedValue(groupsMap);
            studentsRepository.getAllMembers.mockResolvedValue(allStudents);
            settingsRepository.getIgnoredUsers.mockResolvedValue(ignored);
            settingsRepository.getTeachers.mockResolvedValue(teachers);

            // Execute
            const result = await analyticsService.getGlobalStats();

            // Verify
            expect(result).toHaveLength(1);
            expect(result[0].meetId).toBe('m1');
            expect(result[0].totalSessions).toBe(1);
            expect(result[0].uniqueParticipantsCount).toBe(2);
            expect(result[0].activeParticipantsCount).toBe(2);
            expect(result[0].avgDuration).toBeCloseTo(0.33, 1); // 20 / 60
        });

        it('should respect groupsMap', async () => {
            // Mock Data
            const meets = [
                {
                    meetId: 'm1',
                    date: '2023-01-01',
                    participants: [
                        { name: 'S1', duration: 60 }
                    ]
                }
            ];
            const groupsMap = { 'm1': { name: 'G1', teacher: 'T1' } };
            // Group G1 has S1 and S2
            const allStudents = [
                { name: 'S1', groupName: 'G1', aliases: [] },
                { name: 'S2', groupName: 'G1', aliases: [] }
            ];

            meetsRepository.getAllMeets.mockResolvedValue(meets);
            groupsRepository.getGroupMap.mockResolvedValue(groupsMap);
            studentsRepository.getAllMembers.mockResolvedValue(allStudents);
            settingsRepository.getIgnoredUsers.mockResolvedValue([]);
            settingsRepository.getTeachers.mockResolvedValue([]);

            const result = await analyticsService.getGlobalStats(meets);

            // Should show 50% attendance (S1 present, S2 absent)
            expect(result[0].uniqueParticipantsCount).toBe(2);
            expect(result[0].activeParticipantsCount).toBe(1); // S1
            expect(result[0].attendancePercentage).toBe(50);
        });
    });
});
