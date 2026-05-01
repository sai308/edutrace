<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'

defineProps<{
    items: {
        name: string
        url: string
        icon: LucideIcon
        isActive?: boolean
    }[]
}>()

function isExternal(url: string) {
    return url.startsWith('http://') || url.startsWith('https://')
}
</script>

<template>
    <SidebarGroup>
        <SidebarGroupLabel class="group-data-[collapsible=icon]:hidden">
            {{ $t('nav.other') }}
        </SidebarGroupLabel>
        <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.name">
                <SidebarMenuButton as-child :is-active="item.isActive" :tooltip="item.name">
                    <a
                        v-if="isExternal(item.url)"
                        :href="item.url"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <component :is="item.icon" />
                        <span>{{ item.name }}</span>
                    </a>
                    <RouterLink v-else :to="item.url">
                        <component :is="item.icon" />
                        <span>{{ item.name }}</span>
                    </RouterLink>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
