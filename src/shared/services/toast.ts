import type { Ref } from 'vue'
import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'error' | 'warning'

export interface ToastAction {
    label: string
    fn: () => void
}

export interface Toast {
    id: number
    message: string
    type: ToastType
    action?: ToastAction
}

const toasts: Ref<Toast[]> = ref([])

let idCounter = 0

export const toast = {
    add(
        message: string,
        type: ToastType = 'info',
        duration: number = 3000,
        action?: ToastAction,
    ): number {
        const id = idCounter++
        toasts.value.push({ id, message, type, action })
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id)
            }, duration)
        }
        return id
    },
    remove(id: number): void {
        const index = toasts.value.findIndex((t) => t.id === id)
        if (index !== -1) {
            toasts.value.splice(index, 1)
        }
    },
    success(message: string, duration?: number, action?: ToastAction): number {
        return this.add(message, 'success', duration, action)
    },
    error(message: string, duration?: number, action?: ToastAction): number {
        return this.add(message, 'error', duration, action)
    },
    info(message: string, duration?: number, action?: ToastAction): number {
        return this.add(message, 'info', duration, action)
    },
    warning(message: string, duration?: number, action?: ToastAction): number {
        return this.add(message, 'warning', duration, action)
    },
}

export function useToast() {
    return { toasts, toast }
}
