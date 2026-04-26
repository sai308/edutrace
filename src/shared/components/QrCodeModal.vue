<script setup lang="ts">
import { Copy, Download } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'

const props = defineProps<{
    open: boolean
    meetId?: string | null
    title?: string
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
}>()

const { t } = useI18n()

const qrDataUrl = ref('')
const meetUrl = ref('')

watch(
    () => props.open,
    async (isOpen) => {
        if (isOpen && props.meetId) {
            meetUrl.value = `https://meet.google.com/${props.meetId}`
            try {
                qrDataUrl.value = await QRCode.toDataURL(meetUrl.value, {
                    width: 300,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                })
            } catch (err) {
                logger.error('Error generating QR code', err)
                toast.error('Failed to generate QR code')
            }
        }
    }
)

function copyLink() {
    navigator.clipboard.writeText(meetUrl.value)
    toast.success(t('qrCode.toast.success'))
}

function downloadQr() {
    const link = document.createElement('a')
    link.download = `meet-qr-${props.meetId}.png`
    link.href = qrDataUrl.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>{{ title || $t('qrCode.title') }}</DialogTitle>
                <DialogDescription class="sr-only">
                    {{ $t('qrCode.description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="flex flex-col items-center space-y-4 py-2">
                <div class="bg-white p-2 rounded-lg border shadow-sm">
                    <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="w-64 h-64" />
                    <div v-else class="w-64 h-64 flex items-center justify-center text-muted-foreground">
                        {{ $t('qrCode.generating') }}
                    </div>
                </div>
                <div class="text-center space-y-1">
                    <p class="text-sm font-medium">
                        {{ meetId }}
                    </p>
                    <p class="text-xs text-muted-foreground truncate max-w-[250px]">
                        {{ meetUrl }}
                    </p>
                </div>
            </div>

            <DialogFooter class="flex-row gap-2">
                <Button variant="outline" class="flex-1 gap-2" @click="copyLink">
                    <Copy class="w-4 h-4" aria-hidden="true" />
                    {{ $t('qrCode.copy') }}
                </Button>
                <Button class="flex-1 gap-2" @click="downloadQr">
                    <Download class="w-4 h-4" aria-hidden="true" />
                    {{ $t('qrCode.save') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
