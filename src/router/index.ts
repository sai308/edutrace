import { createRouter, createWebHistory } from 'vue-router'

import DashboardLayout from '@/layouts/DashboardLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: DashboardLayout,
            children: [
                {
                    path: '',
                    redirect: '/analytics'
                },
                {
                    path: 'analytics',
                    name: 'Analytics',
                    component: () => import('@/modules/Analytics/pages/AnalyticsPage.vue'),
                    meta: { title: 'nav.analytics' }
                },
                {
                    path: 'analytics/:id',
                    name: 'AnalyticsDetails',
                    component: () => import('@/modules/Analytics/pages/AnalyticsDetailsPage.vue'),
                    props: true,
                    meta: { title: 'nav.analytics' }
                },
                {
                    path: 'reports',
                    name: 'reports',
                    component: () => import('@/modules/Reports/pages/ReportsPage.vue'),
                    meta: { title: 'nav.reports' }
                },
                {
                    path: 'reports/:id',
                    name: 'ReportDetails',
                    component: () => import('@/modules/Reports/pages/ReportDetailsPage.vue'),
                    meta: { title: 'nav.reports' }
                },
                {
                    path: 'groups',
                    name: 'groups',
                    component: () => import('@/modules/Groups/pages/GroupsPage.vue'),
                    meta: { title: 'nav.groups' }
                },
                {
                    path: 'students',
                    name: 'Students',
                    component: () => import('@/modules/Students/pages/StudentsPage.vue'),
                    meta: { title: 'nav.students' }
                },

                {
                    path: 'marks',
                    name: 'Marks',
                    component: () => import('@/modules/Marks/pages/MarksPage.vue'),
                    meta: { title: 'nav.marks' }
                },

                // Add other routes as we migrate views
            ]
        },
        {
            path: '/about',
            component: DefaultLayout,
            children: [
                {
                    path: '',
                    component: () => import('@/pages/AboutPage.vue'),
                    meta: { title: 'nav.about' }
                }
            ]
        },
        {
            path: '/guide',
            component: DefaultLayout,
            children: [{
                path: '', component: () => import('@/pages/GuidePage.vue'),
                meta: { title: 'nav.guide' }
            }]
        }
    ]
})

export default router