<script setup>
import { X } from 'lucide-vue-next';

defineProps({
  isOpen: Boolean,
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  },
  cancelText: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'danger' // 'danger' or 'primary'
  }
});

const emit = defineEmits(['confirm', 'cancel']);

import { useModalClose } from '../composables/useModalClose';

useModalClose(() => {
  if (props.isOpen) {
    emit('cancel');
  }
});

</script>

<template>
  <div v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm !-mt-6 p-4">
    <div class="bg-card w-full max-w-md rounded-lg shadow-lg border p-6 space-y-4 animate-in zoom-in-95 duration-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ title || $t('confirm.defaultTitle') }}</h3>
        <button @click="emit('cancel')" class="p-1 hover:bg-muted rounded-md transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <p class="text-muted-foreground">{{ message || $t('confirm.defaultMessage') }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <button @click="emit('cancel')"
          class="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
          {{ cancelText || $t('confirm.cancel') }}
        </button>
        <button @click="emit('confirm')" class="px-4 py-2 text-sm font-medium rounded-md transition-colors text-white"
          :class="variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'">
          {{ confirmText || $t('confirm.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
