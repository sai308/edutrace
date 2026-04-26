<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'

import { ChevronRight } from 'lucide-vue-next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar'

defineProps<{
    items: {
        title: string
        url: string
        icon?: LucideIcon
        isOpened?: boolean
        items?: {
            isActive?: boolean
            icon?: LucideIcon
            title: string
            url: string
        }[]
    }[]
}>()

const { open, setOpen, isMobile, setOpenMobile } = useSidebar()

function closeSidebarOnMobile() {
    if (isMobile?.value) {
        setOpenMobile(false)
    }
}
</script>

<template>
    <!-- Fix: scroll appears when collapsed too fast -->
    <SidebarGroup class="overflow-hidden">
        <SidebarGroupLabel>{{ $t('nav.processes') }}</SidebarGroupLabel>
        <SidebarMenu>
            <Collapsible
                v-for="item in items"
                :key="item.title"
                as-child
                :default-open="item.isOpened"
                class="group/collapsible"
            >
                <SidebarMenuItem>
                    <CollapsibleTrigger as-child>
                        <SidebarMenuButton :tooltip="item.title" @click="!open && setOpen(true)">
                            <component :is="item.icon" v-if="item.icon" />
                            <span class="group-data-[collapsible=icon]:hidden">{{
                                item.title
                            }}</span>
                            <ChevronRight
                                class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            <SidebarMenuSubItem v-for="subItem in item.items" :key="subItem.title">
                                <SidebarMenuSubButton as-child :is-active="subItem.isActive">
                                    <router-link :to="subItem.url" @click="closeSidebarOnMobile">
                                        <component :is="subItem.icon" v-if="subItem.icon" />
                                        <span>{{ subItem.title }}</span>
                                    </router-link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        </SidebarMenu>
    </SidebarGroup>
</template>
