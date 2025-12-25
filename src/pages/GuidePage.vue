<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    File, LayoutDashboard, Users, UserRoundSearch,
    Star, Settings, BookOpen, Database,
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const { t, tm } = useI18n();

// Helper function to get detail items from translations
const getDetailItems = (basePath: string) => {
    const details = tm(basePath);
    return Object.keys(details).map(key => details[key]);
};

// Sections structure matching translation keys
const sections = computed(() => [
    {
        id: 'intro',
        title: t('guide.intro.title'),
        icon: BookOpen,
        content: t('guide.intro.content'),
        details: [
            { title: t('guide.intro.whatMakesDifferent'), items: getDetailItems('guide.intro.details').slice(0, 5) },
            { title: t('guide.intro.importantToKnow'), items: getDetailItems('guide.intro.details').slice(5, 10) }
        ],
        hasImage: false
    },
    {
        id: 'reports',
        title: t('guide.reports.title'),
        icon: File,
        content: t('guide.reports.content'),
        details: [
            { title: t('guide.reports.howToUse'), items: getDetailItems('guide.reports.details').slice(0, 5) },
            { title: t('guide.reports.whatYouGet'), items: getDetailItems('guide.reports.details').slice(5, 8) }
        ],
        hasImage: true
    },
    {
        id: 'analytics',
        title: t('guide.analytics.title'),
        icon: LayoutDashboard,
        content: t('guide.analytics.content'),
        details: [
            { title: t('guide.analytics.howToUse'), items: getDetailItems('guide.analytics.details').slice(0, 6) },
            { title: t('guide.analytics.whatYouGet'), items: getDetailItems('guide.analytics.details').slice(6, 9) }
        ],
        hasImage: true
    },
    {
        id: 'groups',
        title: t('guide.groups.title'),
        icon: Users,
        content: t('guide.groups.content'),
        details: [
            { title: t('guide.groups.howToUse'), items: getDetailItems('guide.groups.details').slice(0, 6) },
            { title: t('guide.groups.whatYouGet'), items: getDetailItems('guide.groups.details').slice(6, 11) }
        ],
        hasImage: true
    },
    {
        id: 'students',
        title: t('guide.students.title'),
        icon: UserRoundSearch,
        content: t('guide.students.content'),
        details: [
            { title: t('guide.students.howToUse'), items: getDetailItems('guide.students.details').slice(0, 8) },
            { title: t('guide.students.whatYouGet'), items: getDetailItems('guide.students.details').slice(8, 15) }
        ],
        hasImage: true
    },
    {
        id: 'marks',
        title: t('guide.marks.title'),
        icon: Star,
        content: t('guide.marks.content'),
        details: [
            { title: t('guide.marks.howToUse'), items: getDetailItems('guide.marks.details').slice(0, 8) },
            { title: t('guide.marks.whatYouGet'), items: getDetailItems('guide.marks.details').slice(8, 16) }
        ],
        hasImage: true
    },
    {
        id: 'settings',
        title: t('guide.settings.title'),
        icon: Settings,
        content: t('guide.settings.content'),
        details: [
            { title: t('guide.settings.howToUse'), items: getDetailItems('guide.settings.details').slice(0, 8) },
            { title: t('guide.settings.whatYouGet'), items: getDetailItems('guide.settings.details').slice(8, 16) }
        ],
        hasImage: true
    },
    {
        id: 'workspaces',
        title: t('guide.workspaces.title'),
        icon: Database,
        content: t('guide.workspaces.content'),
        details: [
            { title: t('guide.workspaces.howToUse'), items: getDetailItems('guide.workspaces.details').slice(0, 5) },
            { title: t('guide.workspaces.whatYouGet'), items: getDetailItems('guide.workspaces.details').slice(5, 13) }
        ],
        hasImage: true
    }
]);

const activeSection = ref('intro');

let observer: IntersectionObserver | null = null;

function scrollToSection(id: string) {
    activeSection.value = id;
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function setupScrollObserver() {
    const options = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    observer = new IntersectionObserver((entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
            visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (visibleEntries[0]?.target.id) {
                activeSection.value = visibleEntries[0].target.id;
            }
        }
    }, options);

    sections.value.forEach(section => {
        const element = document.getElementById(section.id);
        if (element) observer?.observe(element);
    });
}

onMounted(() => {
    setTimeout(() => setupScrollObserver(), 100);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
});
</script>

<template>
    <div class="container max-w-6xl py-4">
        <div class="flex gap-12 relative">
            <aside class="w-64 shrink-0 hidden lg:block sticky top-24 h-fit">
                <div class="font-semibold mb-4 px-2 text-sm uppercase tracking-wider text-muted-foreground/70">Sections
                </div>
                <nav class="space-y-1">
                    <Button v-for="section in sections" :key="section.id" variant="ghost"
                        class="w-full justify-start gap-3 px-3 transition-all duration-200" :class="activeSection === section.id
                            ? 'bg-secondary text-primary font-bold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted'" @click="scrollToSection(section.id)">
                        <component :is="section.icon" class="size-4" />
                        {{ section.title }}
                    </Button>
                </nav>
            </aside>

            <div class="flex-1 space-y-24">
                <section v-for="section in sections" :key="section.id" :id="section.id" class="scroll-mt-24 space-y-6">
                    <div class="flex items-center gap-4 border-b pb-4">
                        <div class="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm">
                            <component :is="section.icon" class="size-6" />
                        </div>
                        <h2 class="text-3xl font-bold tracking-tight">{{ section.title }}</h2>
                    </div>

                    <div class="prose prose-slate max-w-none">
                        <div class="flex items-start gap-3 mb-6">
                            <Badge variant="outline"
                                class="mt-1 shrink-0 uppercase tracking-tighter text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                                TL;DR</Badge>
                            <p class="text-lg leading-relaxed text-muted-foreground">
                                {{ section.content }}
                            </p>
                        </div>

                        <div v-if="section.details" class="grid gap-6 md:grid-cols-2">
                            <Card v-for="(detail, idx) in section.details" :key="idx"
                                class="border shadow-sm overflow-hidden">
                                <div class="p-6 bg-muted/30 border-b">
                                    <h3 class="text-xl font-bold text-foreground leading-none">{{ detail.title }}</h3>
                                </div>
                                <CardContent class="p-6">
                                    <ul class="space-y-6">
                                        <li v-for="(item, i) in detail.items" :key="i"
                                            class="flex gap-4 items-start group">
                                            <div
                                                class="size-2 rounded-full bg-primary/40 mt-2 transition-colors group-hover:bg-primary shrink-0" />
                                            <div class="space-y-1">
                                                <h4
                                                    class="font-bold text-primary text-sm uppercase tracking-wide leading-tight">
                                                    {{ item.title }}</h4>
                                                <p class="text-sm text-muted-foreground leading-relaxed">{{
                                                    item.description }}</p>
                                            </div>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div v-if="section.hasImage"
                        class="group border-2 border-dashed border-muted rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 transition-colors hover:bg-muted/20 hover:border-primary/20">
                        <div
                            class="p-4 rounded-full bg-background shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <component :is="section.icon"
                                class="size-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span class="font-bold text-foreground">Screenshot: {{ section.title }}</span>
                        <span class="text-xs opacity-75 mt-2 uppercase tracking-widest">Image implementation
                            pending</span>
                    </div>

                </section>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Optional: Smooth transition for section highlighting in sidebar */
.bg-secondary {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>