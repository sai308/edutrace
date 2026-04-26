import { createRouter, createWebHistory } from 'vue-router'

import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { logger } from '@/shared/lib/logger'
import { databaseService } from '@/shared/services/DatabaseService'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: DashboardLayout,
            children: [
                {
                    path: 'settings',
                    name: 'GlobalSettings',
                    component: () => import('@/pages/GlobalSettingsPage.vue'),
                    meta: {
                        title: 'globalSettings.title',
                        breadcrumbs: [{ title: 'globalSettings.title', path: '/settings' }],
                    },
                },
                {
                    path: '',
                    redirect: '/attendance/analytics',
                },
                {
                    path: 'attendance/analytics',
                    name: 'Analytics',
                    component: () => import('@/modules/Analytics/pages/AnalyticsPage.vue'),
                    meta: {
                        title: 'nav.analytics',
                        breadcrumbs: [{ title: 'nav.navGroups.attendance', path: '/attendance/analytics' }],
                    },
                },
                {
                    path: 'attendance/analytics/:id',
                    name: 'AnalyticsDetails',
                    component: () => import('@/modules/Analytics/pages/AnalyticsDetailsPage.vue'),
                    props: true,
                    meta: {
                        title: 'analytics.details.subtitle',
                        breadcrumbs: [
                            { title: 'nav.navGroups.attendance', path: '/attendance/analytics' },
                            { title: 'nav.analytics', path: '/attendance/analytics' },
                        ],
                    },
                },
                {
                    path: 'attendance/reports',
                    name: 'reports',
                    component: () => import('@/modules/Reports/pages/ReportsPage.vue'),
                    meta: {
                        title: 'nav.reports',
                        breadcrumbs: [{ title: 'nav.navGroups.attendance', path: '/attendance/analytics' }],
                    },
                },
                {
                    path: 'attendance/settings',
                    name: 'ReportsSettings',
                    component: () => import('@/modules/Settings/pages/ReportsSettingsPage.vue'),
                    meta: {
                        title: 'nav.settings',
                        breadcrumbs: [{ title: 'nav.navGroups.attendance', path: '/attendance/analytics' }],
                    },
                },
                {
                    path: 'attendance/reports/:id',
                    name: 'ReportDetails',
                    component: () => import('@/modules/Reports/pages/ReportDetailsPage.vue'),
                    meta: {
                        title: 'reports.details.title',
                        breadcrumbs: [
                            { title: 'nav.navGroups.attendance', path: '/attendance/analytics' },
                            { title: 'nav.reports', path: '/attendance/reports' },
                        ],
                    },
                },
                {
                    path: 'org/groups',
                    name: 'Groups',
                    component: () => import('@/modules/Groups/pages/GroupsPage.vue'),
                    meta: {
                        title: 'nav.groups',
                        breadcrumbs: [{ title: 'nav.navGroups.organization', path: '/org/groups' }],
                    },
                },
                {
                    path: 'org/students',
                    name: 'Students',
                    component: () => import('@/modules/Students/pages/StudentsPage.vue'),
                    meta: {
                        title: 'nav.students',
                        breadcrumbs: [{ title: 'nav.navGroups.organization', path: '/org/groups' }],
                    },
                },
                {
                    path: 'org/settings',
                    name: 'OrganizationSettings',
                    component: () => import('@/modules/Settings/pages/OrganizationSettingsPage.vue'),
                    meta: {
                        title: 'settings.title',
                        breadcrumbs: [{ title: 'nav.navGroups.organization', path: '/org/groups' }],
                    },
                },
                {
                    path: 'control/marks',
                    name: 'Marks',
                    component: () => import('@/modules/Marks/pages/MarksPage.vue'),
                    meta: {
                        title: 'nav.marks',
                        breadcrumbs: [{ title: 'nav.navGroups.control', path: '/control/marks' }],
                    },
                },
                {
                    path: 'control/settings',
                    name: 'ControlSettings',
                    component: () => import('@/modules/Settings/pages/ControlSettingsPage.vue'),
                    meta: {
                        title: 'nav.settings',
                        breadcrumbs: [{ title: 'nav.navGroups.control', path: '/control/marks' }],
                    },
                },
                {
                    path: 'control/modules',
                    name: 'Modules',
                    component: () => import('@/modules/Units/pages/UnitsPage.vue'),
                    meta: {
                        title: 'nav.modules',
                        breadcrumbs: [{ title: 'nav.navGroups.control', path: '/control/modules' }],
                    },
                },
                {
                    path: 'control/summaries',
                    name: 'Summaries',
                    component: () => import('@/modules/Summary/pages/SummariesPage.vue'),
                    meta: {
                        title: 'nav.summaries', // This key will need to be added to i18n
                        breadcrumbs: [{ title: 'nav.navGroups.control', path: '/control/summaries' }],
                    },
                },
                {
                    path: 'control/tasks',
                    name: 'Tasks',
                    component: () => import('@/modules/Tasks/pages/TasksPage.vue'),
                    meta: {
                        title: 'tasks.title',
                        breadcrumbs: [{ title: 'nav.navGroups.control', path: '/control/tasks' }],
                    },
                },
                {
                    path: 'documents/session',
                    name: 'Sessions',
                    component: () => import('@/modules/Sessions/pages/SessionsPage.vue'),
                    meta: {
                        title: 'nav.session',
                        breadcrumbs: [{ title: 'nav.navGroups.documents', path: '/documents/session' }],
                    },
                },
                {
                    path: 'documents/individual',
                    name: 'Plans',
                    component: () => import('@/modules/Plans/pages/PlansPage.vue'),
                    meta: {
                        title: 'nav.individual',
                        breadcrumbs: [{ title: 'nav.navGroups.documents', path: '/documents/session' }],
                    },
                },
                {
                    path: 'documents/settings',
                    name: 'DocumentsSettings',
                    component: () => import('@/modules/Settings/pages/DocumentsSettingsPage.vue'),
                    meta: {
                        title: 'nav.settings',
                        breadcrumbs: [{ title: 'nav.navGroups.documents', path: '/documents/session' }],
                    },
                },
                {
                    path: 'org/members',
                    name: 'Members',
                    component: () => import('@/modules/Members/pages/MembersPage.vue'),
                    meta: {
                        title: 'members.title',
                        breadcrumbs: [{ title: 'nav.navGroups.organization', path: '/org/groups' }],
                    },
                },

                // Add other routes as we migrate views
            ],
        },
        {
            path: '/about',
            component: DefaultLayout,
            children: [
                {
                    path: '',
                    component: () => import('@/pages/AboutPage.vue'),
                    meta: { title: 'nav.about' },
                },
            ],
        },
        {
            path: '/guide',
            component: DefaultLayout,
            children: [
                {
                    path: '',
                    component: () => import('@/pages/GuidePage.vue'),
                    meta: { title: 'nav.guide' },
                },
            ],
        },
    ],
})

// Verify the IDB connection is ready before entering any module page.
// /about and /guide are static and do not need database access.
const DB_DEPENDENT_PREFIX = /^\/(?:attendance|org|control|documents)/

router.beforeEach(async (to) => {
    if (!DB_DEPENDENT_PREFIX.test(to.path))
        return true
    try {
        await databaseService.getDb()
        return true
    }
    catch (e) {
        logger.error('Database unavailable during navigation:', e)
        return false
    }
})

export default router
