<script setup lang="ts">
import { Info, Book, Github } from 'lucide-vue-next'

</script>

<template>
    <footer class="border-t bg-card/50 backdrop-blur-sm mt-auto">
        <div
            class="container mx-auto px-4 pt-6 pb-24 md:pb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-sm text-muted-foreground">
                &copy; {{ new Date().getFullYear() }} {{ $t('app.title') }}. All rights reserved.
            </div>

            <div class="flex items-center gap-6">
                <router-link to="/about"
                    class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Info class="w-4 h-4" />
                    {{ $t('footer.about') }}
                </router-link>
                <router-link to="/guide"
                    class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Book class="w-4 h-4" />
                    {{ $t('footer.guide') }}
                </router-link>
                <a href="https://github.com/sai308/edutrace-local" target="_blank" rel="noopener noreferrer"
                    class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Github class="w-4 h-4" />
                    {{ $t('footer.repo') }}
                </a>
            </div>
        </div>
    </footer>
</template>