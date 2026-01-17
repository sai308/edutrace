<script setup>
import { X } from 'lucide-vue-next';
import { toRef } from 'vue';
import { useModalClose } from '../composables/useModalClose';
const props = defineProps({
    isOpen: Boolean,
    filesCount: {
        type: Number,
        default: 0
    }
});
const emit = defineEmits(['confirm', 'cancel']);
// Use the new API with isOpen ref
useModalClose(toRef(props, 'isOpen'), () => {
    emit('cancel');
});
function handleChoice(mode) {
    emit('confirm', mode);
}
</script>
<template>
    <div v-if="isOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm !-mt-6 p-4">
        <div
            class="bg-card w-full max-w-lg rounded-lg shadow-lg border p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold">{{ $t('csvFilter.title') }}</h3>
                <button @click="emit('cancel')" class="p-1 hover:bg-muted rounded-md transition-colors">
                    <X class="w-4 h-4" />
                </button>
            </div>
            <p class="text-muted-foreground">
                {{ $t('csvFilter.message', { count: filesCount }) }}
            </p>
            <div class="space-y-3 pt-2">
                <button @click="handleChoice('all')"
                    class="w-full p-4 text-left border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group">
                    <div class="font-semibold group-hover:text-primary transition-colors">
                        {{ $t('csvFilter.parseAll') }}
                    </div>
                    <div class="text-sm text-muted-foreground mt-1">
                        {{ $t('csvFilter.parseAllDesc') }}
                    </div>
                </button>
                <button @click="handleChoice('related')"
                    class="w-full p-4 text-left border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group">
                    <div class="font-semibold group-hover:text-primary transition-colors">
                        {{ $t('csvFilter.relatedOnly') }}
                    </div>
                    <div class="text-sm text-muted-foreground mt-1">
                        {{ $t('csvFilter.relatedOnlyDesc') }}
                    </div>
                </button>
            </div>
            <div class="flex justify-end pt-2">
                <button @click="emit('cancel')"
                    class="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
                    {{ $t('common.cancel') }}
                </button>
            </div>
        </div>
    </div>
</template>