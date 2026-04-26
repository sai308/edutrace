<script setup lang="ts">
import type { DetailedStats } from '@Analytics/types/analytics'
import AnalyticsOverviewCard from '@Analytics/components/AnalyticsOverviewCard.vue'

interface Props {
    stats: DetailedStats
}

defineProps<Props>()
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnalyticsOverviewCard
            v-for="date in stats.dates"
            :key="date"
            :date="date"
            :session="stats.sessions[date]!"
            :report-id="stats.reportIds?.[date] ?? null"
        />
    </div>
</template>
