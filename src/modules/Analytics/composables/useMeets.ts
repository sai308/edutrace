import type { Meet } from '@Analytics/types/analytics'
import type { Group } from '@Groups/types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { ref } from 'vue'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'

// Module-level singleton state — shared across all components that call useMeets()
// so that deletes in one component are reflected everywhere without re-mounting.
const meets = ref<Meet[]>([])
const groupsMap = ref<Record<string, Group>>({})

export function useMeets() {
    async function loadMeets(): Promise<void> {
        const [allMeets, groupMap] = await Promise.all([meetsRepository.getAllMeets(), groupsRepository.getGroupMap()])
        meets.value = allMeets
        groupsMap.value = groupMap
    }

    async function deleteMeet(id: string): Promise<void> {
        try {
            await meetsRepository.deleteMeets([id])
            await loadMeets()
        }
        catch (err) {
            logger.error('Failed to delete meet:', err)
            toast.error('Failed to delete session')
        }
    }

    async function bulkDeleteMeets(ids: string[]): Promise<void> {
        if (!ids.length)
            return
        try {
            await meetsRepository.deleteMeets(ids)
            await loadMeets()
        }
        catch (err) {
            logger.error('Failed to bulk delete meets:', err)
            toast.error('Failed to delete sessions')
        }
    }

    return { meets, groupsMap, loadMeets, deleteMeet, bulkDeleteMeets }
}
