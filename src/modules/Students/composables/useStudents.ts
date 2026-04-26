import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Task } from '@Marks/types/marks'
import type { Member, StudentDashboardStats, StudentFormData } from '../types/students'
import { ref, shallowRef } from 'vue'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { studentsService } from '../services/students.service'
import { studentStatsService } from '../services/studentStats.service'

export function useStudents() {
    const students = shallowRef<StudentDashboardStats[]>([])
    const groupsMap = ref<Record<string, Group>>({})
    const teachers = ref<Set<string>>(new Set())
    const meets = ref<Meet[]>([])
    const tasks = ref<Task[]>([])
    const isLoading = ref(false)

    async function loadData() {
        isLoading.value = true
        try {
            const data = await studentStatsService.loadDashboardData()
            students.value = data.students
            groupsMap.value = data.groupsMap
            teachers.value = data.teachers
            meets.value = data.meets
            tasks.value = data.tasks
        } catch (e) {
            logger.error('Error loading student data:', e)
            toast.error('Failed to load students')
        } finally {
            isLoading.value = false
        }
    }

    async function saveStudent(formData: StudentFormData, originalStudent: Member | null) {
        const isNew = !originalStudent
        try {
            await studentsService.saveStudent(formData, originalStudent)
            await loadData()
            toast.success(isNew ? 'Student added' : 'Student updated')
        } catch (e: any) {
            logger.error('Error in saveStudent:', e)
            if (e.message === 'IEP_NOT_UNIQUE') {
                toast.error('A student with this IEP already exists')
            } else {
                toast.error(isNew ? 'Error adding student' : 'Error updating student')
            }
        }
    }

    async function deleteStudent(id: string) {
        try {
            await studentsService.deleteStudent(id)
            await loadData()
            toast.success('Student deleted')
        } catch (e) {
            logger.error('Delete student failed', e)
            toast.error('Error deleting student')
        }
    }

    async function bulkDeleteStudents(ids: string[]) {
        try {
            await studentsService.bulkDeleteStudents(ids)
            await loadData()
            toast.success('Selected students deleted')
        } catch (e) {
            logger.error('Bulk delete students failed', e)
            toast.error('Error deleting students')
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
        isLoading,
    }
}
