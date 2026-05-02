<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'

import { ChevronRight } from 'lucide-vue-next'
import { ref, watch } from 'vue'
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

interface NavSubItem {
    isActive?: boolean
    icon?: LucideIcon
    title: string
    url: string
}

interface NavItem {
    title: string
    url: string
    icon?: LucideIcon
    isOpened?: boolean
    items?: NavSubItem[]
}

const props = defineProps<{ items: NavItem[] }>()

const { open, setOpen } = useSidebar()

const sectionState = ref<Record<string, boolean>>({})

watch(
    () => props.items,
    (items) => {
        items.forEach((item) => {
            if (item.isOpened)
                sectionState.value[item.url] = true
        })
    },
    { immediate: true },
)

function getOpen(item: NavItem) {
    return sectionState.value[item.url] ?? item.isOpened ?? false
}

function setItemOpen(item: NavItem, val: boolean) {
    sectionState.value[item.url] = val
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
                :open="getOpen(item)"
                class="group/collapsible"
                @update:open="val => setItemOpen(item, val)"
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
                                    <router-link :to="subItem.url">
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
