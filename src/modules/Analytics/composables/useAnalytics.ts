import type { EnrichedStat } from '@Analytics/types/analytics'
import { analyticsService } from '@Analytics/services/analytics.service'
import { groupsRepository } from '@Groups/services/groups.repository'
import { ref } from 'vue'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'

export function useAnalytics() {
    const stats = ref<EnrichedStat[]>([])
    const loading = ref(true)
    const error = ref<Error | null>(null)

    async function loadStats(): Promise<void> {
        loading.value = true
        error.value = null
        try {
            const [rawStats, groupsMap] = await Promise.all([
                analyticsService.getGlobalStats(),
                groupsRepository.getGroupMap(),
            ])
            stats.value = analyticsService.enrichStats(rawStats, groupsMap)
        }
        catch (err) {
            error.value = err instanceof Error ? err : new Error(String(err))
            logger.error('Error loading analytics:', err)
            toast.error('Failed to load analytics data')
        }
        finally {
            loading.value = false
        }
    }

    return { stats, loading, error, loadStats }
}
