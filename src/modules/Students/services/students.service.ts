import type { Member, StudentFormData } from '../types/students'
import { groupsRepository } from '@Groups/services/groups.repository'
import { normalizeGroupName } from '@/shared/utils/groupNormalization'
import { studentsRepository } from './students.repository'

function generateId(): string {
    return `student_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export class StudentsService {
    async saveStudent(formData: StudentFormData, originalStudent: Member | null): Promise<void> {
        const isNew = !originalStudent
        const oldName = originalStudent?.name ?? ''
        const newName = formData.name
        const currentId = originalStudent?.id ?? generateId()

        const aliases = originalStudent?.aliases ? [...originalStudent.aliases] : []

        if (!isNew && oldName !== newName) {
            if (!aliases.includes(oldName)) {
                aliases.push(oldName)
            }
        }

        const allGroups = await groupsRepository.getAll()
        const normalizedGroup = formData.groupName
            ? normalizeGroupName(formData.groupName, allGroups)
            : formData.groupName

        if (formData.iep && formData.iep.trim() !== '') {
            const allMembers = await studentsRepository.getAllMembers()
            const duplicate = allMembers.find((m) => m.iep === formData.iep.trim() && m.id !== currentId)
            if (duplicate) {
                throw new Error('IEP_NOT_UNIQUE')
            }
        }

        const memberData: Member = {
            id: currentId,
            name: newName,
            email: formData.email,
            groupName: normalizedGroup || '',
            role: originalStudent?.role || 'student',
            hidden: originalStudent?.hidden ?? false,
            aliases,
            iep: formData.iep ? formData.iep.trim() : undefined,
            createdAt: originalStudent?.createdAt || new Date().toISOString(),
        }

        await studentsRepository.saveMember(memberData)
    }

    async deleteStudent(id: string): Promise<void> {
        await studentsRepository.hideMember(id)
    }

    async bulkDeleteStudents(ids: string[]): Promise<void> {
        await studentsRepository.hideMembers(ids)
    }
}

export const studentsService = new StudentsService()
