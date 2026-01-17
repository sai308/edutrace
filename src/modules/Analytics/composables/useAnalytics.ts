import { ref } from 'vue';
import { analyticsService } from '../services/analytics.service';
import { groupsRepository } from '@Groups/services/groups.repository';
import type { Group } from '@Groups/types/groups';
import type { GlobalStat } from '../types/analytics';

export function useAnalytics() {
    const stats = ref<GlobalStat[]>([]);
    const loading = ref(true);
    const groupsMap = ref<Record<string, Group>>({});

    async function loadStats() {
        loading.value = true;
        try {
            const [data, groups] = await Promise.all([
                analyticsService.getGlobalStats(),
                groupsRepository.getGroupMap()
            ]);
            stats.value = data;
            groupsMap.value = groups;
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            loading.value = false;
        }
    }

    return {
        stats,
        groupsMap,
        loading,
        loadStats
    };
}
