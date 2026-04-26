<script setup lang="ts">
import { watchEffect } from 'vue'
import DashboardHeader from '@/components/layout/DashboardHeader.vue'
import DashboardSidebar from '@/components/layout/DashboardSidebar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { useWorkspace } from '@/shared/composables/useWorkspace'

function contrastForeground(hex: string): string {
    const r = Number.parseInt(hex.slice(1, 3), 16) / 255
    const g = Number.parseInt(hex.slice(3, 5), 16) / 255
    const b = Number.parseInt(hex.slice(5, 7), 16) / 255
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    return luminance > 0.179 ? 'oklch(0.145 0 0)' : 'oklch(1 0 0)'
}

const { activeWorkspace } = useWorkspace()

watchEffect(() => {
    if (activeWorkspace.value?.color) {
        const color = activeWorkspace.value.color
        document.documentElement.style.setProperty('--workspace-color', color)
        document.documentElement.style.setProperty('--primary', color)
        document.documentElement.style.setProperty(
            '--primary-foreground',
            contrastForeground(color),
        )
    } else {
        document.documentElement.style.removeProperty('--workspace-color')
        document.documentElement.style.removeProperty('--primary')
        document.documentElement.style.removeProperty('--primary-foreground')
    }
})
</script>

<template>
    <SidebarProvider storage-key="sidebar" class="h-svh overflow-hidden">
        <DashboardSidebar class="transition-all duration-500" />
        <SidebarInset class="flex flex-col min-w-0 flex-1 overflow-hidden">
            <DashboardHeader class="shrink-0" />
            <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0 min-w-0">
                <div class="flex flex-col min-h-full">
                    <router-view />
                </div>
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>
