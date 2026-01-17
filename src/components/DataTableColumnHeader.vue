<script setup lang="ts" generic="TData, TValue">
import type { Column } from '@tanstack/vue-table'
import {
    ArrowDown,
    ArrowUp,
    ChevronsUpDown,
} from 'lucide-vue-next'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DataTableColumnHeaderProps {
    column: Column<any, any>
    title: string
}

defineProps<DataTableColumnHeaderProps>()
</script>

<template>
    <div v-if="column.getCanSort()" :class="cn('flex items-center space-x-2', $attrs.class ?? '')">
        <Button variant="ghost" size="sm" class="-ml-3 h-8 hover:bg-accent/50 group transition-all duration-200"
            @click="column.toggleSorting(column.getIsSorted() === 'asc')">
            <span class="font-bold tracking-tight">{{ title }}</span>
            <ArrowDown v-if="column.getIsSorted() === 'desc'"
                class="ml-2 h-4 w-4 text-primary animate-in zoom-in-50 duration-300" />
            <ArrowUp v-else-if="column.getIsSorted() === 'asc'"
                class="ml-2 h-4 w-4 text-primary animate-in zoom-in-50 duration-300" />
            <ChevronsUpDown v-else
                class="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
        </Button>
    </div>
    <div v-else :class="$attrs.class">
        <span class="font-bold tracking-tight">{{ title }}</span>
    </div>
</template>
