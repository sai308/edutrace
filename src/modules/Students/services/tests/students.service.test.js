import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentsService } from '../students.service';
import { studentsRepository } from '../students.repository';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { tasksRepository } from '@Marks/services/tasks.repository';
import { marksRepository } from '@Marks/services/marks.repository';
import { settingsRepository } from '@/shared/services/settings.repository';

// Mock all repositories
vi.mock('../students.repository');
vi.mock('../../../Analytics/services/meets.repository');
vi.mock('../../../Groups/services/groups.repository');
vi.mock('../../../Marks/services/tasks.repository');
vi.mock('../../../Marks/services/marks.repository');
vi.mock('@/shared/services/settings.repository');

describe('StudentsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });



    describe('saveStudent', () => {
        it('should delegate to repository and handle aliases logic', async () => {
            const originalUser = { id: '1', name: 'OldName', aliases: [] };
            const formData = { name: 'NewName', email: 'new@example.com' };

            await studentsService.saveStudent(formData, originalUser);

            expect(studentsRepository.saveMember).toHaveBeenCalledWith(expect.objectContaining({
                id: '1',
                name: 'NewName',
                email: 'new@example.com',
                aliases: ['OldName'],
                role: 'student',
                hidden: false,
                createdAt: expect.any(String)
            }));
        });
    });
});
