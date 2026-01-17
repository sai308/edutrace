import { studentsRepository } from './students.repository';
import type { Member, StudentFormData } from '../types/students';

export class StudentsService {
    async saveStudent(formData: StudentFormData, originalStudent: Member): Promise<void> {
        const oldName = originalStudent.name;
        const newName = formData.name;
        const currentId = originalStudent.id;

        const aliases = originalStudent.aliases ? [...originalStudent.aliases] : [];

        if (oldName !== newName) {
            if (!aliases.includes(oldName)) {
                aliases.push(oldName);
            }
        }

        const memberData: Member = {
            id: currentId, // Keep ID even if name changes, as it's the primary key
            name: newName,
            email: formData.email,
            groupName: formData.groupName,
            role: originalStudent.role || 'student',
            hidden: originalStudent.hidden || false,
            aliases,
            createdAt: originalStudent.createdAt || new Date().toISOString()
        };

        await studentsRepository.saveMember(memberData);
    }

    async deleteStudent(id: string): Promise<void> {
        await studentsRepository.hideMember(id);
    }

    async bulkDeleteStudents(ids: string[]): Promise<void> {
        await studentsRepository.hideMembers(ids);
    }
}

export const studentsService = new StudentsService();
