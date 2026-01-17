import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { summaryService } from '../services/summary.service';
import type { StudentSummaryData } from '../types/summary';
import type { Group } from '@Groups/types/groups';
import type { Meet } from '@Analytics/types/analytics';
import type { Task } from '@Marks/types/marks';

export function useSummaryData() {
    const { t } = useI18n();
    const students = ref<StudentSummaryData[]>([]);
    const isLoading = ref(false);

    // Data required for StudentProfileModal
    const meets = ref<Meet[]>([]);
    const tasks = ref<Task[]>([]);
    const groupsMap = ref<Record<string, Group>>({});

    async function loadExamData(
        group: Group | null,
        modules: any[] = [],
        completionThreshold = 70,
        attendanceThreshold = 60,
        attendanceEnabled = true,
        gradeFormat = '5-scale',
        requiredTasks = 0,
        assessmentType = 'examination'
    ) {
        if (!group) {
            students.value = [];
            return;
        }

        isLoading.value = true;
        try {
            const data = await summaryService.loadExamData(group, {
                modules,
                completionThreshold,
                attendanceThreshold,
                attendanceEnabled,
                gradeFormat,
                requiredTasks,
                assessmentType,
                t: t as any
            });

            students.value = data.students;
            meets.value = data.context.meets;
            tasks.value = data.context.tasks;
            groupsMap.value = data.context.groupsMap;

        } catch (error) {
            console.error('Error loading summary data:', error);
            students.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    return {
        students,
        isLoading,
        loadExamData,
        meets,
        tasks,
        groupsMap
    };
}