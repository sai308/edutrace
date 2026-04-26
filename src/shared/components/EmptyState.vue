<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { ArrowUpRight } from 'lucide-vue-next'
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/shared/lib/utils'

interface Props {
    title: string
    description?: string
    icon?: Component
    learnMoreUrl?: string
    class?: HTMLAttributes['class']
}

defineProps<Props>()
</script>

<template>
    <Empty :class="cn($props.class)">
        <EmptyHeader>
            <EmptyMedia v-if="icon" variant="icon">
                <component :is="icon" />
            </EmptyMedia>
            <EmptyTitle>{{ title }}</EmptyTitle>
            <EmptyDescription v-if="description">
                {{ description }}
            </EmptyDescription>
        </EmptyHeader>
        <EmptyContent v-if="$slots.default">
            <slot />
        </EmptyContent>
        <div v-if="learnMoreUrl" class="mt-4 flex items-center justify-center">
            <a
                :href="learnMoreUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-medium text-foreground/80 hover:text-foreground flex items-center gap-1 transition-colors"
            >
                {{ $t('common.learnMore') || 'Learn More' }}
                <ArrowUpRight class="w-4 h-4" />
            </a>
        </div>
        <slot name="footer" />
    </Empty>
</template>
