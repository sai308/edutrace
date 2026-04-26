<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { TableEmpty } from '@/components/ui/table'
import { cn } from '@/shared/lib/utils'
import EmptyState from './EmptyState.vue'

defineProps<{
    title: string
    description?: string
    icon?: Component
    colspan: number
    learnMoreUrl?: string
    class?: HTMLAttributes['class']
}>()
</script>

<template>
    <TableEmpty :colspan="colspan" class="p-0 border-none">
        <EmptyState
            :title="title"
            :description="description"
            :icon="icon"
            :learn-more-url="learnMoreUrl"
            :class="cn('border-none py-6', $props.class)"
        >
            <slot />
        </EmptyState>
    </TableEmpty>
</template>
