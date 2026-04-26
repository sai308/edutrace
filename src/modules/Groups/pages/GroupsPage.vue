<script setup lang="ts">
import type { GroupFormData } from '../types/groups'
import { onMounted } from 'vue'
import { useGroups } from '../composables/useGroups'
import GroupsView from '../views/GroupsView.vue'

const { groups, memberCounts, allMeetIds, allTeachers, loadData, saveGroup, deleteGroup } =
    useGroups()

onMounted(loadData)

function handleSaveGroup(formData: GroupFormData): void {
    saveGroup(formData)
}

function handleDeleteGroup(id: string | number): void {
    deleteGroup(id)
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <GroupsView
            :groups="groups"
            :member-counts="memberCounts"
            :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers"
            @save-group="handleSaveGroup"
            @delete-group="handleDeleteGroup"
            @refresh="loadData"
        />
    </div>
</template>
