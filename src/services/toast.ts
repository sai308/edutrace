import { ref, type Ref } from 'vue';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const toasts: Ref<Toast[]> = ref([]);

let idCounter = 0;

export const toast = {
    add(message: string, type: ToastType = 'info', duration: number = 3000): void {
        const id = idCounter++;
        toasts.value.push({ id, message, type });
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
    },
    remove(id: number): void {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    },
    success(message: string, duration?: number): void {
        this.add(message, 'success', duration);
    },
    error(message: string, duration?: number): void {
        this.add(message, 'error', duration);
    },
    info(message: string, duration?: number): void {
        this.add(message, 'info', duration);
    },
    warning(message: string, duration?: number): void {
        this.add(message, 'warning', duration);
    }
};

export function useToast() {
    return { toasts, toast };
}