<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
    class?: HTMLAttributes['class']
}>()
</script>

<template>
    <ScrollArea
        data-slot="sidebar-content"
        data-sidebar="content"
        :class="cn('min-h-0 flex-1 group-data-[collapsible=icon]:overflow-hidden', props.class)"
    >
        <div class="flex flex-col gap-2 w-full h-full">
            <slot />
        </div>
    </ScrollArea>
</template>
