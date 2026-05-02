import { studentsRepository } from '@Students/services/students.repository'
import { describe, expect, it } from 'vitest'
import { membersService, validateMemberForm } from '../members.service'

const baseFormData = {
    name: 'Alice',
    email: 'alice@example.com',
    groupName: 'Math',
    role: 'student' as const,
    iep: '',
}

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
    it('creates new member and persists it', async () => {
        const result = await membersService.saveMember(baseFormData, null)

        expect(result.id).toBeTruthy()
        expect(result.name).toBe('Alice')
        expect(result.groupName).toBe('Math')
        expect(result.createdAt).toBeTruthy()

        const all = await studentsRepository.getAllMembers()
        expect(all).toHaveLength(1)
        expect(all[0]!.id).toBe(result.id)
    })

    it('updates existing member without creating a duplicate', async () => {
        const created = await membersService.saveMember(baseFormData, null)
        const updated = await membersService.saveMember({ ...baseFormData, name: 'Alice Updated' }, created)

        expect(updated.id).toBe(created.id)
        expect(updated.name).toBe('Alice Updated')

        const all = await studentsRepository.getAllMembers()
        expect(all).toHaveLength(1)
        expect(all[0]!.name).toBe('Alice Updated')
    })

    it('preserves createdAt when editing', async () => {
        const created = await membersService.saveMember(baseFormData, null)
        const updated = await membersService.saveMember(baseFormData, created)
        expect(updated.createdAt).toBe(created.createdAt)
    })

    it('sets iep to undefined when empty string', async () => {
        const result = await membersService.saveMember({ ...baseFormData, iep: '' }, null)
        expect(result.iep).toBeUndefined()
    })

    it('sets iep when provided', async () => {
        const result = await membersService.saveMember({ ...baseFormData, iep: 'IEP-001' }, null)
        expect(result.iep).toBe('IEP-001')
    })

    it('stores null groupName for teacher role (repository enforces)', async () => {
        const result = await membersService.saveMember(
            { ...baseFormData, role: 'teacher', groupName: 'SomeGroup' },
            null,
        )
        expect(result.groupName).toBeNull()

        const all = await studentsRepository.getAllMembers()
        expect(all[0]!.groupName).toBeNull()
    })

    it('passes groupName as-is for student (no null coercion to empty string)', async () => {
        const result = await membersService.saveMember({ ...baseFormData, groupName: 'CS101' }, null)
        expect(result.groupName).toBe('CS101')
    })
})
