<script setup>
import { onMounted } from 'vue';
import GroupsView from '../views/GroupsView.vue';
import { useGroups } from '../composables/useGroups';

const {
    groups,
    memberCounts,
    allMeetIds,
    allTeachers,
    loadData,
    saveGroup,
    deleteGroup
} = useGroups();

onMounted(loadData);

function handleSaveGroup(formData) {
    saveGroup(formData);
}

function handleDeleteGroup(id) {
    deleteGroup(id);
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <GroupsView :groups="groups" :member-counts="memberCounts" :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers" @save-group="handleSaveGroup" @delete-group="handleDeleteGroup"
            @refresh="loadData" />
    </div>
</template>
