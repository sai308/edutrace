import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { marksRepository } from '@Marks/services/marks.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/services/settings.repository'
import { studentsRepository } from '../students.repository'
import { studentStatsService } from '../studentStats.service'

// Mocks
vi.mock('../students.repository')
vi.mock('../../../Marks/services/marks.repository')
vi.mock('../../../Analytics/services/meets.repository')
vi.mock('../../../Tasks/services/tasks.repository')
vi.mock('../../../Groups/services/groups.repository')
vi.mock('@/shared/services/settings.repository')

describe('studentStatsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockGroup = { name: 'G1', meetId: 'm1' }

    it('should aggregate data correctly for a group', async () => {
        // Setup Mocks
        studentsRepository.getMembersByGroup.mockResolvedValue([
            { id: 's1', name: 'Alice', groupName: 'G1' },
            { id: 's2', name: 'Bob', groupName: 'G1' },
        ])

        meetsRepository.getAllMeets.mockResolvedValue([
            {
                id: 'meet1',
                meetId: 'm1',
                participants: [{ name: 'Alice', duration: 3600 }],
            },
        ])

        groupsRepository.getGroupMap.mockResolvedValue({ m1: mockGroup })
        settingsRepository.getTeachers.mockResolvedValue(new Set())

        marksRepository.getMarksByStudentIds.mockResolvedValue([
            { studentId: 's1', taskId: 't1', score: 10 },
        ])

        settingsRepository.getDurationLimit.mockResolvedValue(0)

        tasksRepository.getAllTasks.mockResolvedValue([
            { id: 't1', name: 'Task 1', normalizedName: 'task1', maxPoints: 10 },
        ])

        const result = await studentStatsService.loadDashboardData('G1')

        expect(result.students).toHaveLength(2)

        const alice = result.students.find(s => s.name === 'Alice')
        const bob = result.students.find(s => s.name === 'Bob')

        // Verify key stats
        // Alice attended meet1 (duration 3600)
        expect(alice.sessionCount).toBe(1)
        expect(alice.averageMark).toBe(5) // 10/10 = 100% = 5

        // Bob did not attend
        expect(bob.sessionCount).toBe(0)
        expect(bob.averageMark).toBe(0)
    })
})
