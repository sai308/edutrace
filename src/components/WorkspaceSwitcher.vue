<script setup lang="ts">
import type { Workspace } from '@/shared/types/workspaces'
import { Check, ChevronsUpDown, Database, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import DeleteConfirmationModal from '@/components/workspace/DeleteConfirmationModal.vue'
import WorkspaceModal from '@/components/workspace/WorkspaceModal.vue'
import { logger } from '@/shared/lib/logger'
import { settingsRepository } from '@/shared/services/settings.repository'
import { workspaceRepository } from '@/shared/services/workspace.repository'

// --- State ---
const { isMobile, setOpenMobile } = useSidebar()
const router = useRouter()
const workspaces = ref<Workspace[]>([])
const currentWorkspaceId = ref('')
const isSwitching = ref(false)

// --- Modals State ---
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const selectedWorkspace = ref<Workspace | null>(null)

// --- Computed ---
const activeWorkspace = computed(
    () => workspaces.value.find(ws => ws.id === currentWorkspaceId.value) || workspaces.value[0],
)

const sortedWorkspaces = computed(() => {
    // Return all workspaces, assuming 'default' is always first or we sort it.
    // Repo returns default first if empty, but let's ensure default is at top if we want.
    // For now, just return as is (Repo handles order mostly).
    return workspaces.value
})

// --- Actions ---

function loadWorkspaces() {
    workspaces.value = workspaceRepository.getWorkspaces()
    currentWorkspaceId.value = workspaceRepository.getCurrentWorkspaceId()
}

function fadeOutAndReload() {
    document.body.style.transition = 'opacity 0.2s ease'
    document.body.style.opacity = '0'
    setTimeout(() => {
        window.location.reload()
    }, 200)
}

async function handleSwitch(id: string) {
    if (id === currentWorkspaceId.value || isSwitching.value)
        return

    try {
        isSwitching.value = true
        await workspaceRepository.switchWorkspace(id, () => {
            // Optional loading callback
        })
        fadeOutAndReload()
    }
    catch (e) {
        logger.error('Failed to switch workspace', e)
        isSwitching.value = false
    }
}

function openCreateModal() {
    showCreateModal.value = true
    if (isMobile.value)
        setOpenMobile(false)
}

async function handleCreate(data: { name: string, icon: string, copySettings?: boolean }) {
    try {
        const options: any = { icon: data.icon }

        if (data.copySettings) {
            options.exportSettings = true
            options.getSettings = async () => ({
                durationLimit: await settingsRepository.getDurationLimit(),
                defaultTeacher: await settingsRepository.getDefaultTeacher(),
                ignoredUsers: await settingsRepository.getIgnoredUsers(),
                teachers: await settingsRepository.getTeachers(),
                examSettings: await settingsRepository.getExamSettings(),
            })
            // We use the same repository to save to the NEW workspace context
            options.saveSettings = async (settings: any) => {
                if (settings.durationLimit)
                    await settingsRepository.saveDurationLimit(settings.durationLimit)
                if (settings.defaultTeacher)
                    await settingsRepository.saveDefaultTeacher(settings.defaultTeacher)
                if (settings.ignoredUsers)
                    await settingsRepository.saveIgnoredUsers(settings.ignoredUsers)
                if (settings.teachers)
                    await settingsRepository.saveTeachers(settings.teachers)
                if (settings.examSettings)
                    await settingsRepository.saveExamSettings(settings.examSettings)
            }
        }

        await workspaceRepository.createWorkspace(data.name, options)
        loadWorkspaces()
        showCreateModal.value = false
    }
    catch (e) {
        logger.error('Failed to create workspace', e)
    }
}

function openEditModal(e: Event, ws: Workspace) {
    e.stopPropagation() // Prevent dropdown item click
    selectedWorkspace.value = ws
    showEditModal.value = true
    if (isMobile.value)
        setOpenMobile(false)
}

async function handleUpdate(data: { name: string, icon: string }) {
    if (!selectedWorkspace.value)
        return
    try {
        await workspaceRepository.updateWorkspace(selectedWorkspace.value.id, {
            name: data.name,
            icon: data.icon,
        })
        loadWorkspaces()
        showEditModal.value = false
        selectedWorkspace.value = null
    }
    catch (e) {
        logger.error('Failed to update workspace', e)
    }
}

function openDeleteConfirm(e: Event, ws: Workspace) {
    e.stopPropagation()
    selectedWorkspace.value = ws
    showDeleteConfirm.value = true
    if (isMobile.value)
        setOpenMobile(false)
}

async function handleDelete() {
    if (!selectedWorkspace.value)
        return
    const id = selectedWorkspace.value.id
    try {
        await workspaceRepository.deleteWorkspace(id)

        // If we deleted the active workspace (handled by repo, but we need to reload UI)
        if (currentWorkspaceId.value === id) {
            fadeOutAndReload()
        }
        else {
            loadWorkspaces()
        }

        showDeleteConfirm.value = false
        selectedWorkspace.value = null
    }
    catch (e) {
        logger.error('Failed to delete workspace', e)
    }
}

function goToGuide() {
    router.push('/guide#workspaces')
    if (isMobile.value)
        setOpenMobile(false)
}

function getIcon(name?: string) {
    if (!name)
        return Database
    return ((LucideIcons as Record<string, unknown>)[name] as typeof Database) ?? Database
}

onMounted(() => {
    loadWorkspaces()
})
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        <div
                            class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                        >
                            <component :is="getIcon(activeWorkspace?.icon)" class="size-4" />
                        </div>

                        <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                            <span class="truncate font-semibold">{{ activeWorkspace?.name }}</span>
                            <span class="truncate text-xs text-muted-foreground">{{ $t('app.title') }}</span>
                        </div>

                        <ChevronsUpDown class="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    class="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    :side="isMobile ? 'bottom' : 'right'"
                    align="start"
                    :side-offset="4"
                >
                    <DropdownMenuLabel
                        class="text-xs text-muted-foreground uppercase tracking-wider flex justify-between items-center"
                    >
                        {{ $t('workspace.title') }}
                        <button class="hover:text-primary transition-colors" @click="goToGuide">
                            <HelpCircle class="size-3.5" />
                        </button>
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                        v-for="ws in sortedWorkspaces"
                        :key="ws.id"
                        class="gap-2 p-2 group relative cursor-pointer"
                        :class="{
                            'focus:bg-primary/10 bg-primary/10': ws.id === currentWorkspaceId,
                        }"
                        @click="handleSwitch(ws.id)"
                    >
                        <div class="flex size-6 items-center justify-center rounded-sm border bg-background">
                            <component :is="getIcon(ws.icon)" class="size-4 shrink-0" />
                        </div>
                        <span class="flex-1 truncate pr-8">{{ ws.name }}</span>

                        <!-- Check icon for active workspace -->
                        <Check v-if="ws.id === currentWorkspaceId" class="size-4 text-primary absolute right-2" />

                        <!-- Action buttons for non-default/active workspaces (or just non-default) -->
                        <!-- Requirements: Default workspace protected. -->
                        <div
                            v-if="ws.id !== 'default'"
                            class="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md shadow-sm border p-0.5"
                            @click.stop
                        >
                            <button
                                class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                :title="$t('workspace.edit')"
                                @click="openEditModal($event, ws)"
                            >
                                <Pencil class="size-3" />
                            </button>
                            <div class="w-px h-3 bg-border" />
                            <button
                                class="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                :title="$t('common.delete')"
                                @click="openDeleteConfirm($event, ws)"
                            >
                                <Trash2 class="size-3" />
                            </button>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem class="gap-2 p-2 cursor-pointer" @click="openCreateModal">
                        <div class="flex size-6 items-center justify-center rounded-md border bg-background">
                            <Plus class="size-4" />
                        </div>
                        <div class="font-medium text-muted-foreground">
                            {{ $t('workspace.create_new') }}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>

    <!-- Modals (Teleported) -->
    <Teleport to="body">
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
    </Teleport>
</template>
