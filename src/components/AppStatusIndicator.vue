<script setup lang="ts">
import { CircleAlert, Loader2, WifiOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStatus } from '@/shared/composables/useAppStatus'

const { t } = useI18n()
const { status } = useAppStatus()
</script>

<template>
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger as-child>
                <div
                    class="flex h-7 w-7 items-center justify-center rounded-md"
                    :aria-label="t(`status.${status}`)"
                >
                    <Loader2
                        v-if="status === 'working'"
                        class="h-3.5 w-3.5 animate-spin text-primary"
                    />
                    <CircleAlert
                        v-else-if="status === 'error'"
                        class="h-3.5 w-3.5 text-destructive"
                    />
                    <WifiOff v-else-if="status === 'offline'" class="h-3.5 w-3.5 text-yellow-500" />
                    <span v-else class="block h-2 w-2 rounded-full bg-green-500" />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p class="text-xs">
                    {{ t(`status.${status}`) }}
                </p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>
