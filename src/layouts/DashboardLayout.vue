<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Separator } from "@/components/ui/separator"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "@/components/layout/AppSidebar.vue"

const route = useRoute()

// Simply read the title key from the route's metadata
const pageTitle = computed(() => (route.meta.title as string) || 'app.title')

</script>

<template>
    <SidebarProvider storage-key="sidebar">
        <AppSidebar />

        <SidebarInset>
            <header
                class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div class="flex items-center gap-2 px-4">
                    <SidebarTrigger class="-ml-1" />
                    <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
                    <h1 class="text-lg font-semibold pointer-events-none select-none">{{ $t(pageTitle) }}</h1>
                </div>
            </header>
            <div class="flex flex-1 flex-col gap-4 p-8">
                <RouterView />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>