<script setup lang="ts">
import { AlertTriangle, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
    open: boolean
    workspaceName: string
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm'): void
}>()

const confirmationInput = ref('')

// Reset input when modal opens
watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            confirmationInput.value = ''
        }
    },
)

const isConfirmed = computed(() => {
    return confirmationInput.value === props.workspaceName
})

function handleConfirm() {
    if (isConfirmed.value) {
        emit('confirm')
    }
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <div class="flex items-center gap-2 text-destructive mb-2">
                    <div class="p-2 rounded-full bg-destructive/10">
                        <AlertTriangle class="size-5" />
                    </div>
                    <DialogTitle>{{ $t('workspace.delete_modal_title') }}</DialogTitle>
                </div>
                <DialogDescription class="pt-2">
                    <i18n-t keypath="workspace.delete_warning" tag="span">
                        <template #name>
                            <strong>{{ workspaceName }}</strong>
                        </template>
                    </i18n-t>
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <Label>{{
                        $t('workspace.delete_confirm_label', { name: workspaceName })
                    }}</Label>
                    <Input
                        v-model="confirmationInput"
                        :placeholder="workspaceName"
                        class="border-destructive/50 focus-visible:ring-destructive"
                        @keydown.enter.prevent="handleConfirm"
                    />
                </div>
            </div>

            <DialogFooter class="sm:justify-between gap-2">
                <DialogClose as-child>
                    <Button variant="outline" type="button">
                        {{ $t('common.cancel') }}
                    </Button>
                </DialogClose>
                <Button
                    variant="destructive"
                    :disabled="!isConfirmed"
                    class="gap-2"
                    @click="handleConfirm"
                >
                    <Trash2 class="size-4" />
                    {{ $t('workspace.delete_button') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
