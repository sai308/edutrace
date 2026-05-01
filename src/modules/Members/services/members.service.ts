import type { Member, StudentFormData } from '@Students/types/students'
import { studentsRepository } from '@Students/services/students.repository'

export type MemberFormData = StudentFormData

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
    async saveMember(formData: MemberFormData, existingMember: Member | null): Promise<Member> {
        const memberToSave: Member = {
            ...(existingMember ?? {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            }),
            name: formData.name,
            email: formData.email,
            groupName: formData.groupName,
            role: formData.role,
            iep: formData.iep || undefined,
        }

        const id = await studentsRepository.saveMember(memberToSave)
        return { ...memberToSave, id }
    }
}

export const membersService = new MembersService()
