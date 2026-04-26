import type { Workspace } from '@/shared/types/workspaces'
import { computed, onMounted, ref } from 'vue'
import { workspaceRepository } from '@/shared/services/workspace.repository'

// Module-level singletons — shared across all composable calls
export const workspaces = ref<Workspace[]>([])
export const currentWorkspaceId = ref('')
export const activeWorkspace = computed(
    () => workspaces.value.find(ws => ws.id === currentWorkspaceId.value) || workspaces.value[0],
)

export function loadWorkspaces() {
    workspaces.value = workspaceRepository.getWorkspaces()
    currentWorkspaceId.value = workspaceRepository.getCurrentWorkspaceId()
}

export function useWorkspace() {
    onMounted(loadWorkspaces)

    return {
        workspaces,
        currentWorkspaceId,
        activeWorkspace,
        loadWorkspaces,
    }
}
