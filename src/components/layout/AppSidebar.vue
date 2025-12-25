<script setup lang="ts">
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    SidebarRail
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
    FileText,
    LayoutDashboard,
    Users,
    UserRoundSearch,
    Star,
    Layers,
    FileBadge,
    Settings,
    Info,
    BookOpen,
    Github,
} from 'lucide-vue-next'

import AppModeToggle from "@/components/layout/AppModeToggle.vue"

// Menu definition
const navGroups = [
    {
        label: 'Відвідуваність',
        items: [
            { title: 'Звіти', url: '/reports', icon: FileText },
            { title: 'Аналітика', url: '/', icon: LayoutDashboard },
        ]
    },
    {
        label: 'Організація',
        items: [
            { title: 'Групи', url: '/groups', icon: Users },
            { title: 'Студенти', url: '/students', icon: UserRoundSearch },
        ]
    },
    {
        label: 'Контроль',
        items: [
            { title: 'Оцінки', url: '/marks', icon: Star },
            { title: 'Модулі', url: '/modules', icon: Layers },
            { title: 'Підсумки', url: '/summary', icon: FileBadge },
        ]
    },
    {
        label: 'Документи',
        items: [
            { title: 'Відомості', url: '/docs/session', icon: FileText },
        ]
    },

]
</script>

<template>
    <Sidebar collapsible="icon">
        <SidebarHeader>
            <div class="flex items-center gap-2 px-2 py-2">
                <div
                    class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <LayoutDashboard class="size-4" />
                </div>
                <div class="flex flex-col gap-0.5 leading-none">
                    <span class="font-semibold">EduTrace</span>
                    <span class="text-xs text-muted-foreground">v2.0</span>
                </div>
            </div>
            <Separator />
        </SidebarHeader>

        <SidebarContent>
            <SidebarGroup v-for="group in navGroups" :key="group.label">
                <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem v-for="item in group.items" :key="item.title">
                            <SidebarMenuButton as-child>
                                <a v-if="item.url.startsWith('http')" :href="item.url" target="_blank"
                                    rel="noopener noreferrer">
                                    <component :is="item.icon" />
                                    <span>{{ item.title }}</span>
                                </a>
                                <router-link v-else :to="item.url">
                                    <component :is="item.icon" />
                                    <span>{{ item.title }}</span>
                                </router-link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton as-child>
                        <a href="#">
                            <Settings />
                            <span>Налаштування</span>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <Separator />

            <div class="flex items-center justify-around px-2 py-2 group-data-[collapsible=icon]:hidden">
                <SidebarMenuButton as-child>
                    <AppModeToggle />
                </SidebarMenuButton>

                <SidebarMenuButton as-child size="sm" class="w-fit h-fit p-2" tooltip="Про нас">
                    <router-link to="/about">
                        <Info class="size-4" />
                    </router-link>
                </SidebarMenuButton>

                <SidebarMenuButton as-child size="sm" class="w-fit h-fit p-2" tooltip="Посібник">
                    <router-link to="/guide">
                        <BookOpen class="size-4" />
                    </router-link>
                </SidebarMenuButton>

                <SidebarMenuButton as-child size="sm" class="w-fit h-fit p-2" tooltip="GitHub">
                    <a href="https://github.com/sai308/edutrace-local" target="_blank">
                        <Github class="size-4" />
                    </a>
                </SidebarMenuButton>
            </div>
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>