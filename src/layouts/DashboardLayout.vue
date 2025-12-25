<script setup lang="ts">
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "@/components/layout/AppSidebar.vue"
</script>

<template>
    <SidebarProvider storage-key="sidebar">
        <AppSidebar />

        <SidebarInset>

            <SidebarTrigger class="sticky top-1 z-50" />

            <div class="flex flex-1 flex-col gap-4 p-8">
                <RouterView />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>