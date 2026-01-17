<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AnalyticsDashboard from '../components/AnalyticsDashboard.vue';
import { useAnalytics } from '../composables/useAnalytics';
import { useMeets } from '@/modules/Analytics/composables/useMeets';

const router = useRouter();
const { stats, loading, loadStats } = useAnalytics();
const { groupsMap, loadMeets } = useMeets();

onMounted(() => {
    loadStats();
    loadMeets();
});

function handleViewDetails(meetId) {
    router.push({ name: 'AnalyticsDetails', params: { id: meetId } });
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AnalyticsDashboard :stats="stats" :loading="loading" :groups-map="groupsMap" @view-details="handleViewDetails"
            @refresh="loadStats" />
    </div>
</template>
