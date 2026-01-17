<script setup lang="ts">
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import DropZone from '@/components/DropZone.vue';

defineProps<{
    isOpen: boolean;
    isProcessing: boolean;
}>();

const emit = defineEmits(['update:isOpen', 'files-dropped']);

function handleOpenUpdate(val: boolean) {
    emit('update:isOpen', val);
}

function handleFilesDropped(files: any) {
    emit('files-dropped', files);
    handleOpenUpdate(false);
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="handleOpenUpdate">
        <DialogContent class="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{{ $t('marks.importModal.title') || 'Upload Marks' }}</DialogTitle>
                <DialogDescription>{{ $t('marks.importModal.description') || 'Drag and drop CSV files here.' }}
                </DialogDescription>
            </DialogHeader>
            <DropZone :is-processing="isProcessing" @files-dropped="handleFilesDropped"
                :prompt="$t('dropZone.marksPrompt')" />
        </DialogContent>
    </Dialog>
</template>
