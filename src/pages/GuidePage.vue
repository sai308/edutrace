<script setup lang="ts">
import type { GuideSection } from './guide/en-US'
import * as LucideIcons from 'lucide-vue-next'
import { onMounted, onUnmounted, ref, shallowRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const { locale } = useI18n()

const sections = shallowRef<GuideSection[]>([])

watchEffect(async () => {
    const mod = locale.value === 'uk-UA' ? await import('./guide/uk-UA') : await import('./guide/en-US')
    sections.value = mod.sections
})

const getIcon = (name: string) => (LucideIcons as Record<string, unknown>)[name]

const activeSection = ref('intro')
let observer: IntersectionObserver | null = null

function scrollToSection(id: string) {
    activeSection.value = id
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function setupScrollObserver() {
    observer = new IntersectionObserver(
        (entries) => {
            const visible = entries.filter(e => e.isIntersecting)
            if (visible.length > 0) {
                visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)
                const id = visible[0]?.target.id
                if (id)
                    activeSection.value = id
            }
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    sections.value.forEach((s) => {
        const el = document.getElementById(s.id)
        if (el)
            observer?.observe(el)
    })
}

onMounted(() => setTimeout(setupScrollObserver, 100))
onUnmounted(() => observer?.disconnect())
</script>

<template>
    <div class="container max-w-6xl py-4">
        <div class="flex gap-12 relative">
            <aside class="w-64 shrink-0 hidden lg:block sticky top-24 h-fit">
                <div class="font-semibold mb-4 px-2 text-sm uppercase tracking-wider text-muted-foreground/70">
                    Sections
                </div>
                <nav class="space-y-1">
                    <Button
                        v-for="s in sections"
                        :key="s.id"
                        variant="ghost"
                        class="w-full justify-start gap-3 px-3 transition-all duration-200"
                        :class="
                            activeSection === s.id
                                ? 'bg-secondary text-primary font-bold shadow-sm'
                                : 'text-muted-foreground hover:bg-muted'
                        "
                        @click="scrollToSection(s.id)"
                    >
                        <component :is="getIcon(s.icon)" class="size-4" />
                        {{ s.title }}
                    </Button>
                </nav>
            </aside>

            <div class="flex-1 space-y-24">
                <section v-for="s in sections" :id="s.id" :key="s.id" class="scroll-mt-24 space-y-6">
                    <div class="flex items-center gap-4 border-b pb-4">
                        <div class="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm">
                            <component :is="getIcon(s.icon)" class="size-6" />
                        </div>
                        <h2 class="text-3xl font-bold tracking-tight">
                            {{ s.title }}
                        </h2>
                    </div>

                    <div class="prose prose-slate max-w-none">
                        <div class="flex items-start gap-3 mb-6">
                            <Badge
                                variant="outline"
                                class="mt-1 shrink-0 uppercase tracking-tighter text-[10px] py-0 px-1.5 border-primary/30 text-primary"
                            >
                                TL;DR
                            </Badge>
                            <p class="text-lg leading-relaxed text-muted-foreground">
                                {{ s.content }}
                            </p>
                        </div>

                        <div class="grid gap-6 md:grid-cols-2">
                            <Card v-for="(group, idx) in s.details" :key="idx" class="border shadow-sm overflow-hidden">
                                <div class="p-6 bg-muted/30 border-b">
                                    <h3 class="text-xl font-bold text-foreground leading-none">
                                        {{ group.title }}
                                    </h3>
                                </div>
                                <CardContent class="p-6">
                                    <ul class="space-y-6">
                                        <li
                                            v-for="(item, i) in group.items"
                                            :key="i"
                                            class="flex gap-4 items-start group"
                                        >
                                            <div
                                                class="size-2 rounded-full bg-primary/40 mt-2 transition-colors group-hover:bg-primary shrink-0"
                                            />
                                            <div class="space-y-1">
                                                <h4
                                                    class="font-bold text-primary text-sm uppercase tracking-wide leading-tight"
                                                >
                                                    {{ item.title }}
                                                </h4>
                                                <p class="text-sm text-muted-foreground leading-relaxed">
                                                    {{ item.description }}
                                                </p>
                                            </div>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div
                        v-if="s.id !== 'intro'"
                        class="group border-2 border-dashed border-muted rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 transition-colors hover:bg-muted/20 hover:border-primary/20"
                    >
                        <div
                            class="p-4 rounded-full bg-background shadow-sm mb-4 group-hover:scale-110 transition-transform"
                        >
                            <component
                                :is="getIcon(s.icon)"
                                class="size-8 opacity-40 group-hover:opacity-100 transition-opacity"
                            />
                        </div>
                        <span class="font-bold text-foreground">Screenshot: {{ s.title }}</span>
                        <span class="text-xs opacity-75 mt-2 uppercase tracking-widest">Image implementation pending</span>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
