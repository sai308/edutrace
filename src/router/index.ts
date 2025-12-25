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
                    children: [
                        {
                            path: '',
                            component: () => import('@/components/HelloWorld.vue')
                        }
                    ]
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
                }
            ]
        },
        {
            path: '/guide',
            component: DefaultLayout,
            children: [{ path: '', component: () => import('@/pages/GuidePage.vue') }]
        }
    ]
})

export default router