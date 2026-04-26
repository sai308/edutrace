import { useOnline } from '@vueuse/core'
import { computed } from 'vue'
import { activeWorkerTasks, hasRecentError } from '@/shared/lib/appStatus'

export type AppStatus = 'idle' | 'working' | 'error' | 'offline'

export function useAppStatus() {
    const isOnline = useOnline()

    const status = computed<AppStatus>(() => {
        if (!isOnline.value) return 'offline'
        if (activeWorkerTasks.value > 0) return 'working'
        if (hasRecentError.value) return 'error'
        return 'idle'
    })

    return { status }
}
