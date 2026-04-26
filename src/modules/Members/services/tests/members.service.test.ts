import type { Member } from '@Students/types/students'
import { studentsRepository } from '@Students/services/students.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { membersService, validateMemberForm } from '../members.service'

vi.mock('@Students/services/students.repository')

const mockSaveMember = vi.mocked(studentsRepository.saveMember)

describe('validateMemberForm', () => {
    it('should return valid when name and groupName are provided for a student', () => {
        const result = validateMemberForm({ name: 'Alice', groupName: 'Math', role: 'student' })
        expect(result.valid).toBe(true)
        expect(result.errors.name).toBe('')
        expect(result.errors.groupName).toBe('')
    })

    it('should return invalid when name is empty', () => {
        const result = validateMemberForm({ name: '  ', groupName: 'Math', role: 'student' })
        expect(result.valid).toBe(false)
        expect(result.errors.name).toBe('members.dialog.errors.nameRequired')
    })

    it('should require groupName for student role', () => {
        const result = validateMemberForm({ name: 'Alice', groupName: '', role: 'student' })
        expect(result.valid).toBe(false)
        expect(result.errors.groupName).toBe('members.dialog.errors.groupRequired')
    })

    it('should require groupName when groupName is null for student role', () => {
        const result = validateMemberForm({ name: 'Alice', groupName: null, role: 'student' })
        expect(result.valid).toBe(false)
        expect(result.errors.groupName).toBe('members.dialog.errors.groupRequired')
    })

    it('should not require groupName for teacher role', () => {
        const result = validateMemberForm({ name: 'Bob', groupName: null, role: 'teacher' })
        expect(result.valid).toBe(true)
        expect(result.errors.groupName).toBe('')
    })

    it('should not require groupName for assistant role', () => {
        const result = validateMemberForm({ name: 'Carol', groupName: '', role: 'assistant' })
        expect(result.valid).toBe(true)
        expect(result.errors.groupName).toBe('')
    })

    it('should report both name and groupName errors when both are missing for a student', () => {
        const result = validateMemberForm({ name: '', groupName: '', role: 'student' })
        expect(result.valid).toBe(false)
        expect(result.errors.name).toBeTruthy()
        expect(result.errors.groupName).toBeTruthy()
    })
})

describe('membersService.saveMember', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSaveMember.mockResolvedValue('member-id')
    })

    const baseFormData = {
        name: 'Alice',
        email: 'alice@example.com',
        groupName: 'Math',
        role: 'student' as const,
        iep: '',
    }

    it('should call saveMember with merged data when editing an existing member', async () => {
        const existing: Member = {
            id: 'existing-id',
            name: 'Old Name',
            groupName: 'Old Group',
            role: 'student',
            createdAt: '2025-01-01T00:00:00.000Z',
        }

        await membersService.saveMember(baseFormData, existing)

        expect(mockSaveMember).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'existing-id',
                name: 'Alice',
                email: 'alice@example.com',
                groupName: 'Math',
                role: 'student',
                createdAt: '2025-01-01T00:00:00.000Z',
            }),
        )
    })

    it('should call saveMember with new createdAt when creating a member (existingMember = null)', async () => {
        await membersService.saveMember(baseFormData, null)

        expect(mockSaveMember).toHaveBeenCalledWith(
            expect.objectContaining({
                id: '',
                name: 'Alice',
                createdAt: expect.any(String),
            }),
        )
    })

    it('should set iep to undefined when iep is empty string', async () => {
        await membersService.saveMember({ ...baseFormData, iep: '' }, null)

        expect(mockSaveMember).toHaveBeenCalledWith(expect.objectContaining({ iep: undefined }))
    })

    it('should set iep when provided', async () => {
        await membersService.saveMember({ ...baseFormData, iep: 'IEP-001' }, null)

        expect(mockSaveMember).toHaveBeenCalledWith(expect.objectContaining({ iep: 'IEP-001' }))
    })
})
