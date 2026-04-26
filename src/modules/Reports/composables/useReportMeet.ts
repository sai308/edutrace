import type { Meet } from '@Analytics/types/analytics'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { calculateMeetDuration } from '@Reports/utils/duration'
import { computed, ref } from 'vue'

/**
 * Loads a single meet by its internal ID, sorts participants alphabetically,
 * and exposes computed stats used by ReportDetailsPage.
 */
export function useReportMeet(meetId: string) {
    const meet = ref<Meet | undefined>(undefined)
    const isLoading = ref(true)

    async function loadMeet(): Promise<void> {
        if (!meetId) {
            isLoading.value = false
            return
        }
        try {
            const result = await meetsRepository.getMeetById(meetId)
            if (result?.participants) {
                result.participants.sort((a, b) => a.name.localeCompare(b.name))
            }
            meet.value = result
        }
        finally {
            isLoading.value = false
        }
    }

    const totalDuration = computed(() => calculateMeetDuration(meet.value))

    const avgDuration = computed(() => {
        if (!meet.value?.participants?.length)
            return 0
        const total = meet.value.participants.reduce((acc, p) => acc + p.duration, 0)
        return total / meet.value.participants.length
    })

    return { meet, isLoading, totalDuration, avgDuration, loadMeet }
}
