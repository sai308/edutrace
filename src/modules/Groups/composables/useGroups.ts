import type { EnrichedGroup, GroupFormData } from '../types/groups'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activeWorkerTasks } from '@/shared/lib/appStatus'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { groupsService } from '../services/groups.service'

// Module-level singleton state — shared across all components that call useGroups()
// so writes from dialogs are reflected in tables without refetching on remount.
const groups = ref<EnrichedGroup[]>([])
const memberCounts = ref<Record<string, number>>({})
const allMeetIds = ref<string[]>([])
const allTeachers = ref<string[]>([])
const isLoading = ref(false)

export function useGroups() {
    const { t } = useI18n()

    async function loadData(): Promise<void> {
        if (isLoading.value)
            return
        isLoading.value = true
        activeWorkerTasks.value++
        try {
            const data = await groupsService.loadGroupsData()
            groups.value = data.groups
            memberCounts.value = data.memberCounts
            allMeetIds.value = data.allMeetIds
            allTeachers.value = data.allTeachers
        }
        catch (error) {
            logger.error('Failed to load groups data:', error, 'worker')
            toast.error(t('groups.errors.loadFailed'))
        }
        finally {
            isLoading.value = false
            activeWorkerTasks.value = Math.max(0, activeWorkerTasks.value - 1)
        }
    }

    async function saveGroup(formData: GroupFormData): Promise<void> {
        try {
            const isUpdate = !!formData.id
            await groupsService.saveGroup(formData)
            await loadData()
            toast.success(isUpdate ? t('groups.toasts.updated') : t('groups.toasts.created'))
        }
        catch (e: unknown) {
            logger.error('Save group failed', e)
            const message = e instanceof Error ? e.message : t('groups.errors.saveFailed')
            toast.error(message)
            throw e
        }
    }

    async function deleteGroup(id: string | number): Promise<void> {
        try {
            await groupsService.deleteGroup(id)
            await loadData()
            toast.success(t('groups.toasts.deleted'))
        }
        catch (e: unknown) {
            logger.error('Delete group failed', e)
            toast.error(t('groups.errors.deleteFailed'))
            throw e
        }
    }

    return {
        groups,
        memberCounts,
        allMeetIds,
        allTeachers,
        isLoading,
        loadData,
        saveGroup,
        deleteGroup,
    }
}
