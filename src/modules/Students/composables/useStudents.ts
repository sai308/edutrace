import { ref } from 'vue';
import { studentsService } from '../services/students.service';
import { studentStatsService } from '../services/studentStats.service';
import { toast } from '@/services/toast';
import type { StudentFormData, Member } from '../types/students';
import type { Meet } from '@Analytics/types/analytics';
import type { Group } from '@Groups/types/groups';
import type { Task } from '@Marks/types/marks';

export function useStudents() {
    const students = ref<Member[]>([]);
    const groupsMap = ref<Record<string, Group>>({});
    const teachers = ref<Set<string>>(new Set());
    const meets = ref<Meet[]>([]);
    const tasks = ref<Task[]>([]);
    const isLoading = ref(false);

    async function loadData() {
        isLoading.value = true;
        try {
            const data = await (studentStatsService as any).loadDashboardData();
            students.value = data.students;
            groupsMap.value = data.groupsMap;
            teachers.value = data.teachers;
            meets.value = data.meets;
            tasks.value = data.tasks;
        } catch (e) {
            console.error('Error loading student data:', e);
            toast.error('Failed to load students');
        } finally {
            isLoading.value = false;
        }
    }

    async function saveStudent(formData: StudentFormData, originalStudent: Member) {
        try {
            await studentsService.saveStudent(formData, originalStudent);
            await loadData();
            toast.success('Student updated');
        } catch (e) {
            console.error('Error in saveStudent:', e);
            toast.error('Error updating student');
        }
    }

    async function deleteStudent(id: string) {
        try {
            await studentsService.deleteStudent(id);
            await loadData();
            toast.success('Student deleted');
        } catch (e) {
            console.error(e);
            toast.error('Error deleting student');
        }
    }

    async function bulkDeleteStudents(ids: string[]) {
        try {
            await studentsService.bulkDeleteStudents(ids);
            await loadData();
            toast.success('Selected students deleted');
        } catch (e) {
            console.error(e);
            toast.error('Error deleting students');
        }
    }

    return {
        students,
        groupsMap,
        teachers,
        meets,
        tasks,
        loadData,
        saveStudent,
        deleteStudent,
        bulkDeleteStudents,
        isLoading
    };
}
