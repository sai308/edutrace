import { ref } from 'vue';
import { meetsRepository } from '../services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import type { Meet } from '../types/analytics';
import type { Group } from '@Groups/types/groups';

// Global state - kept global to share across components if needed, or scoped if preferred.
// Keeping global/module-singleton pattern as per original file.
const meets = ref<Meet[]>([]);
const groupsMap = ref<Record<string, Group>>({});

export function useMeets() {

    async function loadMeets() {
        // Parallel load
        const [allMeets, groupMap] = await Promise.all([
            meetsRepository.getAllMeets(),
            groupsRepository.getGroupMap()
        ]);
        meets.value = allMeets;
        groupsMap.value = groupMap;
    }

    async function deleteMeet(id: string) {
        await meetsRepository.deleteMeets([id]);
        await loadMeets();
    }

    async function bulkDeleteMeets(ids: string[]) {
        await meetsRepository.deleteMeets(ids);
        await loadMeets();
    }

    return {
        meets,
        groupsMap,
        loadMeets,
        deleteMeet,
        bulkDeleteMeets
    };
}
