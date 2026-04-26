<script setup lang="ts">
import type { RowActionItem } from '@/shared/types/table'
import { MoreVertical } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{
    items: RowActionItem[]
}>()
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                variant="ghost"
                class="h-8 w-8 p-0 data-[state=open]:bg-muted"
                aria-label="Open row actions"
                @click.stop
            >
                <MoreVertical class="h-4 w-4" aria-hidden="true" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <template v-for="(item, i) in items" :key="i">
                <DropdownMenuSeparator v-if="item.type === 'separator'" />
                <DropdownMenuItem
                    v-else
                    :disabled="item.disabled"
                    :variant="item.destructive ? 'destructive' : 'default'"
                    @select="item.onSelect()"
                >
                    <component :is="item.icon" v-if="item.icon" />
                    {{ item.label }}
                </DropdownMenuItem>
            </template>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
