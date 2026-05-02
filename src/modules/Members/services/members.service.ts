import type { Member, MemberFormData } from '@Members/types/members'
import { membersRepository } from '@Members/services/members.repository'

export type { MemberFormData } from '@Members/types/members'

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

        const id = await membersRepository.saveMember(memberToSave)
        return { ...memberToSave, id }
    }

    async getAllMembers(options?: { includeHidden?: boolean }): Promise<Member[]> {
        return membersRepository.getAllMembers(options)
    }

    async hideMember(id: string): Promise<string | undefined> {
        return membersRepository.hideMember(id)
    }

    async restoreMember(id: string): Promise<string | undefined> {
        return membersRepository.restoreMember(id)
    }

    async hideMembers(ids: string[]): Promise<void> {
        return membersRepository.hideMembers(ids)
    }

    async deleteMembers(ids: string[]): Promise<void> {
        return membersRepository.deleteMembers(ids)
    }
}

export const membersService = new MembersService()
