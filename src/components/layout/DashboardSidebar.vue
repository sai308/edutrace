<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'
import {
    BookOpen,
    BookOpenCheck,
    Download,
    FileBadge,
    FileClock,
    FileSpreadsheet,
    FileText,
    FileUser,
    Github,
    GraduationCap,
    IdCardLanyard,
    Info,
    Layers,
    LayoutDashboard,
    ListTodo,
    Settings,
    Settings2,
    Star,
    UserCheck,
    UserRoundSearch,
    Users,
} from 'lucide-vue-next'

import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import NavMain from '@/components/NavMain.vue'
import NavOther from '@/components/NavOther.vue'
import TeamSwitcher from '@/components/TeamSwitcher.vue'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'

import { usePwaInstall } from '@/shared/composables/usePwaInstall'

const props = withDefaults(defineProps<SidebarProps>(), {
    collapsible: 'icon',
})

const route = useRoute()
const { isMobile, setOpenMobile } = useSidebar()
const { isInstallable, install } = usePwaInstall()
const { t } = useI18n()

// Auto-close sidebar on mobile after navigation
watch(
    () => route.fullPath,
    () => {
        if (isMobile.value) {
            setOpenMobile(false)
        }
    },
)

const data = computed(() => {
    return {
        navMain: [
            {
                title: t('nav.navGroups.attendance'),
                url: '/attendance',
                icon: UserCheck,
                isOpened: route.path.startsWith('/attendance'),
                items: [
                    {
                        title: t('nav.analytics'),
                        icon: LayoutDashboard,
                        url: '/attendance/analytics',
                        isActive: route.path.startsWith('/attendance/analytics'),
                    },
                    {
                        title: t('nav.reports'),
                        icon: FileClock,
                        url: '/attendance/reports',
                        isActive: route.path.startsWith('/attendance/reports'),
                    },
                    {
                        title: t('app.settings'),
                        icon: Settings2,
                        url: '/attendance/settings',
                        isActive: route.path.startsWith('/attendance/settings'),
                    },
                ],
            },
            {
                title: t('nav.navGroups.organization'),
                url: '/org',
                icon: GraduationCap,
                isOpened: route.path.startsWith('/org'),
                items: [
                    {
                        title: t('nav.groups'),
                        icon: IdCardLanyard,
                        url: '/org/groups',
                        isActive: route.path.startsWith('/org/groups'),
                    },
                    {
                        title: t('nav.students'),
                        icon: UserRoundSearch,
                        url: '/org/students',
                        isActive: route.path.startsWith('/org/students'),
                    },
                    {
                        title: t('members.title'),
                        icon: Users,
                        url: '/org/members',
                        isActive: route.path.startsWith('/org/members'),
                    },
                    {
                        title: t('app.settings'),
                        icon: Settings2,
                        url: '/org/settings',
                        isActive: route.path.startsWith('/org/settings'),
                    },
                ],
            },
            {
                title: t('nav.navGroups.control'),
                url: '/control',
                icon: FileBadge,
                isOpened: route.path.startsWith('/control'),
                items: [
                    {
                        title: t('nav.marks'),
                        icon: Star,
                        url: '/control/marks',
                        isActive: route.path.startsWith('/control/marks'),
                    },
                    {
                        title: t('tasks.title'),
                        icon: ListTodo,
                        url: '/control/tasks',
                        isActive: route.path.startsWith('/control/tasks'),
                    },
                    {
                        title: t('nav.modules'),
                        icon: Layers,
                        url: '/control/modules',
                        isActive: route.path.startsWith('/control/modules'),
                    },
                    {
                        title: t('nav.summaries'),
                        icon: BookOpenCheck,
                        url: '/control/summaries',
                        isActive: route.path.startsWith('/control/summaries'),
                    },
                    {
                        title: t('app.settings'),
                        icon: Settings2,
                        url: '/control/settings',
                        isActive: route.path.startsWith('/control/settings'),
                    },
                ],
            },
            {
                title: t('nav.navGroups.documentation'),
                url: '/documents',
                icon: FileText,
                isOpened: route.path.startsWith('/documents'),
                items: [
                    {
                        title: t('nav.session'),
                        icon: FileSpreadsheet,
                        url: '/documents/session',
                        isActive: route.path.startsWith('/documents/session'),
                    },
                    {
                        title: t('nav.individual'),
                        icon: FileUser,
                        url: '/documents/individual',
                        isActive: route.path.startsWith('/documents/individual'),
                    },
                    {
                        title: t('app.settings'),
                        icon: Settings2,
                        url: '/documents/settings',
                        isActive: route.path.startsWith('/documents/settings'),
                    },
                ],
            },
        ],
        navOther: [
            {
                name: t('nav.settings'),
                url: '/settings',
                icon: Settings,
                isActive: route.path === '/settings',
            },
            {
                name: t('footer.about'),
                url: '/about',
                icon: Info,
            },
            {
                name: t('nav.guide'),
                url: '/guide',
                icon: BookOpen,
            },
            {
                name: 'GitHub',
                url: 'https://github.com/sai308/edutrace-local',
                icon: Github,
            },
        ],
    }
})
</script>

<template>
    <Sidebar v-bind="props" variant="floating">
        <SidebarHeader>
            <div class="h-px rounded-full mx-3 mt-1 ws-gradient-bar" />
            <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
            <NavMain :items="data.navMain" />
        </SidebarContent>
        <!-- Fix: Remove padding when sidebar is collapsed -->
        <SidebarFooter class="group-data-[collapsible=icon]:p-0">
            <SidebarMenu v-if="isInstallable" class="px-2 pb-1">
                <SidebarMenuItem>
                    <SidebarMenuButton :tooltip="$t('pwa.install')" @click="install">
                        <Download />
                        <span>{{ $t('pwa.install') }}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <NavOther :items="data.navOther" />
        </SidebarFooter>
    </Sidebar>
</template>

<style scoped>
.ws-gradient-bar {
    background: linear-gradient(
        to right,
        transparent,
        color-mix(in srgb, var(--workspace-color), transparent 44%),
        transparent
    );
}

:deep([data-active='true']) {
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--workspace-color), transparent 20%);
}

:deep([data-active='true'] svg) {
    color: var(--workspace-color) !important;
}
</style>
