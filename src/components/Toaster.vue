<script setup lang="ts">
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/shared/services/toast'

const { toasts, toast } = useToast()

const icons = {
    info: Info,
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
}

const colors = {
    info: 'bg-blue-200 text-blue-800 border-blue-200',
    success: 'bg-green-200 text-green-800 border-green-200',
    error: 'bg-red-200 text-red-800 border-red-200',
    warning: 'bg-yellow-200 text-yellow-800 border-yellow-200',
}
</script>

<template>
    <div
        class="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
        <TransitionGroup
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-y-2 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform translate-y-2 opacity-0"
        >
            <div
                v-for="t in toasts"
                :key="t.id"
                class="pointer-events-auto flex items-center p-4 rounded-lg shadow-lg border"
                :class="colors[t.type]"
            >
                <component :is="icons[t.type]" class="w-5 h-5 mr-3 shrink-0" />
                <p class="text-sm font-medium flex-1">
                    {{ t.message }}
                </p>
                <button
                    v-if="t.action"
                    class="ml-3 px-2 py-0.5 text-xs font-semibold rounded bg-black/10 hover:bg-black/20 transition-colors shrink-0"
                    @click="
                        () => {
                            t.action!.fn()
                            toast.remove(t.id)
                        }
                    "
                >
                    {{ t.action.label }}
                </button>
                <button
                    class="ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
                    @click="toast.remove(t.id)"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>
