<script setup lang="ts">
import {
    BarChart2,
    BookOpen,
    Code2,
    Cpu,
    Database,
    ExternalLink,
    FileText,
    Github,
    Globe,
    Heart,
    Shield,
    Table2,
    Wifi,
    Zap,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()

interface Technology {
    name: string
    description: string
    link: string
    iconColor: string
    iconType: 'vue' | 'vite' | 'tailwind' | 'reka' | 'svg' | 'component'
    icon?: any
    iconClassName?: string
    svgPath?: string
    svgCircle?: boolean
    svgRect?: boolean
}

const technologies: Technology[] = [
    {
        name: 'Vue 3',
        description: 'Progressive JavaScript framework — Composition API, reactivity, and SFC throughout',
        link: 'https://vuejs.org/',
        iconColor: 'bg-[#42b883]/10',
        iconType: 'vue',
    },
    {
        name: 'TypeScript',
        description: 'Strict mode with noUnusedLocals — every module, service, and component is fully typed',
        link: 'https://www.typescriptlang.org/',
        iconColor: 'bg-[#3178c6]/10',
        iconType: 'component',
        icon: Code2,
        iconClassName: 'text-[#3178c6]',
    },
    {
        name: 'Vite',
        description: 'Sub-second HMR during development; optimised production builds with code splitting',
        link: 'https://vitejs.dev/',
        iconColor: 'bg-[#646cff]/10',
        iconType: 'vite',
    },
    {
        name: 'Tailwind CSS v4',
        description: 'Utility-first styling with the Vite plugin — no PostCSS config, CSS-native variables',
        link: 'https://tailwindcss.com/',
        iconColor: 'bg-sky-400/10',
        iconType: 'tailwind',
    },
    {
        name: 'Reka UI',
        description: 'Unstyled, accessible headless component primitives — the foundation of every UI element',
        link: 'https://reka-ui.com/',
        iconColor: 'bg-primary/10',
        iconType: 'reka',
    },
    {
        name: 'TanStack Vue Table',
        description: 'Headless table engine powering all data grids — sorting, filtering, column visibility',
        link: 'https://tanstack.com/table',
        iconColor: 'bg-[#ef4444]/10',
        iconType: 'component',
        icon: Table2,
        iconClassName: 'text-[#ef4444]',
    },
    {
        name: 'Unovis',
        description: 'Composable data-visualisation library used for attendance and grade charts',
        link: 'https://unovis.dev/',
        iconColor: 'bg-[#8b5cf6]/10',
        iconType: 'component',
        icon: BarChart2,
        iconClassName: 'text-[#8b5cf6]',
    },
    {
        name: 'Vue Router',
        description: 'Official SPA router — lazy-loaded routes with breadcrumb metadata',
        link: 'https://router.vuejs.org/',
        iconColor: 'bg-[#42b883]/10',
        iconType: 'svg',
        svgPath: 'M3 12h18M3 6h18M3 18h18',
        svgCircle: true,
    },
    {
        name: 'Vue I18n',
        description: 'Full UI in English and Ukrainian — every label, error, and tooltip is translated',
        link: 'https://vue-i18n.intlify.dev/',
        iconColor: 'bg-[#42b883]/10',
        iconType: 'component',
        icon: Globe,
        iconClassName: 'text-[#42b883]',
    },
    {
        name: 'VueUse',
        description: 'Composition utility collection — virtual lists, storage, event hooks, and more',
        link: 'https://vueuse.org/',
        iconColor: 'bg-[#42b883]/10',
        iconType: 'component',
        icon: Zap,
        iconClassName: 'text-[#42b883]',
    },
    {
        name: 'IDB',
        description: 'Promise-based IndexedDB wrapper — all data stored locally, versioned schema migrations',
        link: 'https://github.com/jakearchibald/idb',
        iconColor: 'bg-[#f59e0b]/10',
        iconType: 'component',
        icon: Database,
        iconClassName: 'text-[#f59e0b]',
    },
    {
        name: 'PapaParse',
        description: 'CSV parser running in a Web Worker — processes Google Meet attendance reports',
        link: 'https://www.papaparse.com/',
        iconColor: 'bg-[#10b981]/10',
        iconType: 'svg',
        svgRect: true,
    },
    {
        name: 'Comlink',
        description: 'Transparent Web Worker RPC — offloads CSV parsing and grade aggregation off the main thread',
        link: 'https://github.com/GoogleChromeLabs/comlink',
        iconColor: 'bg-[#f59e0b]/10',
        iconType: 'component',
        icon: Cpu,
        iconClassName: 'text-[#f59e0b]',
    },
    {
        name: 'docxtemplater',
        description: 'Mustache-based .docx template engine — generates official grade record documents',
        link: 'https://docxtemplater.com/',
        iconColor: 'bg-[#2b5797]/10',
        iconType: 'component',
        icon: FileText,
        iconClassName: 'text-[#2b5797]',
    },
    {
        name: 'vite-plugin-pwa',
        description: 'Workbox-powered PWA — fully installable, precached assets, offline-ready out of the box',
        link: 'https://vite-pwa-org.netlify.app/',
        iconColor: 'bg-[#5bb974]/10',
        iconType: 'component',
        icon: Wifi,
        iconClassName: 'text-[#5bb974]',
    },
]
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-12 pb-12 px-4">
        <div class="text-center space-y-4">
            <div class="flex justify-center mb-2">
                <img src="/edutrace-logo.svg" class="h-16" alt="EduTrace" />
            </div>
            <h1 class="text-4xl font-bold tracking-tight">
                {{ t('about.hero.title') }}
            </h1>
            <p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {{ t('about.hero.subtitle') }}
            </p>
        </div>

        <div class="space-y-6">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary/10 text-primary">
                    <Heart class="size-6" />
                </div>
                <h2 class="text-2xl font-bold">
                    {{ t('about.goals.title') }}
                </h2>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
                <Card class="shadow-sm">
                    <CardHeader class="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <Shield class="size-5 text-primary" />
                        <CardTitle class="text-base font-semibold">
                            {{ t('about.goals.privacyFirst.title') }}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p class="text-sm text-muted-foreground">
                            {{ t('about.goals.privacyFirst.description') }}
                        </p>
                    </CardContent>
                </Card>

                <Card class="shadow-sm">
                    <CardHeader class="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <Zap class="size-5 text-primary" />
                        <CardTitle class="text-base font-semibold">
                            {{ t('about.goals.simplifyWorkflow.title') }}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p class="text-sm text-muted-foreground">
                            {{ t('about.goals.simplifyWorkflow.description') }}
                        </p>
                    </CardContent>
                </Card>

                <Card class="shadow-sm">
                    <CardHeader class="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <Globe class="size-5 text-primary" />
                        <CardTitle class="text-base font-semibold">
                            {{ t('about.goals.accessibleFree.title') }}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p class="text-sm text-muted-foreground">
                            {{ t('about.goals.accessibleFree.description') }}
                        </p>
                    </CardContent>
                </Card>

                <Card class="shadow-sm">
                    <CardHeader class="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <Database class="size-5 text-primary" />
                        <CardTitle class="text-base font-semibold">
                            {{ t('about.goals.offlineCapable.title') }}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p class="text-sm text-muted-foreground">
                            {{ t('about.goals.offlineCapable.description') }}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div class="space-y-6">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary/10 text-primary">
                    <Code2 class="size-6" />
                </div>
                <h2 class="text-2xl font-bold">
                    {{ t('about.technologies.title') }}
                </h2>
            </div>

            <Card class="overflow-hidden border shadow-sm">
                <div class="divide-y divide-border">
                    <div
                        v-for="tech in technologies"
                        :key="tech.name"
                        class="p-4 hover:bg-muted/50 transition-colors group"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div
                                    class="size-10 rounded-lg flex items-center justify-center shrink-0 p-1"
                                    :class="[tech.iconColor]"
                                >
                                    <template v-if="tech.iconType === 'tailwind'">
                                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#000000">
                                            <g id="SVGRepo_bgCarrier" stroke-width="0" />
                                            <g
                                                id="SVGRepo_tracerCarrier"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <g id="SVGRepo_iconCarrier">
                                                <path
                                                    d="M9,13.7q1.4-5.6,7-5.6c5.6,0,6.3,4.2,9.1,4.9q2.8.7,4.9-2.1-1.4,5.6-7,5.6c-5.6,0-6.3-4.2-9.1-4.9Q11.1,10.9,9,13.7ZM2,22.1q1.4-5.6,7-5.6c5.6,0,6.3,4.2,9.1,4.9q2.8.7,4.9-2.1-1.4,5.6-7,5.6c-5.6,0-6.3-4.2-9.1-4.9Q4.1,19.3,2,22.1Z"
                                                    style="fill: #44a8b3"
                                                />
                                            </g>
                                        </svg>
                                    </template>

                                    <template v-else-if="tech.iconType === 'vue'">
                                        <svg
                                            viewBox="0 -17.5 256 256"
                                            xmlns="http://www.w3.org/2000/svg"
                                            preserveAspectRatio="xMinYMin meet"
                                            fill="#000000"
                                        >
                                            <g id="SVGRepo_bgCarrier" stroke-width="0" />
                                            <g
                                                id="SVGRepo_tracerCarrier"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <g id="SVGRepo_iconCarrier">
                                                <path
                                                    d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36z"
                                                    fill="#41B883"
                                                />
                                                <path
                                                    d="M0 0l128 220.8L256 0h-51.2L128 132.48 50.56 0H0z"
                                                    fill="#41B883"
                                                />
                                                <path
                                                    d="M50.56 0L128 133.12 204.8 0h-47.36L128 51.2 97.92 0H50.56z"
                                                    fill="#35495E"
                                                />
                                            </g>
                                        </svg>
                                    </template>

                                    <template v-else-if="tech.iconType === 'vite'">
                                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
                                            <g id="SVGRepo_bgCarrier" stroke-width="0" />
                                            <g
                                                id="SVGRepo_tracerCarrier"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                            <g id="SVGRepo_iconCarrier">
                                                <path
                                                    d="M29.8836 6.146L16.7418 29.6457c-.2714.4851-.9684.488-1.2439.0052L2.0956 6.1482c-.3-.5262.1498-1.1635.746-1.057l13.156 2.3516a.7144.7144 0 00.2537-.0004l12.8808-2.3478c.5942-.1083 1.0463.5241.7515 1.0513z"
                                                    fill="url(#paint0_linear)"
                                                />
                                                <path
                                                    d="M22.2644 2.0069l-9.7253 1.9056a.3571.3571 0 00-.2879.3294l-.5982 10.1038c-.014.238.2045.4227.4367.3691l2.7077-.6248c.2534-.0585.4823.1647.4302.4194l-.8044 3.9393c-.0542.265.1947.4918.4536.4132l1.6724-.5082c.2593-.0787.5084.1487.4536.414l-1.2784 6.1877c-.08.387.4348.598.6495.2662L16.5173 25 24.442 9.1848c.1327-.2648-.096-.5667-.387-.5106l-2.787.5379c-.262.0505-.4848-.1934-.4109-.4497l1.8191-6.306c.074-.2568-.1496-.5009-.4118-.4495z"
                                                    fill="url(#paint1_linear)"
                                                />
                                                <defs>
                                                    <linearGradient
                                                        id="paint0_linear"
                                                        x1="6.0002"
                                                        y1="32.9999"
                                                        x2="235"
                                                        y2="344"
                                                        gradientUnits="userSpaceOnUse"
                                                        gradientTransform="matrix(.07142 0 0 .07142 1.3398 1.8944)"
                                                    >
                                                        <stop stop-color="#41D1FF" />
                                                        <stop offset="1" stop-color="#BD34FE" />
                                                    </linearGradient>
                                                    <linearGradient
                                                        id="paint1_linear"
                                                        x1="194.651"
                                                        y1="8.8182"
                                                        x2="236.076"
                                                        y2="292.989"
                                                        gradientUnits="userSpaceOnUse"
                                                        gradientTransform="matrix(.07142 0 0 .07142 1.3398 1.8944)"
                                                    >
                                                        <stop stop-color="#FFEA83" />
                                                        <stop offset=".0833" stop-color="#FFDD35" />
                                                        <stop offset="1" stop-color="#FFA800" />
                                                    </linearGradient>
                                                </defs>
                                            </g>
                                        </svg>
                                    </template>

                                    <template v-else-if="tech.iconType === 'reka'">
                                        <svg viewBox="0 0 256 256" class="size-5" style="color: var(--primary)">
                                            <rect width="256" height="256" fill="none" />
                                            <line
                                                x1="208"
                                                y1="128"
                                                x2="128"
                                                y2="208"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="32"
                                            />
                                            <line
                                                x1="192"
                                                y1="40"
                                                x2="40"
                                                y2="192"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="32"
                                            />
                                        </svg>
                                    </template>

                                    <template v-else-if="tech.iconType === 'svg'">
                                        <svg class="size-6" viewBox="0 0 24 24" fill="none">
                                            <template v-if="tech.svgPath">
                                                <path
                                                    :d="tech.svgPath"
                                                    stroke="#42b883"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                />
                                                <circle v-if="tech.svgCircle" cx="12" cy="12" r="2" fill="#42b883" />
                                            </template>
                                            <template v-if="tech.svgRect">
                                                <rect
                                                    x="3"
                                                    y="3"
                                                    width="18"
                                                    height="18"
                                                    rx="2"
                                                    stroke="#10b981"
                                                    stroke-width="2"
                                                />
                                                <path
                                                    d="M3 9h18M3 15h18M9 3v18M15 3v18"
                                                    stroke="#10b981"
                                                    stroke-width="2"
                                                />
                                            </template>
                                        </svg>
                                    </template>

                                    <component :is="tech.icon" v-else class="size-5" :class="[tech.iconClassName]" />
                                </div>
                                <div>
                                    <h3 class="font-semibold text-sm sm:text-base">
                                        {{ tech.name }}
                                    </h3>
                                    <p class="text-xs sm:text-sm text-muted-foreground">
                                        {{ tech.description }}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                as-child
                            >
                                <a :href="tech.link" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink class="size-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
            <Card class="bg-card/50 shadow-sm">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <BookOpen class="size-5 text-primary" />
                        {{ t('about.guide.title') }}
                    </CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <p class="text-sm text-muted-foreground leading-relaxed">
                        {{ t('about.guide.description') }}
                    </p>
                    <Button class="w-full font-semibold" as-child>
                        <router-link to="/guide">
                            <BookOpen class="mr-2 size-4" />
                            {{ t('about.guide.button') }}
                        </router-link>
                    </Button>
                </CardContent>
            </Card>

            <Card class="bg-card/50 shadow-sm">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Github class="size-5 text-primary" />
                        {{ t('about.openSource.title') }}
                    </CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <p class="text-sm text-muted-foreground leading-relaxed">
                        {{ t('about.openSource.description') }}
                    </p>
                    <Button variant="secondary" class="w-full font-semibold group" as-child>
                        <a href="https://github.com/sai308/edutrace-local" target="_blank" rel="noopener noreferrer">
                            <Github class="mr-2 size-4" />
                            {{ t('about.openSource.button') }}
                            <ExternalLink class="ml-1 size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>

        <div class="text-center pt-8 space-y-4">
            <p class="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1.5 pt-4">
                {{ t('about.footer') }}
            </p>
        </div>
    </div>
</template>
