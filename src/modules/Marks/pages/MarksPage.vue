<script setup lang="ts">
import type { Group } from '@/modules/Groups/types/groups'
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarks } from '../composables/useMarks'
import MarksView from '../views/MarksView.vue'

const route = useRoute()
const router = useRouter()

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
    saveManualMark,
    isLoading,
} = useMarks()

onMounted(async () => {
    // 1. Load auxiliary data
    await Promise.all([loadGroups(), loadSuggestions()])

    // 2. Determine initial group
    // Priority: URL query -> First available group -> None
    let targetGroup = route.query.group as string | undefined

    if (!targetGroup && groups.value.length > 0) {
        targetGroup = groups.value[0]!.name
        router.replace({ query: { ...route.query, group: targetGroup } })
    }

    // 3. Load Marks
    await loadMarksData(targetGroup)
})

// Watch for URL changes (e.g. user changes filter in MarksView)
watch(
    () => route.query.group,
    async (newGroup) => {
        await loadMarksData(newGroup as string | null)
    },
)

async function handleProcessFile(payload: { file: File; groupName: string }): Promise<void> {
    await processFile(payload.file, payload.groupName)
}

async function handleCreateGroup(groupData: Partial<Group>): Promise<Group> {
    const newGroup = await createGroup(groupData)
    await loadGroups() // Refresh group list so new group is available
    return newGroup
}

async function handleQueueComplete(): Promise<void> {
    // Reload all marks after the full import queue drains
    await loadMarksData(null)
}

function handleToggleSynced(mark: any) {
    toggleSynced(mark)
}

function handleDeleteMark(id: string | number) {
    deleteMark(id)
}

function handleBulkDeleteMarks(ids: (string | number)[]) {
    deleteMarks(ids)
}

function handleRefresh() {
    loadMarksData(route.query.group as string | null)
}

async function handleSaveManualMark(data: {
    groupName: string
    studentId: string
    taskId: string
    score: number
}) {
    await saveManualMark(data)
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MarksView
            :marks="flatMarks"
            :groups="groups"
            :is-processing="isProcessing"
            :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers"
            :is-loading="isLoading"
            :process-file-fn="handleProcessFile"
            :create-group-fn="handleCreateGroup"
            @toggle-synced="handleToggleSynced"
            @delete-mark="handleDeleteMark"
            @bulk-delete-marks="handleBulkDeleteMarks"
            @refresh="handleRefresh"
            @queue-complete="handleQueueComplete"
            @save-manual-mark="handleSaveManualMark"
        />
    </div>
</template>
