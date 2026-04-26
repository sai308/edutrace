import { ref } from 'vue'

export const activeWorkerTasks = ref(0)
export const hasRecentError = ref(false)

let errorClearTimer: ReturnType<typeof setTimeout> | null = null

export function reportWorkerError() {
    hasRecentError.value = true
    if (errorClearTimer)
        clearTimeout(errorClearTimer)
    errorClearTimer = setTimeout(() => {
        hasRecentError.value = false
        errorClearTimer = null
    }, 5000)
}
