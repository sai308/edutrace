<script setup>
import { ref, watch, nextTick } from 'vue';
import { X, Download, Copy } from 'lucide-vue-next';
import QRCode from 'qrcode';

import { toast } from '../../services/toast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  isOpen: Boolean,
  meetId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

import { useModalClose } from '../../composables/useModalClose';

useModalClose(() => {
  if (props.isOpen) {
    emit('close');
  }
});


const qrDataUrl = ref('');
const meetUrl = ref('');

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.meetId) {
    meetUrl.value = `https://meet.google.com/${props.meetId}`;
    try {
      qrDataUrl.value = await QRCode.toDataURL(meetUrl.value, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR code', err);
      toast.error('Failed to generate QR code');
    }
  }
});

function copyLink() {
  navigator.clipboard.writeText(meetUrl.value);
  toast.success(t('qrCode.toast.success'));
}

function downloadQr() {
  const link = document.createElement('a');
  link.download = `meet-qr-${props.meetId}.png`;
  link.href = qrDataUrl.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm !-mt-6 p-4">
    <div
      class="bg-card w-full max-w-sm rounded-lg shadow-lg border p-6 space-y-4 animate-in zoom-in-95 duration-200 flex flex-col items-center">
      <div class="w-full flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ title || $t('qrCode.title') }}</h3>
        <button @click="emit('close')" class="p-1 hover:bg-muted rounded-md transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="bg-white p-2 rounded-lg border shadow-sm">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="w-64 h-64" />
        <div v-else class="w-64 h-64 flex items-center justify-center text-muted-foreground">
          {{ $t('qrCode.generating') }}
        </div>
      </div>

      <div class="text-center space-y-1">
        <p class="text-sm font-medium">{{ meetId }}</p>
        <p class="text-xs text-muted-foreground truncate max-w-[250px]">{{ meetUrl }}</p>
      </div>

      <div class="flex gap-2 w-full">
        <button @click="copyLink"
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
          <Copy class="w-4 h-4" />
          {{ $t('qrCode.copy') }}
        </button>
        <button @click="downloadQr"
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
          <Download class="w-4 h-4" />
          {{ $t('qrCode.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
