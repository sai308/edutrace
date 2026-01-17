<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MarksView from '../views/MarksView.vue';
import { useMarks } from '../composables/useMarks';
import type { Group } from '@/modules/Groups/types/groups';

const route = useRoute();
const router = useRouter();

const {
    groups,
    flatMarks,
    isProcessing,
    allMeetIds,
    allTeachers,
    loadMarksData,
    loadGroups,
    loadSuggestions,
    createGroup,
    processFile,
    toggleSynced,
    deleteMark,
    deleteMarks,
    isLoading
} = useMarks();

onMounted(async () => {
    // 1. Load auxiliary data
    await Promise.all([
        loadGroups(),
        loadSuggestions()
    ]);

    // 2. Determine initial group
    // Priority: URL query -> First available group -> None
    let targetGroup = route.query.group as string | undefined;

    if (!targetGroup && groups.value.length > 0) {
        targetGroup = groups.value[0].name;
        // Sync URL without triggering a navigation stack push if possible, 
        // but replace is good. 
        // Note: useQuerySync in MarksView might also try to sync. 
        // We set it here so MarksView picks it up.
        router.replace({ query: { ...route.query, group: targetGroup } });
    }

    // 3. Load Marks
    await loadMarksData(targetGroup);
});

// Watch for URL changes (e.g. user changes filter in MarksView)
watch(() => route.query.group, async (newGroup) => {
    await loadMarksData(newGroup as string | null);
});

async function handleProcessFile(payload: { file: File; groupName: string }) {
    await processFile(payload.file, payload.groupName);
    // Switch view to the imported group
    router.replace({ query: { ...route.query, group: payload.groupName } });
}

function handleCreateGroup(groupData: Partial<Group>) {
    createGroup(groupData);
}

function handleToggleSynced(mark: any) {
    toggleSynced(mark);
}

function handleDeleteMark(id: string | number) {
    deleteMark(id);
}

function handleBulkDeleteMarks(ids: (string | number)[]) {
    deleteMarks(ids);
}

function handleRefresh() {
    loadMarksData(route.query.group as string | null);
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MarksView :marks="flatMarks" :groups="groups" :is-processing="isProcessing" :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers" :is-loading="isLoading" @process-file="handleProcessFile"
            @create-group="handleCreateGroup" @toggle-synced="handleToggleSynced" @delete-mark="handleDeleteMark"
            @bulk-delete-marks="handleBulkDeleteMarks" @refresh="handleRefresh" />
    </div>
</template>
