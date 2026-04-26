import type { Member } from '@Students/types/students'
import { studentsRepository } from '@Students/services/students.repository'

export interface MemberFormData {
    name: string
    email: string
    groupName: string | null
    role: 'student' | 'teacher' | 'assistant'
    iep: string
}

export interface MemberFormErrors {
    name: string
    groupName: string
}

export interface ValidationResult {
    valid: boolean
    errors: MemberFormErrors
}

/**
 * Pure synchronous validation for the member form.
 * Returns whether the form is valid and a map of field-level error keys.
 */
export function validateMemberForm(
    formData: Pick<MemberFormData, 'name' | 'groupName' | 'role'>,
): ValidationResult {
    const errors: MemberFormErrors = { name: '', groupName: '' }
    let valid = true

    if (!formData.name.trim()) {
        errors.name = 'members.dialog.errors.nameRequired'
        valid = false
    }

    const isGroupDisabled = formData.role === 'teacher' || formData.role === 'assistant'

    if (!isGroupDisabled && (!formData.groupName || !formData.groupName.trim())) {
        errors.groupName = 'members.dialog.errors.groupRequired'
        valid = false
    }

    return { valid, errors }
}

class MembersService {
    /**
     * Persists a member record. Handles both create (existingMember = null) and
     * update scenarios by merging form data with the original record.
     */
    async saveMember(formData: MemberFormData, existingMember: Member | null): Promise<void> {
        const memberToSave: Member = {
            ...(existingMember ?? {
                id: '',
                createdAt: new Date().toISOString(),
            }),
            name: formData.name,
            email: formData.email,
            groupName: formData.groupName ?? '',
            role: formData.role,
            iep: formData.iep || undefined,
        }

        await studentsRepository.saveMember(memberToSave)
    }
}

export const membersService = new MembersService()
