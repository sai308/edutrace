<script setup lang="ts">
import { ArrowUp, Languages } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppThemeSwitcher from '@/components/layout/AppThemeSwitcher.vue'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { localeService } from '@/services/locale'

const { locale } = useI18n()

const LOCALES = [
    { code: 'en-US', label: 'English' },
    { code: 'uk-UA', label: 'Українська' },
]

function setLocale(code: string) {
    locale.value = code
    localeService.setLocale(code)
}

const showScrollTop = ref(false)

function onScroll() {
    showScrollTop.value = window.scrollY > 300
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
    <header class="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 h-16 flex items-center justify-between">
            <router-link to="/" class="flex items-center gap-2 font-bold text-xl">
                <img src="/edutrace-logo.svg" class="h-8" alt="EduTrace" />
                EduTrace
            </router-link>

            <div class="flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon" class="w-9 h-9 rounded-full">
                            <Languages class="w-5 h-5" />
                            <span class="sr-only">Language</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup
                            :model-value="locale"
                            @update:model-value="setLocale"
                        >
                            <DropdownMenuRadioItem
                                v-for="l in LOCALES"
                                :key="l.code"
                                :value="l.code"
                            >
                                {{ l.label }}
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AppThemeSwitcher />
            </div>
        </div>
    </header>
    <div class="min-h-screen flex flex-col bg-background">
        <main class="flex-1 w-full max-w-7xl mx-auto pt-12 md:pt-20">
            <RouterView />
        </main>

        <AppFooter />
    </div>

    <Transition name="scroll-top">
        <button
            v-if="showScrollTop"
            class="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            @click="scrollToTop"
        >
            <ArrowUp class="size-4" />
        </button>
    </Transition>
</template>

<style scoped>
.scroll-top-enter-active,
.scroll-top-leave-active {
    transition:
        opacity 0.2s,
        transform 0.2s;
}
.scroll-top-enter-from,
.scroll-top-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
