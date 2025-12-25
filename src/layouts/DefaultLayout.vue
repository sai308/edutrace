<script setup lang="ts">
import AppFooter from '@/components/layout/AppFooter.vue'

import { Settings, Logs } from 'lucide-vue-next'

</script>

<template>
    <header class="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-2 font-bold text-xl">
                <router-link to="/" class="flex items-center gap-2 hover:text-foreground transition-colors">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                        <Logs class="w-4 h-4 text-cyan-8" />
                    </div>
                    {{ $t('app.title') }}
                </router-link>
            </div>

            <div class="flex items-center gap-4">
                <button class="p-2 hover:bg-muted rounded-full transition-colors" :title="$t('app.settings')">
                    <Settings class="w-5 h-5" />
                </button>
            </div>
        </div>
    </header>
    <div class="min-h-screen flex flex-col bg-background">
        <main class="flex-1 w-full max-w-7xl mx-auto pt-12 md:pt-20">
            <RouterView />
        </main>

        <AppFooter />
    </div>
</template>