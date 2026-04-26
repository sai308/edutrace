<script setup lang="ts">
import type { StudentFormData } from '@Students/types/students'
import { onMounted } from 'vue'
import { useStudents } from '../composables/useStudents'
import StudentsView from '../views/StudentsView.vue'

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
    isLoading,
} = useStudents()

onMounted(loadData)

function handleSaveStudent(payload: { formData: StudentFormData, originalStudent: any }) {
    saveStudent(payload.formData, payload.originalStudent ?? null)
}

function handleDeleteStudent(id: string) {
    deleteStudent(id)
}

function handleBulkDeleteStudents(ids: string[]) {
    bulkDeleteStudents(ids)
}
</script>

<template>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <StudentsView
            :students="students"
            :groups-map="groupsMap"
            :teachers="teachers"
            :meets="meets"
            :tasks="tasks"
            :is-loading="isLoading"
            @save-student="handleSaveStudent"
            @delete-student="handleDeleteStudent"
            @bulk-delete-students="handleBulkDeleteStudents"
            @refresh="loadData"
        />
    </div>
</template>
