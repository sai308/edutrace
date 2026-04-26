<script setup lang="ts">
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import DropZone from '@/shared/components/DropZone.vue'

defineProps<{
    open: boolean
    isProcessing: boolean
    title: string
    description: string
    prompt?: string
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'files-dropped', files: File[]): void
}>()

function handleFiles(files: File[]): void {
    emit('files-dropped', files)
    emit('update:open', false)
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription>{{ description }}</DialogDescription>
            </DialogHeader>
            <DropZone :is-processing="isProcessing" :prompt="prompt" @files-dropped="handleFiles" />
        </DialogContent>
    </Dialog>
</template>
