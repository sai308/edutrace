<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { toast } from '@/shared/services/toast'

const { t } = useI18n()

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
        // Check for updates every hour when the app is open
        if (r) {
            setInterval(() => r.update(), 60 * 60 * 1000)
        }
    },
})

watch(offlineReady, (ready) => {
    if (ready) {
        toast.success(t('pwa.offlineReady'), 4000)
    }
})
</script>

<template>
    <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0"
    >
        <div
            v-if="needRefresh"
            class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-background text-sm max-w-sm w-[calc(100vw-2rem)]"
        >
            <RefreshCw class="w-4 h-4 shrink-0 text-muted-foreground" />
            <p class="flex-1 text-muted-foreground">
                {{ $t('pwa.updateAvailable') }}
            </p>
            <div class="flex items-center gap-2 shrink-0">
                <Button
                    size="sm"
                    variant="ghost"
                    class="h-7 px-2 text-xs"
                    @click="needRefresh = false"
                >
                    {{ $t('pwa.dismiss') }}
                </Button>
                <Button
                    size="sm"
                    class="h-7 px-3 text-xs gap-1.5"
                    @click="updateServiceWorker(true)"
                >
                    <RefreshCw class="w-3 h-3" />
                    {{ $t('pwa.reload') }}
                </Button>
            </div>
        </div>
    </Transition>
</template>
