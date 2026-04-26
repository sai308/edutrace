import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import type { Task } from '@Marks/types/marks'
import type { Module, StudentSummaryData } from '@Summary/types/summary'
import { summaryService } from '@Summary/services/summary.service'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activeWorkerTasks, reportWorkerError } from '@/shared/lib/appStatus'
import { logger } from '@/shared/lib/logger'
import { WorkerError } from '@/shared/lib/workerError'
import { toast } from '@/shared/services/toast'

export function useSummaryData() {
    const { t } = useI18n()
    const students = ref<StudentSummaryData[]>([])
    const isLoading = ref(false)

    // Data required for StudentProfileModal
    const meets = ref<Meet[]>([])
    const tasks = ref<Task[]>([])
    const groupsMap = ref<Record<string, Group>>({})

    async function loadExamData(
        group: Group | null,
        modules: Module[] = [],
        completionThreshold = 70,
        attendanceThreshold = 60,
        attendanceEnabled = true,
        gradeFormat = '5-scale',
        requiredTasks = 0,
        assessmentType = 'examination',
    ) {
        if (!group) {
            students.value = []
            return
        }

        isLoading.value = true
        activeWorkerTasks.value++
        try {
            const data = await summaryService.loadExamData(group, {
                modules,
                completionThreshold,
                attendanceThreshold,
                attendanceEnabled,
                gradeFormat,
                requiredTasks,
                assessmentType,
                t: t as any,
            })

            students.value = data.students
            meets.value = data.context.meets
            tasks.value = data.context.tasks
            groupsMap.value = data.context.groupsMap
        } catch (error) {
            logger.error('Error loading summary data:', error)
            reportWorkerError()
            students.value = []
            if (error instanceof WorkerError && error.code === 'WORKER_TIMEOUT') {
                toast.error(t('workerErrors.timeout'))
            } else if (error instanceof WorkerError && error.code === 'SERIALIZATION_ERROR') {
                toast.error(t('workerErrors.serialization'))
            } else {
                toast.error(t('workerErrors.unknown'))
            }
        } finally {
            isLoading.value = false
            activeWorkerTasks.value = Math.max(0, activeWorkerTasks.value - 1)
        }
    }

    return {
        students,
        isLoading,
        loadExamData,
        meets,
        tasks,
        groupsMap,
    }
}
