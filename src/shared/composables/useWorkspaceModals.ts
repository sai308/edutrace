import type { Workspace } from '@/shared/types/workspaces'
import { ref } from 'vue'
import { logger } from '@/shared/lib/logger'
import { settingsRepository } from '@/shared/services/settings.repository'
import { workspaceRepository } from '@/shared/services/workspace.repository'
import { currentWorkspaceId, loadWorkspaces } from './useWorkspace'

// Module-level modal state — shared between TeamSwitcher (trigger) and App (renderer)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const selectedWorkspace = ref<Workspace | null>(null)

function fadeOutAndReload() {
    document.body.style.transition = 'opacity 0.2s ease'
    document.body.style.opacity = '0'
    setTimeout(() => {
        window.location.reload()
    }, 200)
}

export function useWorkspaceModals() {
    const openCreateModal = () => {
        showCreateModal.value = true
    }

    const openEditModal = (e: Event, ws: Workspace) => {
        e.stopPropagation()
        selectedWorkspace.value = ws
        showEditModal.value = true
    }

    const openDeleteConfirm = (e: Event, ws: Workspace) => {
        e.stopPropagation()
        selectedWorkspace.value = ws
        showDeleteConfirm.value = true
    }

    const handleCreate = async (data: { name: string; icon: string; color?: string; copySettings?: boolean }) => {
        try {
            const options: any = { icon: data.icon, color: data.color }
            if (data.copySettings) {
                options.exportSettings = true
                options.getSettings = async () => ({
                    durationLimit: await settingsRepository.getDurationLimit(),
                    defaultTeacher: await settingsRepository.getDefaultTeacher(),
                    ignoredUsers: await settingsRepository.getIgnoredUsers(),
                    teachers: await settingsRepository.getTeachers(),
                    examSettings: await settingsRepository.getExamSettings(),
                })
                options.saveSettings = async (settings: any) => {
                    if (settings.durationLimit) await settingsRepository.saveDurationLimit(settings.durationLimit)
                    if (settings.defaultTeacher) await settingsRepository.saveDefaultTeacher(settings.defaultTeacher)
                    if (settings.ignoredUsers) await settingsRepository.saveIgnoredUsers(settings.ignoredUsers)
                    if (settings.teachers) await settingsRepository.saveTeachers(settings.teachers)
                    if (settings.examSettings) await settingsRepository.saveExamSettings(settings.examSettings)
                }
            }
            await workspaceRepository.createWorkspace(data.name, options)
            loadWorkspaces()
            showCreateModal.value = false
        } catch (e) {
            logger.error('Failed to create workspace', e)
        }
    }

    const handleUpdate = async (data: { name: string; icon: string; color?: string }) => {
        if (!selectedWorkspace.value) return
        try {
            await workspaceRepository.updateWorkspace(selectedWorkspace.value.id, {
                name: data.name,
                icon: data.icon,
                color: data.color,
            })
            loadWorkspaces()
            showEditModal.value = false
            selectedWorkspace.value = null
        } catch (e) {
            logger.error('Failed to update workspace', e)
        }
    }

    const handleDelete = async () => {
        if (!selectedWorkspace.value) return
        const id = selectedWorkspace.value.id
        try {
            await workspaceRepository.deleteWorkspace(id)
            if (currentWorkspaceId.value === id) {
                fadeOutAndReload()
            } else {
                loadWorkspaces()
            }
            showDeleteConfirm.value = false
            selectedWorkspace.value = null
        } catch (e) {
            logger.error('Failed to delete workspace', e)
        }
    }

    return {
        showCreateModal,
        showEditModal,
        showDeleteConfirm,
        selectedWorkspace,
        openCreateModal,
        openEditModal,
        openDeleteConfirm,
        handleCreate,
        handleUpdate,
        handleDelete,
    }
}
