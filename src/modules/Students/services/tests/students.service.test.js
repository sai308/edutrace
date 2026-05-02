import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studentsRepository } from '../students.repository'
import { studentsService } from '../students.service'

// Mock all repositories
vi.mock('../students.repository')
vi.mock('../../../Analytics/services/meets.repository')
vi.mock('../../../Groups/services/groups.repository')
vi.mock('../../../Marks/services/tasks.repository')
vi.mock('../../../Marks/services/marks.repository')
vi.mock('@/shared/services/settings.repository')

describe('studentsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveMember', () => {
        it('should delegate to repository and handle aliases logic', async () => {
            const originalUser = { id: '1', name: 'OldName', aliases: [] }
            const formData = { name: 'NewName', email: 'new@example.com' }

            await studentsService.saveMember(formData, originalUser)

            expect(studentsRepository.saveMember).toHaveBeenCalledWith(expect.objectContaining({
                id: '1',
                name: 'NewName',
                email: 'new@example.com',
                aliases: ['OldName'],
                role: 'student',
                hidden: false,
                createdAt: expect.any(String),
            }))
        })
    })
})
