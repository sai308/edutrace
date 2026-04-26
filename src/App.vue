<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt.vue'
import Toaster from '@/components/Toaster.vue'
import DeleteConfirmationModal from '@/components/workspace/DeleteConfirmationModal.vue'
import WorkspaceModal from '@/components/workspace/WorkspaceModal.vue'
import { useWorkspaceModals } from '@/shared/composables/useWorkspaceModals'

const { locale } = useI18n()
watchEffect(() => {
    document.documentElement.lang = locale.value
})

const {
    showCreateModal,
    showEditModal,
    showDeleteConfirm,
    selectedWorkspace,
    handleCreate,
    handleUpdate,
    handleDelete,
} = useWorkspaceModals()
</script>

<template>
    <RouterView />
    <Toaster />
    <PwaUpdatePrompt />

    <!-- Workspace modals live here, outside the Sidebar component tree,
       so they don't inherit the Sheet's Reka UI focus trap context. -->
    <WorkspaceModal
        :open="showCreateModal"
        mode="create"
        @update:open="showCreateModal = $event"
        @submit="handleCreate"
    />

    <WorkspaceModal
        :open="showEditModal"
        mode="edit"
        :workspace-data="selectedWorkspace || {}"
        @update:open="showEditModal = $event"
        @submit="handleUpdate"
    />

    <DeleteConfirmationModal
        :open="showDeleteConfirm"
        :workspace-name="selectedWorkspace?.name || ''"
        @update:open="showDeleteConfirm = $event"
        @confirm="handleDelete"
    />
</template>
