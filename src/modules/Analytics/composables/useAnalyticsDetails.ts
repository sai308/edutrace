import type { DetailedStats } from '../types/analytics'
import { ref } from 'vue'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { analyticsService } from '../services/analytics.service'

export function useAnalyticsDetails(meetId: string) {
    const stats = ref<DetailedStats | null>(null)
    const loading = ref(true)
    const error = ref<any>(null)

    async function loadDetails(teacherName: string | null = null) {
        loading.value = true
        error.value = null
        try {
            stats.value = await analyticsService.getDetailedStats(meetId, teacherName)
        }
        catch (err) {
            logger.error('Failed to load detailed stats:', err)
            error.value = err
            toast.error('Failed to load analytics details')
        }
        finally {
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
