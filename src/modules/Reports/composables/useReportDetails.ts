import type { SingleReportStats } from '@Analytics/types/analytics'
import { analyticsService } from '@Analytics/services/analytics.service'
import { ref } from 'vue'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'

export function useReportDetails(reportId: string) {
    const stats = ref<SingleReportStats | null>(null)
    const loading = ref(true)
    const error = ref<unknown>(null)

    async function loadDetails() {
        loading.value = true
        error.value = null
        try {
            stats.value = await analyticsService.getSingleReportStats(reportId)
        } catch (err) {
            logger.error('Failed to load report details:', err)
            error.value = err
            toast.error('Failed to load report details')
        } finally {
            loading.value = false
        }
    }

    return {
        stats,
        loading,
        error,
        loadDetails,
    }
}
