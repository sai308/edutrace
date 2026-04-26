import { groupsRepository } from '@Groups/services/groups.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studentsRepository } from '../students.repository'
import { StudentsService } from '../students.service'

vi.mock('../students.repository')
vi.mock('@Groups/services/groups.repository')

function makeForm(overrides = {}) {
    return {
        name: 'Alice',
        email: 'alice@example.com',
        groupName: 'Group A',
        role: 'student' as const,
        iep: '',
        ...overrides,
    }
}

describe('studentsService', () => {
    let service: StudentsService

    beforeEach(() => {
        vi.clearAllMocks()
        service = new StudentsService()
        ;(groupsRepository.getAll as any).mockResolvedValue([{ id: '1', name: 'Group A' }])
        ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
        ;(studentsRepository.saveMember as any).mockResolvedValue('new-id')
        ;(studentsRepository.hideMember as any).mockResolvedValue(undefined)
        ;(studentsRepository.hideMembers as any).mockResolvedValue(undefined)
    })

    describe('saveStudent — new student', () => {
        it('saves member with generated id and empty aliases', async () => {
            await service.saveStudent(makeForm(), null)

            expect(studentsRepository.saveMember).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Alice',
                    email: 'alice@example.com',
                    groupName: 'Group A',
                    role: 'student',
                    aliases: [],
                }),
            )
            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.id).toBeDefined()
        })

        it('normalizes groupName against existing groups', async () => {
            ;(groupsRepository.getAll as any).mockResolvedValue([{ id: '1', name: 'Group A' }])
            await service.saveStudent(makeForm({ groupName: 'group a' }), null)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            // normalizeGroupName should match to the canonical "Group A"
            expect(savedArg.groupName).toBe('Group A')
        })

        it('trims and stores iep when provided', async () => {
            await service.saveStudent(makeForm({ iep: '  IEP-001  ' }), null)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.iep).toBe('IEP-001')
        })

        it('throws IEP_NOT_UNIQUE when another member has the same IEP', async () => {
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([
                { id: 'other-id', iep: 'IEP-001' },
            ])

            await expect(service.saveStudent(makeForm({ iep: 'IEP-001' }), null)).rejects.toThrow(
                'IEP_NOT_UNIQUE',
            )
        })

        it('does not check IEP uniqueness when iep is blank', async () => {
            await service.saveStudent(makeForm({ iep: '' }), null)
            expect(studentsRepository.getAllMembers).not.toHaveBeenCalled()
        })
    })

    describe('saveStudent — editing existing student', () => {
        const existing = {
            id: 'existing-id',
            name: 'Alice',
            email: 'alice@example.com',
            groupName: 'Group A',
            role: 'student' as const,
            hidden: false,
            aliases: [],
            createdAt: '2024-01-01T00:00:00.000Z',
        }

        it('preserves the original id', async () => {
            await service.saveStudent(makeForm({ name: 'Alice Updated' }), existing)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.id).toBe('existing-id')
        })

        it('pushes old name into aliases on rename', async () => {
            await service.saveStudent(makeForm({ name: 'Alice Updated' }), existing)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.aliases).toContain('Alice')
        })

        it('does not duplicate alias if old name is already present', async () => {
            const withAlias = { ...existing, aliases: ['Alice'] }
            await service.saveStudent(makeForm({ name: 'Alice Updated' }), withAlias)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.aliases.filter((a: string) => a === 'Alice')).toHaveLength(1)
        })

        it('does not add alias when name is unchanged', async () => {
            await service.saveStudent(makeForm({ name: 'Alice' }), existing)

            const savedArg = (studentsRepository.saveMember as any).mock.calls[0][0]
            expect(savedArg.aliases).toHaveLength(0)
        })

        it('allows updating own IEP without triggering IEP_NOT_UNIQUE', async () => {
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([
                { id: 'existing-id', iep: 'IEP-001' },
            ])

            await expect(
                service.saveStudent(makeForm({ iep: 'IEP-001' }), existing),
            ).resolves.toBeUndefined()
        })
    })

    describe('deleteStudent', () => {
        it('calls hideMember with the given id', async () => {
            await service.deleteStudent('student-123')
            expect(studentsRepository.hideMember).toHaveBeenCalledWith('student-123')
        })
    })

    describe('bulkDeleteStudents', () => {
        it('calls hideMembers with the given ids', async () => {
            await service.bulkDeleteStudents(['s1', 's2', 's3'])
            expect(studentsRepository.hideMembers).toHaveBeenCalledWith(['s1', 's2', 's3'])
        })
    })
})
