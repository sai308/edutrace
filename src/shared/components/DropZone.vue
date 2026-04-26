<script setup lang="ts">
import { AlertCircle, Loader2, UploadCloud } from 'lucide-vue-next'
import { useFileDrop } from '@/shared/composables/useFileDrop'

defineProps({
    isProcessing: Boolean,
    prompt: {
        type: String,
        default: 'Drop CSV files here',
    },
})

const emit = defineEmits(['files-dropped'])

const { isOver, isInvalidDrag, onDragEnter, onDragLeave, onDragOver, onDrop } = useFileDrop(emit)

function onFileSelect(event: Event) {
    const files = (event.target as HTMLInputElement)?.files

    if (files && files.length > 0) {
        emit('files-dropped', Array.from(files))

        // FIX: Reset the input value so the change event fires
        // even if the user selects the same file again.
        ;(event.target as HTMLInputElement).value = ''
    }
}
</script>

<template>
    <div
        class="relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ease-in-out cursor-pointer group"
        :class="[
            isOver && !isInvalidDrag ? 'border-primary bg-primary/5 scale-[1.02]' : '',
            isOver && isInvalidDrag
                ? 'border-destructive bg-destructive/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25',
            isProcessing ? 'opacity-50 pointer-events-none' : '',
        ]"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @dragover="onDragOver"
        @drop="onDrop"
    >
        <input ref="fileInput" type="file" multiple accept=".csv" class="hidden" @change="onFileSelect" />

        <div
            class="flex flex-col items-center gap-4 transition-transform duration-200 pointer-events-none"
            :class="{ 'scale-110': isOver && !isInvalidDrag }"
        >
            <div
                class="p-4 rounded-full transition-colors duration-200"
                :class="[isOver && isInvalidDrag ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary']"
            >
                <Loader2 v-if="isProcessing" class="w-8 h-8 animate-spin" />
                <AlertCircle v-else-if="isOver && isInvalidDrag" class="w-8 h-8" />
                <UploadCloud v-else class="w-8 h-8" />
            </div>

            <div class="space-y-1">
                <h3 class="font-semibold text-lg" :class="{ 'text-destructive': isOver && isInvalidDrag }">
                    <span v-if="isProcessing">{{ $t('dropZone.processing') }}</span>
                    <span v-else-if="isOver && isInvalidDrag">{{ $t('dropZone.invalidType') }}</span>
                    <span v-else>{{ prompt === 'Drop CSV files here' ? $t('dropZone.prompt') : prompt }}</span>
                </h3>
                <p class="text-sm text-muted-foreground">
                    {{ $t('dropZone.hint') }}
                </p>
            </div>
        </div>
    </div>
</template>
