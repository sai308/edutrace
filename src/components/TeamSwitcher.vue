<script setup lang="ts">
import { Check, ChevronsUpDown, Database, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import { computed, ref } from 'vue'
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

import { useWorkspace } from '@/shared/composables/useWorkspace'
import { useWorkspaceModals } from '@/shared/composables/useWorkspaceModals'
import { logger } from '@/shared/lib/logger'
import { workspaceRepository } from '@/shared/services/workspace.repository'

// --- State ---
const { isMobile, setOpenMobile } = useSidebar()
const router = useRouter()
const { workspaces, currentWorkspaceId, activeWorkspace } = useWorkspace()
const { openCreateModal, openEditModal, openDeleteConfirm } = useWorkspaceModals()
const isSwitching = ref(false)

// --- Computed ---
const sortedWorkspaces = computed(() => workspaces.value)

// --- Actions ---
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
        await workspaceRepository.switchWorkspace(id, () => {})
        fadeOutAndReload()
    }
    catch (e) {
        logger.error('Failed to switch workspace', e)
        isSwitching.value = false
    }
}

function handleOpenCreateModal() {
    if (isMobile.value)
        setOpenMobile(false)
    openCreateModal()
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
                            class="flex aspect-square size-8 items-center justify-center rounded-lg border"
                            style="
                                background-color: color-mix(in srgb, var(--workspace-color), transparent 92%);
                                border-color: color-mix(in srgb, var(--workspace-color), transparent 75%);
                                box-shadow: 0 0 10px color-mix(in srgb, var(--workspace-color), transparent 87%);
                                color: var(--workspace-color);
                            "
                        >
                            <component :is="getIcon(activeWorkspace?.icon)" class="size-4" />
                        </div>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-medium">
                                {{ activeWorkspace?.name }}
                            </span>
                            <span class="truncate text-xs">{{ $t('app.title') }}</span>
                        </div>
                        <ChevronsUpDown class="ml-auto" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    class="w-[--reka-dropdown-menu-trigger-width] min-w-56 max-w-[calc(100vw-2rem)] rounded-lg"
                    align="start"
                    :side="isMobile ? 'bottom' : 'right'"
                    :side-offset="4"
                >
                    <DropdownMenuLabel class="text-xs text-muted-foreground flex justify-between items-center">
                        {{ $t('workspace.title') }}
                        <button class="hover:text-primary transition-colors" @click="goToGuide">
                            <HelpCircle class="size-3.5" />
                        </button>
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        v-for="ws in sortedWorkspaces"
                        :key="ws.id"
                        class="gap-2 p-2 group relative cursor-pointer"
                        @click="handleSwitch(ws.id)"
                    >
                        <div
                            class="flex size-6 items-center justify-center rounded-sm border"
                            :style="{
                                backgroundColor: ws.color ? `${ws.color}15` : undefined,
                                borderColor: ws.color ? `${ws.color}40` : undefined,
                                boxShadow: ws.color ? `0 0 10px ${ws.color}20` : undefined,
                            }"
                        >
                            <component
                                :is="getIcon(ws.icon)"
                                class="size-3.5 shrink-0"
                                :style="{ color: ws.color }"
                                :class="{ 'text-muted-foreground': !ws.color }"
                            />
                        </div>
                        <span class="flex-1 truncate pr-8">{{ ws.name }}</span>

                        <!-- Check icon for active workspace -->
                        <Check
                            v-if="ws.id === currentWorkspaceId"
                            class="size-4 text-primary absolute right-2 transition-opacity duration-200"
                            :class="{
                                'opacity-0': ws.id !== 'default' && (isMobile || 'group-hover:opacity-0'),
                            }"
                        />

                        <!-- Action buttons for non-default workspaces -->
                        <div
                            v-if="ws.id !== 'default'"
                            class="absolute right-1 flex items-center gap-1 transition-opacity duration-200 bg-popover/90 backdrop-blur-sm rounded-md shadow-sm border p-0.5"
                            :class="{
                                'opacity-100': isMobile,
                                'opacity-0 group-hover:opacity-100': !isMobile,
                            }"
                            @click.stop
                        >
                            <button
                                class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground touch-none"
                                :title="$t('workspace.edit')"
                                @click="openEditModal($event, ws)"
                            >
                                <Pencil class="size-3" />
                            </button>
                            <div class="w-px h-3 bg-border" />
                            <button
                                class="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive touch-none"
                                :title="$t('common.delete')"
                                @click="openDeleteConfirm($event, ws)"
                            >
                                <Trash2 class="size-3" />
                            </button>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="gap-2 p-2 cursor-pointer" @click="handleOpenCreateModal">
                        <div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
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
</template>
