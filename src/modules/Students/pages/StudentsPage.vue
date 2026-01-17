<script setup>
import { onMounted } from 'vue';
import StudentsView from '../views/StudentsView.vue';
import { useStudents } from '../composables/useStudents';

const {
    students,
    groupsMap,
    teachers,
    meets,
    tasks,
    loadData,
    saveStudent,
    deleteStudent,
    bulkDeleteStudents,
    isLoading
} = useStudents();

onMounted(loadData);

function handleSaveStudent(payload) {
    // payload is { formData, originalStudent }
    saveStudent(payload.formData, payload.originalStudent);
}

function handleDeleteStudent(id) {
    deleteStudent(id);
}

function handleBulkDeleteStudents(ids) {
    bulkDeleteStudents(ids);
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <StudentsView :students="students" :groups-map="groupsMap" :teachers="teachers" :meets="meets" :tasks="tasks"
            :is-loading="isLoading" @save-student="handleSaveStudent" @delete-student="handleDeleteStudent"
            @bulk-delete-students="handleBulkDeleteStudents" @refresh="loadData" />
    </div>
</template>
