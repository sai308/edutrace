<script setup lang="ts">
import { useAnalytics } from '@Analytics/composables/useAnalytics'
import AnalyticsDashboard from '@Analytics/views/AnalyticsDashboard.vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { stats, loading, loadStats } = useAnalytics()

onMounted(() => {
    loadStats()
})

function handleViewDetails(meetId: string): void {
    router.push({ name: 'AnalyticsDetails', params: { id: meetId } })
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AnalyticsDashboard
            :stats="stats"
            :loading="loading"
            @view-details="handleViewDetails"
            @refresh="loadStats"
        />
    </div>
</template>
