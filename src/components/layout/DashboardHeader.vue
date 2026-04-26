<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppStatusIndicator from '@/components/AppStatusIndicator.vue'

import AppThemeSwitcher from '@/components/layout/AppThemeSwitcher.vue'

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const route = useRoute()

interface NavBreadcrumb {
    title: string
    path: string
}

// Simply read the title key from the route's metadata
const pageTitle = computed(() => (route.meta.title as string) || 'app.title')
const breadcrumbs = computed(() => (route.meta.breadcrumbs as NavBreadcrumb[]) || [])
</script>

<template>
    <header
        class="relative flex h-16 shrink-0 items-center gap-2 mb-4 transition-[width,height,border-color] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b-2 border-transparent"
        :style="{
            borderBottomColor: 'color-mix(in srgb, var(--workspace-color), transparent 81%)',
        }"
    >
        <div class="flex items-center gap-2 px-4">
            <SidebarTrigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
                <BreadcrumbList>
                    <template v-for="breadcrumb in breadcrumbs" :key="breadcrumb.title">
                        <BreadcrumbItem class="hidden md:block">
                            <BreadcrumbLink :href="breadcrumb.path">
                                {{ $t(breadcrumb.title) }}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator class="hidden md:block" />
                    </template>
                    <BreadcrumbItem :key="pageTitle">
                        <BreadcrumbPage>{{ $t(pageTitle) }}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </div>
        <RouterLink to="/" class="absolute left-1/2 -translate-x-1/2 select-none">
            <img src="/edutrace-logo.svg" class="h-7" alt="EduTrace">
        </RouterLink>
        <div class="ml-auto flex items-center gap-1 px-4">
            <AppStatusIndicator />
            <AppThemeSwitcher />
        </div>
    </header>
</template>
